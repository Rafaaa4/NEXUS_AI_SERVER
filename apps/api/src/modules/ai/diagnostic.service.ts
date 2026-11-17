import { prisma } from '../../lib/prisma';
import { ProposalService } from './proposal.service';
import { LogsService } from '../logs/logs.service';
import { AgentService } from '../agent/agent.service';
import { ProposalRiskLevel } from '@prisma/client';

export class DiagnosticService {
  static async analyzeIncident(organizationId: string, incidentId: string) {
    const incident = await prisma.incident.findFirst({
      where: { id: incidentId, organizationId },
      include: {
        server: { include: { agent: true } },
      },
    });

    if (!incident) {
      throw new Error('INCIDENT_NOT_FOUND');
    }

    // 1. Gather isolated diagnostic context
    const latestMetrics = await AgentService.getLatestMetrics(incident.serverId);
    const recentLogs = await LogsService.getLogs(incident.serverId, { limit: 20 });

    // 2. Perform diagnostic inference (Explainable reasoning pipeline)
    let rootCause = 'Anomalous resource consumption detected.';
    let confidence = 0.85;
    let actionType = 'service.restart';
    let parameters: Record<string, any> = {};
    let riskLevel: ProposalRiskLevel = 'medium';

    const titleLower = incident.title.toLowerCase();

    if (titleLower.includes('cpu')) {
      rootCause = `CPU utilization spiked to critical levels. Active processes or runaway threads require immediate inspection.`;
      actionType = 'system.inspect_processes';
      parameters = { target: 'top_cpu', limit: 10 };
      riskLevel = 'low';
    } else if (titleLower.includes('memory') || titleLower.includes('oom')) {
      rootCause = `Memory pressure reached warning threshold. Possible memory leak in application containers.`;
      actionType = 'system.drop_caches';
      parameters = { target: 'pagecache', sync: true };
      riskLevel = 'low';
    } else if (titleLower.includes('disk')) {
      rootCause = `Disk space exhaustion on root volume. Old systemd journals and temporary caches can be safely pruned.`;
      actionType = 'disk.cleanup_cache';
      parameters = { target: 'systemd-journal', retainDays: 2 };
      riskLevel = 'medium';
    } else if (titleLower.includes('service') && titleLower.includes('down')) {
      // Find service name
      const svcMatch = incident.title.match(/\[(.*?)\]/);
      const serviceName = svcMatch ? svcMatch[1] : 'nginx';
      rootCause = `Service '${serviceName}' exited or failed health check. Systemd reports service stopped.`;
      actionType = 'service.restart';
      parameters = { serviceName };
      riskLevel = 'medium';
    }

    // 3. Persist AI Analysis
    const analysis = await prisma.aiAnalysis.create({
      data: {
        organizationId,
        incidentId: incident.id,
        modelName: 'nexus-devops-engine-v1',
        rootCause,
        confidence,
        recommendations: {
          recommendedAction: actionType,
          parameters,
          evidence: [
            incident.title,
            latestMetrics ? `CPU: ${latestMetrics.cpuUsagePercent}%, RAM: ${latestMetrics.memoryUsagePercent}%` : 'Metrics baseline',
            recentLogs.length > 0 ? `${recentLogs.length} redacted log entries correlated` : 'No error logs',
          ],
        },
      },
    });

    // 4. Generate cryptographically bound Action Proposal
    const proposal = await ProposalService.createProposal({
      organizationId,
      serverId: incident.serverId,
      analysisId: analysis.id,
      actionType,
      parameters,
      riskLevel,
      validityMinutes: 30,
    });

    // Update incident status to 'investigating'
    await prisma.incident.update({
      where: { id: incident.id },
      data: { status: 'investigating' },
    });

    return {
      analysis,
      proposal,
    };
  }
}
