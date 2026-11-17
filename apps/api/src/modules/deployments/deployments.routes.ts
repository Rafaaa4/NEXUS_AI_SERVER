import { Router } from 'express';
import { DeploymentsController } from './deployments.controller';
import { authenticate } from '../../middleware/auth';
import { requireOrgAccess } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);
router.use(requireOrgAccess('viewer'));

router.get('/', DeploymentsController.listDeployments);
router.get('/:id', DeploymentsController.getDeployment);
router.post('/', requireOrgAccess('operator'), DeploymentsController.createDeployment);

export const deploymentRoutes = router;
