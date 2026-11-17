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
}
