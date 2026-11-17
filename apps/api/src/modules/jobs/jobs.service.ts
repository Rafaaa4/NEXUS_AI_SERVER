import { prisma } from '../../lib/prisma';

export class JobsService {
  static async getPendingJobs(organizationId: string, serverId: string) {
    const jobs = await prisma.job.findMany({
      where: {
        organizationId,
        serverId,
        status: 'queued',
      },
      include: {
        proposal: {
          select: {
            id: true,
            actionType: true,
            parameters: true,
            proposalHash: true,
            expiresAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Filter valid jobs: approved proposals or operator-triggered deployments
    const validJobs = [];
    for (const job of jobs) {
      if (job.jobType === 'deployment.run') {
        validJobs.push({
          jobId: job.id,
          serverId: job.serverId,
          actionType: job.jobType,
          parameters: (job.result as any) || {},
          proposalHash: 'deployment-operator-authorized',
          idempotencyKey: job.idempotencyKey,
        });
      } else if (job.proposal && job.proposal.status === 'approved') {
        if (!job.proposal.expiresAt || job.proposal.expiresAt > new Date()) {
          validJobs.push({
            jobId: job.id,
            serverId: job.serverId,
            actionType: job.jobType,
            parameters: job.proposal.parameters,
            proposalHash: job.proposal.proposalHash,
            idempotencyKey: job.idempotencyKey,
            expiresAt: job.proposal.expiresAt?.toISOString(),
          });
        }
      }
    }

    return validJobs;
  }

  static async reportJobResult(
    organizationId: string,
    serverId: string,
    jobId: string,
    data: {
      status: 'completed' | 'failed';
      output: string;
      error?: string;
      executedAt: string;
    }
  ) {
    const job = await prisma.job.findFirst({
      where: { id: jobId, serverId, organizationId },
      include: {
        proposal: {
          include: {
            analysis: {
              include: { incident: true },
            },
          },
        },
      },
    });

    if (!job) {
      throw new Error('JOB_NOT_FOUND');
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: data.status,
        result: {
          output: data.output,
          error: data.error,
          executedAt: data.executedAt,
        },
        finishedAt: new Date(),
      },
    });

    // If job was deployment.run, update deployment entity
    const deploymentId = (job.result as any)?.deploymentId;
    if (deploymentId) {
      const finalLogs = `[${new Date().toISOString()}] Deployment completed with status: ${data.status}\n\n=== Build & Container Logs ===\n${data.output || ''}` + (data.error ? `\nError details: ${data.error}` : '');
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: data.status === 'completed' ? 'running' : 'failed',
          logs: finalLogs,
        },
      });
    }

    // If job was successful, update proposal status to 'executed'
    if (job.proposalId) {
      await prisma.actionProposal.update({
        where: { id: job.proposalId },
        data: { status: data.status === 'completed' ? 'executed' : 'failed' },
      });

      // Auto-resolve incident on verified remediation success
      if (data.status === 'completed' && job.proposal?.analysis?.incident) {
        await prisma.incident.update({
          where: { id: job.proposal.analysis.incident.id },
          data: {
            status: 'resolved',
            resolvedAt: new Date(),
          },
        });
      }
    }

    return updatedJob;
  }
}
