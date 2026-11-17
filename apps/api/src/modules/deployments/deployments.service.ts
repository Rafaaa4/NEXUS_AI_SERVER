import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { AuditService } from '../audit/audit.service';

export interface CreateDeploymentInput {
  serverId: string;
  appName: string;
  repositoryUrl?: string;
  branch?: string;
  environment?: string;
  deployConfig?: {
    framework?: 'node' | 'docker' | 'react' | 'python' | 'custom';
    port?: number;
    buildCommand?: string;
    startCommand?: string;
    envVars?: Record<string, string>;
  };
}

export class DeploymentsService {
  static async createDeployment(
    organizationId: string,
    data: CreateDeploymentInput,
    actorId?: string
  ) {
    const server = await prisma.server.findFirst({
      where: { id: data.serverId, organizationId },
    });

    if (!server) {
      throw new Error('SERVER_NOT_FOUND');
    }

    const commitSha = crypto.randomBytes(4).toString('hex');

    const deployment = await prisma.deployment.create({
      data: {
        organizationId,
        serverId: data.serverId,
        appName: data.appName,
        repositoryUrl: data.repositoryUrl,
        branch: data.branch || 'main',
        commitSha,
        environment: data.environment || 'production',
        status: 'deploying',
        deployConfig: data.deployConfig || {},
        logs: `[${new Date().toISOString()}] Initializing deployment pipeline for ${data.appName}...\n[${new Date().toISOString()}] Target server: ${server.name} (${server.hostname || 'vps'})\n`,
      },
    });

    // Create execution Job for the Agent
    const idempotencyKey = `deploy:${deployment.id}:${commitSha}`;
    const job = await prisma.job.create({
      data: {
        organizationId,
        serverId: data.serverId,
        jobType: 'deployment.run',
        status: 'queued',
        idempotencyKey,
        result: {
          deploymentId: deployment.id,
          appName: data.appName,
          repositoryUrl: data.repositoryUrl,
          branch: data.branch || 'main',
          deployConfig: data.deployConfig || {},
        },
      },
    });

    await AuditService.log({
      organizationId,
      actorId,
      action: 'deployment.trigger',
      resourceType: 'deployment',
      resourceId: deployment.id,
      metadata: { appName: data.appName, serverId: data.serverId, jobId: job.id },
    });

    return { deployment, job };
  }

  static async listDeployments(organizationId: string, serverId?: string) {
    const where: any = { organizationId };
    if (serverId) where.serverId = serverId;

    return prisma.deployment.findMany({
      where,
      include: {
        server: { select: { id: true, name: true, hostname: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  static async getDeployment(organizationId: string, deploymentId: string) {
    return prisma.deployment.findFirst({
      where: { id: deploymentId, organizationId },
      include: {
        server: true,
      },
    });
  }

  static async updateDeploymentStatus(
    deploymentId: string,
    status: 'running' | 'failed' | 'rolled_back',
    additionalLogs?: string
  ) {
    const current = await prisma.deployment.findUnique({
      where: { id: deploymentId },
    });

    const updatedLogs = (current?.logs || '') + (additionalLogs ? `\n${additionalLogs}` : '');

    return prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status,
        logs: updatedLogs,
      },
    });
  }

  static async handleGitHubWebhook(payload: any, signature?: string) {
    const ref = payload.ref || '';
    const branch = ref.replace('refs/heads/', '') || 'main';
    const repoUrl = payload.repository?.clone_url || payload.repository?.html_url || '';
    const commitSha = payload.after || payload.head_commit?.id || 'HEAD';
    const commitMsg = payload.head_commit?.message || 'Push event via GitHub Webhook';

    if (!repoUrl) {
      throw new Error('MISSING_REPO_URL');
    }

    const cleanRepo = repoUrl.replace(/\.git$/, '');

    const matchingDeployments = await prisma.deployment.findMany({
      where: {
        branch,
        OR: [
          { repositoryUrl: { contains: cleanRepo } },
          { repositoryUrl: { contains: repoUrl } },
        ],
      },
      include: { server: true },
    });

    const triggered = [];
    for (const dep of matchingDeployments) {
      const idempotencyKey = `deploy:${dep.id}:${commitSha.slice(0, 8)}:${Date.now()}`;
      const job = await prisma.job.create({
        data: {
          organizationId: dep.organizationId,
          serverId: dep.serverId,
          jobType: 'deployment.run',
          status: 'queued',
          idempotencyKey,
          result: {
            deploymentId: dep.id,
            appName: dep.appName,
            repositoryUrl: dep.repositoryUrl,
            branch: dep.branch,
            commitSha: commitSha.slice(0, 8),
            deployConfig: dep.deployConfig || {},
          },
        },
      });

      await prisma.deployment.update({
        where: { id: dep.id },
        data: {
          status: 'deploying',
          commitSha: commitSha.slice(0, 8),
          logs: `[${new Date().toISOString()}] Automated CI/CD Webhook Triggered from GitHub\n[${new Date().toISOString()}] Commit: ${commitSha.slice(0, 8)} - ${commitMsg}\n[${new Date().toISOString()}] Dispatched deployment.run to agent on ${dep.server.name}\n`,
        },
      });

      await AuditService.log({
        organizationId: dep.organizationId,
        action: 'deployment.webhook_triggered',
        resourceType: 'deployment',
        resourceId: dep.id,
        metadata: { appName: dep.appName, repoUrl, branch, commitSha },
      });

      triggered.push({ deploymentId: dep.id, serverId: dep.serverId, jobId: job.id });
    }

    return { triggered, count: triggered.length };
  }

  static async updateDeployment(
    organizationId: string,
    deploymentId: string,
    data: {
      appName?: string;
      repositoryUrl?: string;
      branch?: string;
      environment?: string;
      deployConfig?: any;
    },
    actorId?: string
  ) {
    const deployment = await prisma.deployment.findFirst({
      where: { id: deploymentId, organizationId },
    });

    if (!deployment) {
      throw new Error('DEPLOYMENT_NOT_FOUND');
    }

    const updated = await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        appName: data.appName ?? deployment.appName,
        repositoryUrl: data.repositoryUrl ?? deployment.repositoryUrl,
        branch: data.branch ?? deployment.branch,
        environment: data.environment ?? deployment.environment,
        deployConfig: data.deployConfig ?? (deployment.deployConfig as any),
      },
      include: {
        server: true,
      },
    });

    await AuditService.log({
      organizationId,
      actorId,
      action: 'deployment.update',
      resourceType: 'deployment',
      resourceId: deployment.id,
      metadata: { previous: deployment, updated: data },
    });

    return updated;
  }

