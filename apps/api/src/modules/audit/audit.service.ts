import { prisma } from '../../lib/prisma';

export interface AuditEvent {
  organizationId?: string;
  actorId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export class AuditService {
  static async log(event: AuditEvent) {
    try {
      return await prisma.auditLog.create({
        data: {
          organizationId: event.organizationId,
          actorId: event.actorId,
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          metadata: event.metadata,
        },
      });
    } catch (err: any) {
      console.warn('[AuditService] Failed to record audit log:', err.message);
      return null;
    }
  }

  static async listLogs(organizationId: string, limit: number = 50) {
    return prisma.auditLog.findMany({
      where: { organizationId },
      include: {
        actor: {
          select: { id: true, email: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
