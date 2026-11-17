import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { AuditService } from '../audit/audit.service';
import { ProposalRiskLevel, ProposalStatus } from '@prisma/client';

export class ProposalService {
  /**
   * Generates a deterministic cryptographic hash binding:
   * serverId + actionType + canonical JSON(parameters) + expiresAt
   */
  static generateProposalHash(
    serverId: string,
    actionType: string,
    parameters: Record<string, any>,
    expiresAt: string
  ): string {
    const canonicalParams = JSON.stringify(parameters, Object.keys(parameters).sort());
    const payload = `${serverId}:${actionType}:${canonicalParams}:${expiresAt}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  static async createProposal(data: {
    organizationId: string;
    serverId: string;
    analysisId?: string;
    actionType: string;
    parameters: Record<string, any>;
    riskLevel: ProposalRiskLevel;
    validityMinutes?: number;
  }) {
    const validity = data.validityMinutes || 30; // 30 minutes default
    const expiresAt = new Date(Date.now() + validity * 60 * 1000);
    const expiresAtIso = expiresAt.toISOString();

    const proposalHash = this.generateProposalHash(
      data.serverId,
      data.actionType,
      data.parameters,
      expiresAtIso
    );

    return prisma.actionProposal.create({
      data: {
        organizationId: data.organizationId,
        serverId: data.serverId,
        analysisId: data.analysisId,
        actionType: data.actionType,
        parameters: data.parameters,
        riskLevel: data.riskLevel,
        status: 'pending',
        proposalHash,
        expiresAt,
      },
    });
  }

  static async generateBaselineProposals(organizationId: string, serverId: string) {
    const baselines = [
      {
        actionType: 'provision.docker',
        riskLevel: 'low' as ProposalRiskLevel,
        parameters: {
          title: 'Docker & Docker Compose Runtime',
          description: 'Install and start Docker daemon and compose v2 for containerized deployments',
          enableDaemon: true,
        },
      },
      {
        actionType: 'provision.ufw_firewall',
        riskLevel: 'medium' as ProposalRiskLevel,
        parameters: {
          title: 'UFW Ingress Firewall Hardening',
          description: 'Lock down unused ports and allow only SSH (22), HTTP (80), and HTTPS (443)',
          allowSsh: true,
          allowHttp: true,
          allowHttps: true,
        },
      },
      {
        actionType: 'provision.logs_streamer',
        riskLevel: 'low' as ProposalRiskLevel,
        parameters: {
          title: 'Persistent System Log Collector',
          description: 'Configure journald log storage and stream system telemetry to NEXUS AI',
          retentionDays: 7,
        },
      },
      {
        actionType: 'provision.cleanup_cron',
        riskLevel: 'low' as ProposalRiskLevel,
        parameters: {
          title: 'Automated Daily System Maintenance',
          description: 'Schedule daily journal vacuum and temporary file purges to prevent disk exhaustion',
          schedule: 'daily',
        },
      },
      {
        actionType: 'provision.nginx',
        riskLevel: 'low' as ProposalRiskLevel,
        parameters: {
          title: 'NGINX High-Performance Web Server',
          description: 'Install and start NGINX HTTP web server on port 80 for websites and reverse proxy routing',
          enableService: true,
        },
      },
      {
        actionType: 'provision.python',
        riskLevel: 'low' as ProposalRiskLevel,
        parameters: {
          title: 'Python 3, PIP & Virtualenv Runtime',
          description: 'Install Python 3 environment, pip package manager, virtualenv, and compilation headers',
          installPip: true,
        },
      },
      {
        actionType: 'provision.nodejs',
        riskLevel: 'low' as ProposalRiskLevel,
        parameters: {
          title: 'Node.js, NPM & PM2 Web Runtime',
          description: 'Install Node.js JavaScript engine, NPM, and PM2 production process supervisor',
          installPm2: true,
        },
      },
    ];

    const results = [];
    for (const b of baselines) {
      const existing = await prisma.actionProposal.findFirst({
        where: {
          organizationId,
          serverId,
          actionType: b.actionType,
        },
      });

      if (!existing) {
        const p = await this.createProposal({
          organizationId,
          serverId,
          actionType: b.actionType,
          parameters: b.parameters,
          riskLevel: b.riskLevel,
          validityMinutes: 1440, // 24 hours validity
        });
        results.push(p);
      }
    }
    return results;
  }

  static async listProposals(organizationId: string, status?: ProposalStatus) {
    const where: any = { organizationId };
    if (status) where.status = status;

    return prisma.actionProposal.findMany({
      where,
      include: {
        server: { select: { id: true, name: true, hostname: true } },
        analysis: {
          select: {
            id: true,
            rootCause: true,
            confidence: true,
            incident: { select: { id: true, title: true, severity: true } },
          },
        },
        approvals: true,
        jobs: {
          select: { id: true, status: true, result: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async approveProposal(
    organizationId: string,
    userId: string,
    proposalId: string,
    providedHash: string
  ) {
    const proposal = await prisma.actionProposal.findFirst({
      where: { id: proposalId, organizationId },
    });

    if (!proposal) {
      throw new Error('PROPOSAL_NOT_FOUND');
    }

    if (proposal.status !== 'pending' && proposal.status !== 'failed') {
      throw new Error(`PROPOSAL_ALREADY_${proposal.status.toUpperCase()}`);
    }

    if (proposal.expiresAt && proposal.expiresAt < new Date()) {
      await prisma.actionProposal.update({
        where: { id: proposal.id },
        data: { status: 'expired' },
      });
      throw new Error('PROPOSAL_EXPIRED');
    }

    // Cryptographic hash validation: user must approve the exact hash
    if (proposal.proposalHash !== providedHash) {
      throw new Error('PROPOSAL_HASH_MISMATCH_TAMPER_DETECTED');
    }

    // Recompute hash independently to verify DB integrity
    const recomputedHash = this.generateProposalHash(
      proposal.serverId,
      proposal.actionType,
      proposal.parameters as Record<string, any>,
      proposal.expiresAt!.toISOString()
    );

    if (recomputedHash !== proposal.proposalHash) {
      throw new Error('PROPOSAL_INTEGRITY_COMPROMISED');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Mark proposal as approved
      const updatedProposal = await tx.actionProposal.update({
        where: { id: proposal.id },
        data: { status: 'approved' },
      });

      // 2. Record immutable approval
      const approval = await tx.approval.create({
        data: {
          organizationId,
          proposalId: proposal.id,
          approvedBy: userId,
          decision: 'approved',
          proposalHash: proposal.proposalHash,
        },
      });

      // 3. Create or update execution Job bound to the approved proposal
      const idempotencyKey = `job:${proposal.id}:${proposal.proposalHash}`;
      const job = await tx.job.upsert({
        where: { idempotencyKey },
        update: {
          status: 'queued',
          result: {
            parameters: proposal.parameters,
            approvalId: approval.id,
            proposalHash: proposal.proposalHash,
          },
          finishedAt: null,
        },
        create: {
          organizationId,
          serverId: proposal.serverId,
          proposalId: proposal.id,
          jobType: proposal.actionType,
          status: 'queued',
          idempotencyKey,
          result: {
            parameters: proposal.parameters,
            approvalId: approval.id,
            proposalHash: proposal.proposalHash,
          },
        },
      });

      // 4. Record audit event
      await AuditService.log({
        organizationId,
        actorId: userId,
        action: 'proposal.approve',
        resourceType: 'action_proposal',
        resourceId: proposal.id,
        metadata: {
          actionType: proposal.actionType,
          serverId: proposal.serverId,
          proposalHash: proposal.proposalHash,
        },
      });

      return { proposal: updatedProposal, approval, job };
    });
  }

  static async rejectProposal(organizationId: string, userId: string, proposalId: string) {
    const proposal = await prisma.actionProposal.findFirst({
      where: { id: proposalId, organizationId },
    });

    if (!proposal) {
      throw new Error('PROPOSAL_NOT_FOUND');
    }

    if (proposal.status !== 'pending' && proposal.status !== 'failed') {
      throw new Error(`PROPOSAL_ALREADY_${proposal.status.toUpperCase()}`);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.actionProposal.update({
        where: { id: proposal.id },
        data: { status: 'rejected' },
      });

      await tx.approval.create({
        data: {
          organizationId,
          proposalId: proposal.id,
          approvedBy: userId,
          decision: 'rejected',
          proposalHash: proposal.proposalHash,
        },
      });

      return updated;
    });
  }
}
