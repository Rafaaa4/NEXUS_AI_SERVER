import { Router, Request, Response } from 'express';
import { LogsService } from './logs.service';
import { authenticateAgent } from '../agent/agent.middleware';

const router = Router();

router.post('/logs', authenticateAgent, async (req: Request, res: Response) => {
  try {
    const { logs } = req.body;
    if (!Array.isArray(logs)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_LOGS', message: 'logs must be an array' } });
    }
    const result = await LogsService.ingestLogs(req.agent!.organizationId, req.agent!.serverId, logs);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'LOG_INGEST_FAILED', message: err.message } });
  }
});

export const agentLogRoutes = router;
