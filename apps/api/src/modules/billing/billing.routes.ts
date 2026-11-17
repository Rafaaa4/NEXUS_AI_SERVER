import { Router, Request, Response } from 'express';
import { BillingService, PLANS } from './billing.service';
import { authenticate } from '../../middleware/auth';
import { requireOrgAccess } from '../../middleware/rbac';

const router = Router();

// Public plans list
router.get('/plans', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: Object.values(PLANS) });
});

// Organization subscription routes
router.use(authenticate);
router.use(requireOrgAccess('viewer'));

router.get('/subscription', async (req: Request, res: Response) => {
  try {
    const data = await BillingService.getSubscription(req.organizationId!);
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'GET_SUBSCRIPTION_FAILED', message: err.message } });
  }
});

router.post('/subscribe', requireOrgAccess('owner'), async (req: Request, res: Response) => {
  try {
    const { plan } = req.body;
    if (!['free', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PLAN', message: 'Valid plans: free, pro, enterprise' } });
    }
    const updated = await BillingService.changePlan(req.organizationId!, plan);
    return res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'CHANGE_PLAN_FAILED', message: err.message } });
  }
});

export const billingRoutes = router;
