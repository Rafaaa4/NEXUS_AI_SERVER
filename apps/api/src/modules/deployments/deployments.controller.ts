import { Request, Response } from 'express';
import { DeploymentsService } from './deployments.service';

export class DeploymentsController {
  static async createDeployment(req: Request, res: Response) {
    try {
      const result = await DeploymentsService.createDeployment(
        req.organizationId!,
        req.body,
        req.user?.id
      );
      return res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      if (err.message === 'SERVER_NOT_FOUND') {
        return res.status(404).json({ success: false, error: { code: 'SERVER_NOT_FOUND', message: 'Target server not found' } });
      }
      return res.status(500).json({ success: false, error: { code: 'DEPLOYMENT_FAILED', message: err.message } });
    }
  }

  static async listDeployments(req: Request, res: Response) {
    try {
      const serverId = req.query.serverId as string;
      const deployments = await DeploymentsService.listDeployments(req.organizationId!, serverId);
      return res.status(200).json({ success: true, data: deployments });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { code: 'LIST_DEPLOYMENTS_FAILED', message: err.message } });
    }
  }

  static async getDeployment(req: Request, res: Response) {
    try {
      const deployment = await DeploymentsService.getDeployment(req.organizationId!, req.params.id);
      if (!deployment) {
        return res.status(404).json({ success: false, error: { code: 'DEPLOYMENT_NOT_FOUND', message: 'Deployment not found' } });
      }
      return res.status(200).json({ success: true, data: deployment });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { code: 'GET_DEPLOYMENT_FAILED', message: err.message } });
    }
  }
}
