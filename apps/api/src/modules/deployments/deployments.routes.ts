import { Router } from 'express';
import { DeploymentsController } from './deployments.controller';
import { authenticate } from '../../middleware/auth';
import { requireOrgAccess } from '../../middleware/rbac';

const router = Router();

// Public GitHub CI/CD Webhook receiver
router.post('/webhook', DeploymentsController.handleWebhook);

router.use(authenticate);
router.use(requireOrgAccess('viewer'));

router.get('/', DeploymentsController.listDeployments);
router.get('/:id', DeploymentsController.getDeployment);
router.post('/', requireOrgAccess('operator'), DeploymentsController.createDeployment);
router.patch('/:id', requireOrgAccess('operator'), DeploymentsController.updateDeployment);
router.delete('/:id', requireOrgAccess('operator'), DeploymentsController.deleteDeployment);
router.post('/:id/redeploy', requireOrgAccess('operator'), DeploymentsController.redeploy);

export const deploymentRoutes = router;
