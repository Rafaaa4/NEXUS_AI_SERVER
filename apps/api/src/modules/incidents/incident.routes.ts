import { Router } from 'express';
import { IncidentController } from './incident.controller';
import { authenticate } from '../../middleware/auth';
import { requireOrgAccess } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);
router.use(requireOrgAccess('viewer'));

router.get('/', IncidentController.listIncidents);
router.get('/:id', IncidentController.getIncident);
router.post('/:id/resolve', requireOrgAccess('operator'), IncidentController.resolveIncident);

export const incidentRoutes = router;
