import { Router } from 'express';
import { ServersController } from './servers.controller';
import { authenticate } from '../../middleware/auth';
import { requireOrgAccess } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createServerSchema } from './servers.schema';

const router = Router();

// All server routes require authentication and organization context
router.use(authenticate);
router.use(requireOrgAccess('viewer'));

router.get('/', ServersController.listServers);
router.get('/:id', ServersController.getServer);
router.post('/', requireOrgAccess('admin'), validate(createServerSchema), ServersController.createServer);
router.delete('/:id', requireOrgAccess('admin'), ServersController.deleteServer);
router.post('/:id/enrollment-token', requireOrgAccess('admin'), ServersController.generateEnrollmentToken);
router.post('/:id/baseline-proposals', requireOrgAccess('operator'), ServersController.generateBaselineProposals);

export const serverRoutes = router;
