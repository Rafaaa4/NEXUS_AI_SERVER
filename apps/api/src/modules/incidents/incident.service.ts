import { prisma } from '../../lib/prisma';
import { IncidentStatus } from '@prisma/client';

export class IncidentService {
  static async listIncidents(
    organizationId: string,
    filters?: { status?: IncidentStatus; serverId?: string }
  ) {
    const where: any = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.serverId) where.serverId = filters.serverId;

    return prisma.incident.findMany({
      where,
      include: {
        server: {
          select: { id: true, name: true, hostname: true, provider: true },
        },
        aiAnalyses: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { detectedAt: 'desc' },
    });
  }

  static async getIncident(organizationId: string, incidentId: string) {
    return prisma.incident.findFirst({
      where: { id: incidentId, organizationId },
      include: {
        server: {
          include: { agent: true },
        },
        aiAnalyses: {
          include: {
            actionProposals: {
              include: { approvals: true, jobs: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  static async resolveIncident(organizationId: string, incidentId: string) {
    return prisma.incident.updateMany({
      where: { id: incidentId, organizationId },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
      },
    });
  }
}
