import { Request, Response } from 'express';
import { DiagnosticService } from './diagnostic.service';
import { ProposalService } from './proposal.service';

export class AiController {
  static async analyzeIncident(req: Request, res: Response) {
    try {
      const result = await DiagnosticService.analyzeIncident(
        req.organizationId!,
        req.params.incidentId
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      if (err.message === 'INCIDENT_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: { code: 'INCIDENT_NOT_FOUND', message: 'Incident not found' },
        });
      }
      return res.status(500).json({
        success: false,
        error: { code: 'AI_ANALYSIS_FAILED', message: err.message },
      });
    }
  }

  static async listProposals(req: Request, res: Response) {
    try {
      const proposals = await ProposalService.listProposals(
        req.organizationId!,
        req.query.status as any
      );
      return res.status(200).json({ success: true, data: proposals });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'LIST_PROPOSALS_FAILED', message: err.message },
      });
    }
  }

  static async approveProposal(req: Request, res: Response) {
    try {
      const { proposalHash } = req.body;
      if (!proposalHash) {
        return res.status(400).json({
          success: false,
          error: { code: 'PROPOSAL_HASH_REQUIRED', message: 'Exact proposalHash is required to approve' },
        });
      }

      const result = await ProposalService.approveProposal(
        req.organizationId!,
        req.user!.id,
        req.params.id,
        proposalHash
      );

      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      if (err.message.includes('NOT_FOUND')) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
      }
      if (err.message.includes('HASH_MISMATCH') || err.message.includes('COMPROMISED')) {
        return res.status(409).json({
          success: false,
          error: { code: 'INTEGRITY_CHECK_FAILED', message: 'Proposal parameters altered or hash mismatch' },
        });
      }
      if (err.message.includes('EXPIRED')) {
        return res.status(410).json({ success: false, error: { code: 'PROPOSAL_EXPIRED', message: 'Proposal has expired' } });
      }
      return res.status(500).json({ success: false, error: { code: 'APPROVAL_FAILED', message: err.message } });
    }
  }

  static async rejectProposal(req: Request, res: Response) {
    try {
      const result = await ProposalService.rejectProposal(
        req.organizationId!,
        req.user!.id,
        req.params.id
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'REJECT_FAILED', message: err.message },
      });
    }
  }
}
