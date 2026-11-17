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
router.post('/:id/free-ram', requireOrgAccess('operator'), ServersController.freeRam);
router.post('/:id/install-service', requireOrgAccess('operator'), ServersController.installService);
router.post('/:id/update-agent', requireOrgAccess('operator'), ServersController.updateAgent);
router.post('/:id/run-command', requireOrgAccess('operator'), ServersController.runCommand);
router.post('/:id/restart-service', requireOrgAccess('operator'), ServersController.restartService);
router.get('/jobs/:jobId', ServersController.getJob);

export const serverRoutes = router;