  static async deleteDeployment(
    organizationId: string,
    deploymentId: string,
    actorId?: string
  ) {
    const deployment = await prisma.deployment.findFirst({
      where: { id: deploymentId, organizationId },
    });

    if (!deployment) {
      throw new Error('DEPLOYMENT_NOT_FOUND');
    }

    // Queue clean-up job on host server so the agent removes the app files
    const idempotencyKey = `delete:${deployment.id}:${Date.now()}`;
    await prisma.job.create({
      data: {
        organizationId,
        serverId: deployment.serverId,
        jobType: 'deployment.delete',
        status: 'queued',
        idempotencyKey,
        result: {
          deploymentId: deployment.id,
          appName: deployment.appName,
        },
      },
    });

    await prisma.deployment.delete({
      where: { id: deploymentId },
    });

    await AuditService.log({
      organizationId,
      actorId,
      action: 'deployment.delete',
      resourceType: 'deployment',
      resourceId: deployment.id,
      metadata: { appName: deployment.appName, serverId: deployment.serverId },
    });

    return { success: true, deletedId: deploymentId };
  }

  static async redeployDeployment(
    organizationId: string,
    deploymentId: string,
    actorId?: string
  ) {
    const deployment = await prisma.deployment.findFirst({
      where: { id: deploymentId, organizationId },
      include: { server: true },
    });

    if (!deployment) {
      throw new Error('DEPLOYMENT_NOT_FOUND');
    }

    const commitSha = crypto.randomBytes(4).toString('hex');
    const idempotencyKey = `redeploy:${deployment.id}:${commitSha}:${Date.now()}`;

    const job = await prisma.job.create({
      data: {
        organizationId,
        serverId: deployment.serverId,
        jobType: 'deployment.run',
        status: 'queued',
        idempotencyKey,
        result: {
          deploymentId: deployment.id,
          appName: deployment.appName,
          repositoryUrl: deployment.repositoryUrl,
          branch: deployment.branch || 'main',
          deployConfig: (deployment.deployConfig as any) || {},
        },
      },
    });

    const updated = await prisma.deployment.update({
      where: { id: deployment.id },
      data: {
        status: 'deploying',
        commitSha,
        logs: `[${new Date().toISOString()}] Manual redeploy requested by operator\n[${new Date().toISOString()}] Target server: ${deployment.server.name}\n[${new Date().toISOString()}] Pulling repository: ${deployment.repositoryUrl || 'local'} (${deployment.branch || 'main'})\n`,
      },
      include: { server: true },
    });

    await AuditService.log({
      organizationId,
      actorId,
      action: 'deployment.redeploy',
      resourceType: 'deployment',
      resourceId: deployment.id,
      metadata: { appName: deployment.appName, jobId: job.id },
    });

    return { deployment: updated, job };
  }
}
