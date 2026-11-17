import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { AlertService } from '../monitoring/alert.service';
import { ProposalService } from '../ai/proposal.service';

export class AgentService {
  static async enroll(data: {
    serverId: string;
    token: string;
    version?: string;
    hostname?: string;
    osName?: string;
    osVersion?: string;
    architecture?: string;
  }) {
    const tokenHash = crypto.createHash('sha256').update(data.token).digest('hex');

    const enrollmentToken = await prisma.agentEnrollmentToken.findUnique({
      where: { tokenHash },
      include: { server: true },
    });

    if (!enrollmentToken || enrollmentToken.used || enrollmentToken.expiresAt < new Date()) {
      throw new Error('INVALID_OR_EXPIRED_ENROLLMENT_TOKEN');
    }

    if (enrollmentToken.serverId !== data.serverId) {
      throw new Error('TOKEN_SERVER_MISMATCH');
    }

    // Mark token as used
    await prisma.agentEnrollmentToken.update({
      where: { id: enrollmentToken.id },
      data: { used: true },
    });

    // Generate persistent agent secret
    const rawSecret = crypto.randomBytes(32).toString('hex');
    const secretHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

    // Create or update agent record
    const agent = await prisma.agent.upsert({
      where: { serverId: data.serverId },
      update: {
        version: data.version || '0.1.0',
        secretHash,
        status: 'online',
        lastSeenAt: new Date(),
      },
      create: {
        organizationId: enrollmentToken.organizationId,
        serverId: data.serverId,
        version: data.version || '0.1.0',
        secretHash,
        status: 'online',
        lastSeenAt: new Date(),
      },
    });

    // Update server system metadata
    await prisma.server.update({
      where: { id: data.serverId },
      data: {
        status: 'online',
        hostname: data.hostname || enrollmentToken.server.hostname,
        osName: data.osName || enrollmentToken.server.osName,
        osVersion: data.osVersion || enrollmentToken.server.osVersion,
        architecture: data.architecture || enrollmentToken.server.architecture,
      },
    });

    // Auto-generate onboarding baseline proposals for fresh server
    ProposalService.generateBaselineProposals(enrollmentToken.organizationId, data.serverId).catch((e) => {
      console.warn('Could not auto-generate baseline proposals:', e.message);
    });

    return {
      agentId: agent.id,
      serverId: data.serverId,
      secret: rawSecret,
    };
  }

  static async recordHeartbeat(agentId: string, remoteIp?: string) {
    const cleanIp = remoteIp?.replace(/^.*:/, ''); // strip IPv6 prefix ::ffff:
    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: 'online',
        lastSeenAt: new Date(),
      },
      include: {
        server: true,
      },
    });

    const updateData: any = {};
    if (updated.server.status !== 'online') {
      updateData.status = 'online';
    }
    if (cleanIp && cleanIp !== '127.0.0.1' && cleanIp !== 'localhost' && !updated.server.hostname?.includes('.')) {
      updateData.hostname = cleanIp;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.server.update({
        where: { id: updated.serverId },
        data: updateData,
      });
    }

    return { status: 'ok', serverId: updated.serverId };
  }

  static async recordMetrics(agentId: string, serverId: string, metrics: any) {
    // Cache latest snapshot in Redis for high-speed dashboard telemetry
    const cacheKey = `server:metrics:latest:${serverId}`;
    try {
      await redis.set(cacheKey, JSON.stringify(metrics), 'EX', 3600); // 1 hour TTL
    } catch {
      // If Redis is temporarily down, we continue
    }

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: 'online',
        lastSeenAt: new Date(),
      },
      include: { server: true },
    });

    // Evaluate metrics against alert rules
    try {
      await AlertService.evaluateMetrics({
        organizationId: agent.organizationId,
        serverId: agent.serverId,
        serverName: agent.server.name,
        cpuUsagePercent: metrics.cpuUsagePercent || 0,
        memoryUsagePercent: metrics.memoryUsagePercent || 0,
        diskUsagePercent: metrics.diskUsagePercent || 0,
        services: metrics.services || [],
      });
    } catch (err: any) {
      console.warn('[AlertService] Evaluation warning:', err.message);
    }

    return { success: true };
  }

  static async getLatestMetrics(serverId: string) {
    try {
      const cached = await redis.get(`server:metrics:latest:${serverId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}
    return null;
  }
}
