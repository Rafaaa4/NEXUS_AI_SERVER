import { prisma } from '../../lib/prisma';
import { IncidentSeverity } from '@prisma/client';

export interface MetricEvaluationInput {
  organizationId: string;
  serverId: string;
  serverName: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  diskUsagePercent: number;
  services: { name: string; status: string; enabled: boolean }[];
}

export class AlertService {
  static async evaluateMetrics(data: MetricEvaluationInput) {
    const alertsToTrigger: {
      title: string;
      description: string;
      severity: IncidentSeverity;
    }[] = [];

    // Rule 1: High CPU
    if (data.cpuUsagePercent >= 85) {
      alertsToTrigger.push({
        title: `High CPU utilization detected on ${data.serverName}`,
        description: `CPU usage has reached ${data.cpuUsagePercent.toFixed(1)}% (Threshold: 85%). System may become unresponsive.`,
        severity: 'high',
      });
    }

    // Rule 2: High Memory
    if (data.memoryUsagePercent >= 90) {
      alertsToTrigger.push({
        title: `Critical memory pressure on ${data.serverName}`,
        description: `RAM usage is at ${data.memoryUsagePercent.toFixed(1)}% (Threshold: 90%). Out-Of-Memory (OOM) killer risk detected.`,
        severity: 'high',
      });
    }

    // Rule 3: High Disk Usage
    if (data.diskUsagePercent >= 90) {
      alertsToTrigger.push({
        title: `Critical disk space exhaustion on ${data.serverName}`,
        description: `Root disk utilization is at ${data.diskUsagePercent.toFixed(1)}% (Threshold: 90%). Immediate log or cache cleanup required.`,
        severity: 'critical',
      });
    }

    // Rule 4: Critical Service Down
    for (const svc of data.services) {
      if (svc.enabled && (svc.status === 'failed' || svc.status === 'stopped')) {
        alertsToTrigger.push({
          title: `Essential service [${svc.name}] is down on ${data.serverName}`,
          description: `Service '${svc.name}' is in state '${svc.status}'. Workloads relying on this service may be offline.`,
          severity: 'high',
        });
      }
    }

    const createdIncidents = [];

    // Process alerts: deduplicate against open incidents
    for (const alert of alertsToTrigger) {
      const existing = await prisma.incident.findFirst({
        where: {
          serverId: data.serverId,
          title: alert.title,
          status: { in: ['open', 'investigating'] },
        },
      });

      if (!existing) {
        const incident = await prisma.incident.create({
          data: {
            organizationId: data.organizationId,
            serverId: data.serverId,
            title: alert.title,
            description: alert.description,
            severity: alert.severity,
            status: 'open',
          },
        });
        createdIncidents.push(incident);
      }
    }

    return createdIncidents;
  }
}
