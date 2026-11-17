import { Request, Response } from 'express';
import { AgentService } from './agent.service';

export class AgentController {
  static async enroll(req: Request, res: Response) {
    try {
      const result = await AgentService.enroll(req.body);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (err.message === 'INVALID_OR_EXPIRED_ENROLLMENT_TOKEN') {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Enrollment token is invalid, expired, or already used' },
        });
      }
      if (err.message === 'TOKEN_SERVER_MISMATCH') {
        return res.status(400).json({
          success: false,
          error: { code: 'SERVER_MISMATCH', message: 'Enrollment token does not match serverId' },
        });
      }
      return res.status(500).json({
        success: false,
        error: { code: 'ENROLLMENT_FAILED', message: err.message },
      });
    }
  }

  static async heartbeat(req: Request, res: Response) {
    try {
      const result = await AgentService.recordHeartbeat(req.agent!.id);
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'HEARTBEAT_FAILED', message: err.message },
      });
    }
  }

  static async metrics(req: Request, res: Response) {
    try {
      const result = await AgentService.recordMetrics(
        req.agent!.id,
        req.agent!.serverId,
        req.body
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'METRICS_INGEST_FAILED', message: err.message },
      });
    }
  }

  static async getMetrics(req: Request, res: Response) {
    try {
      const metrics = await AgentService.getLatestMetrics(req.params.serverId);
      return res.status(200).json({ success: true, data: metrics });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'GET_METRICS_FAILED', message: err.message },
      });
    }
  }
}
