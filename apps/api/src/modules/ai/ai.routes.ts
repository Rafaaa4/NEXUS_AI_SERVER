import { Router } from 'express';
import { AiController } from './ai.controller';
import { authenticate } from '../../middleware/auth';
import { requireOrgAccess } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);
router.use(requireOrgAccess('viewer'));

// Request AI Analysis for an Incident
router.post('/analyze/:incidentId', requireOrgAccess('operator'), AiController.analyzeIncident);

// Action Proposals & Approvals
router.get('/proposals', AiController.listProposals);
router.post('/proposals/:id/approve', requireOrgAccess('operator'), AiController.approveProposal);
router.post('/proposals/:id/reject', requireOrgAccess('operator'), AiController.rejectProposal);

export const aiRoutes = router;
