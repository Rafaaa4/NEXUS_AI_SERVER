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
}
