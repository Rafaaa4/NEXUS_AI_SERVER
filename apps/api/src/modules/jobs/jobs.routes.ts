import { Router, Request, Response } from 'express';
import { JobsService } from './jobs.service';
import { authenticateAgent } from '../agent/agent.middleware';

const router = Router();

// Agent polls pending approved jobs
router.get('/jobs/pending', authenticateAgent, async (req: Request, res: Response) => {
  try {
    const jobs = await JobsService.getPendingJobs(req.agent!.organizationId, req.agent!.serverId);
    return res.status(200).json({ success: true, data: jobs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'POLL_JOBS_FAILED', message: err.message } });
  }
});

// Agent reports execution result
router.post('/jobs/:id/result', authenticateAgent, async (req: Request, res: Response) => {
  try {
    const result = await JobsService.reportJobResult(
      req.agent!.organizationId,
      req.agent!.serverId,
      req.params.id,
      req.body
    );
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'REPORT_RESULT_FAILED', message: err.message } });
  }
});

export const agentJobRoutes = router;
