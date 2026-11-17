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

    if (proposal.status !== 'pending') {
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

      // 3. Create execution Job bound to the approved proposal
      const idempotencyKey = `job:${proposal.id}:${proposal.proposalHash}`;
      const job = await tx.job.create({
        data: {
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

    if (proposal.status !== 'pending') {
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
