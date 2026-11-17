import { Router, Request, Response } from 'express';
import { AuditService } from './audit.service';
import { authenticate } from '../../middleware/auth';
import { requireOrgAccess } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);
router.use(requireOrgAccess('admin')); // Only admins and owners can view security audit logs

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const logs = await AuditService.listLogs(req.organizationId!, limit);
    return res.status(200).json({ success: true, data: logs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'GET_AUDIT_LOGS_FAILED', message: err.message } });
  }
});

export const auditRoutes = router;
