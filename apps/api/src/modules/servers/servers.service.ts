import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { BillingService } from '../billing/billing.service';
import { AuditService } from '../audit/audit.service';

export class ServersService {
  static async listServers(organizationId: string) {
    return prisma.server.findMany({
      where: { organizationId },
      include: {
        agent: {
          select: {
            id: true,
            version: true,
            status: true,
            lastSeenAt: true,
            enrolledAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getServer(organizationId: string, serverId: string) {
    return prisma.server.findFirst({
      where: {
        id: serverId,
        organizationId,
      },
      include: {
        agent: true,
        incidents: {
          where: { status: 'open' },
          orderBy: { detectedAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  static async createServer(
    organizationId: string,
    data: {
      name: string;
      hostname?: string;
      provider?: string;
      osName?: string;
      osVersion?: string;
      architecture?: string;
    },
    actorId?: string
  ) {
    // 1. Enforce Server Quota based on Subscription Plan
    await BillingService.enforceServerQuota(organizationId);

    const server = await prisma.server.create({
      data: {
        organizationId,
        name: data.name,
        hostname: data.hostname,
        provider: data.provider || 'generic-linux',
        osName: data.osName || 'Linux',
        osVersion: data.osVersion,
        architecture: data.architecture || 'amd64',
        status: 'pending',
      },
    });

    // 2. Audit Trail
    await AuditService.log({
      organizationId,
      actorId,
      action: 'server.create',
      resourceType: 'server',
      resourceId: server.id,
      metadata: { serverName: server.name, provider: server.provider },
    });

    return server;
  }

  static async deleteServer(organizationId: string, serverId: string, actorId?: string) {
    const result = await prisma.server.deleteMany({
      where: {
        id: serverId,
        organizationId,
      },
    });

    if (result.count > 0) {
      await AuditService.log({
        organizationId,
        actorId,
        action: 'server.delete',
        resourceType: 'server',
        resourceId: serverId,
      });
    }

    return result;
  }

  static async generateEnrollmentToken(organizationId: string, serverId: string, baseUrl: string) {
    // Verify server belongs to org
    const server = await prisma.server.findFirst({
      where: { id: serverId, organizationId },
    });

    if (!server) {
      throw new Error('SERVER_NOT_FOUND');
    }

    // Invalidate old unused tokens for this server
    await prisma.agentEnrollmentToken.updateMany({
      where: { serverId, used: false },
      data: { used: true },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    await prisma.agentEnrollmentToken.create({
      data: {
        organizationId,
        serverId,
        tokenHash,
        expiresAt,
      },
    });

    const installCommand = `curl -sSL ${baseUrl}/install.sh | sudo NEXUS_TOKEN="${rawToken}" NEXUS_SERVER_ID="${serverId}" NEXUS_API="${baseUrl}" bash`;

    return {
      token: rawToken,
      serverId,
      expiresAt: expiresAt.toISOString(),
      installCommand,
    };
  }

  static async freeServerRam(organizationId: string, serverId: string, actorId?: string) {
    const server = await prisma.server.findFirst({
      where: { id: serverId, organizationId },
    });
    if (!server) throw new Error('SERVER_NOT_FOUND');

    const job = await prisma.job.create({
      data: {
        organizationId,
        serverId,
        jobType: 'system.drop_caches',
        status: 'queued',
        idempotencyKey: `drop_caches:${serverId}:${Date.now()}`,
        result: {},
      },
    });

    await AuditService.log({
      organizationId,
      actorId,
      action: 'server.free_ram',
      resourceType: 'server',
      resourceId: serverId,
      metadata: { jobId: job.id },
    });

    return { success: true, jobId: job.id, message: 'RAM purge dispatched to server agent.' };
  }

  static async installAgentService(organizationId: string, serverId: string, actorId?: string) {
    const server = await prisma.server.findFirst({
      where: { id: serverId, organizationId },
    });
    if (!server) throw new Error('SERVER_NOT_FOUND');

    const job = await prisma.job.create({
      data: {
        organizationId,
        serverId,
        jobType: 'agent.install_service',
        status: 'queued',
        idempotencyKey: `install_service:${serverId}:${Date.now()}`,
        result: {},
      },
    });

    await AuditService.log({
      organizationId,
      actorId,
      action: 'agent.install_service',
      resourceType: 'server',
      resourceId: serverId,
      metadata: { jobId: job.id },
    });

    return { success: true, jobId: job.id, message: '24/7 background systemd service registration dispatched.' };
  }

  static async updateAgent(organizationId: string, serverId: string, apiUrl: string, actorId?: string) {
    const server = await prisma.server.findFirst({
      where: { id: serverId, organizationId },
    });
    if (!server) throw new Error('SERVER_NOT_FOUND');

    const job = await prisma.job.create({
      data: {
        organizationId,
        serverId,
        jobType: 'agent.self_update',
        status: 'queued',
        idempotencyKey: `update:${serverId}:${Date.now()}`,
        result: { apiUrl },
      },
    });

    await AuditService.log({
      organizationId,
      actorId,
      action: 'agent.update',
      resourceType: 'server',
      resourceId: serverId,
      metadata: { apiUrl, jobId: job.id },
    });

    return { success: true, jobId: job.id, message: 'Agent update dispatched to server.' };
  }

  static async runServerCommand(organizationId: string, serverId: string, command: string, actorId?: string) {
    const server = await prisma.server.findFirst({
      where: { id: serverId, organizationId },
    });
    if (!server) throw new Error('SERVER_NOT_FOUND');

    const job = await prisma.job.create({
      data: {
        organizationId,
        serverId,
        jobType: 'system.run_command',
        status: 'queued',
        idempotencyKey: `exec:${serverId}:${Date.now()}`,
        result: { command },
      },
    });

    await AuditService.log({
      organizationId,
      actorId,
      action: 'server.run_command',
      resourceType: 'server',
      resourceId: serverId,
      metadata: { command, jobId: job.id },
    });

    return { success: true, jobId: job.id, message: 'Command queued for execution.' };
  }

  static async restartServerService(organizationId: string, serverId: string, serviceName: string, actorId?: string) {
    const server = await prisma.server.findFirst({
      where: { id: serverId, organizationId },
    });
    if (!server) throw new Error('SERVER_NOT_FOUND');

    const job = await prisma.job.create({
      data: {
        organizationId,
        serverId,
        jobType: 'service.restart',
        status: 'queued',
        idempotencyKey: `restart:${serviceName}:${serverId}:${Date.now()}`,
        result: { service: serviceName, action: 'restart' },
      },
    });

    return { success: true, jobId: job.id, message: `Restarting ${serviceName}...` };
  }

  static async getJobStatus(organizationId: string, jobId: string) {
    const job = await prisma.job.findFirst({
      where: { id: jobId, organizationId },
    });
    if (!job) throw new Error('JOB_NOT_FOUND');
    return job;
  }
}
