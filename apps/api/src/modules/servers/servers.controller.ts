import { Request, Response } from 'express';
import { ServersService } from './servers.service';
import { ProposalService } from '../ai/proposal.service';

export class ServersController {
  static async listServers(req: Request, res: Response) {
    try {
      const servers = await ServersService.listServers(req.organizationId!);
      return res.status(200).json({ success: true, data: servers });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'LIST_SERVERS_FAILED', message: err.message },
      });
    }
  }

  static async getServer(req: Request, res: Response) {
    try {
      const server = await ServersService.getServer(req.organizationId!, req.params.id);
      if (!server) {
        return res.status(404).json({
          success: false,
          error: { code: 'SERVER_NOT_FOUND', message: 'Server not found' },
        });
      }
      return res.status(200).json({ success: true, data: server });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'GET_SERVER_FAILED', message: err.message },
      });
    }
  }

  static async createServer(req: Request, res: Response) {
    try {
      const server = await ServersService.createServer(req.organizationId!, req.body, req.user?.id);
      return res.status(201).json({ success: true, data: server });
    } catch (err: any) {
      if (err.message.includes('QUOTA_EXCEEDED')) {
        return res.status(403).json({
          success: false,
          error: { code: 'QUOTA_EXCEEDED', message: err.message },
        });
      }
      return res.status(500).json({
        success: false,
        error: { code: 'CREATE_SERVER_FAILED', message: err.message },
      });
    }
  }

  static async deleteServer(req: Request, res: Response) {
    try {
      const result = await ServersService.deleteServer(req.organizationId!, req.params.id, req.user?.id);
      if (result.count === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'SERVER_NOT_FOUND', message: 'Server not found' },
        });
      }
      return res.status(200).json({ success: true, data: { message: 'Server deleted successfully' } });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'DELETE_SERVER_FAILED', message: err.message },
      });
    }
  }

  static async generateEnrollmentToken(req: Request, res: Response) {
    try {
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;

      const enrollment = await ServersService.generateEnrollmentToken(
        req.organizationId!,
        req.params.id,
        baseUrl
      );

      return res.status(200).json({ success: true, data: enrollment });
    } catch (err: any) {
      if (err.message === 'SERVER_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: { code: 'SERVER_NOT_FOUND', message: 'Server not found in this organization' },
        });
      }
      return res.status(500).json({
        success: false,
        error: { code: 'GENERATE_TOKEN_FAILED', message: err.message },
      });
    }
  }

  static async generateBaselineProposals(req: Request, res: Response) {
    try {
      const proposals = await ProposalService.generateBaselineProposals(
        req.organizationId!,
        req.params.id
      );
      return res.status(200).json({ success: true, data: proposals });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'BASELINE_PROPOSALS_FAILED', message: err.message },
      });
    }
  }

  static async freeRam(req: Request, res: Response) {
    try {
      const result = await ServersService.freeServerRam(
        req.organizationId!,
        req.params.id,
        req.user?.id
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'FREE_RAM_FAILED', message: err.message },
      });
    }
  }

  static async installService(req: Request, res: Response) {
    try {
      const result = await ServersService.installAgentService(
        req.organizationId!,
        req.params.id,
        req.user?.id
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'INSTALL_SERVICE_FAILED', message: err.message },
      });
    }
  }

  static async updateAgent(req: Request, res: Response) {
    try {
      const dynamicApi = req.body.apiUrl || `${req.protocol}://${req.get('host')}`;
      const result = await ServersService.updateAgent(
        req.organizationId!,
        req.params.id,
        dynamicApi,
        req.user?.id
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'UPDATE_AGENT_FAILED', message: err.message },
      });
    }
  }

  static async runCommand(req: Request, res: Response) {
    try {
      const { command } = req.body;
      const result = await ServersService.runServerCommand(
        req.organizationId!,
        req.params.id,
        command,
        req.user?.id
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'RUN_COMMAND_FAILED', message: err.message },
      });
    }
  }

  static async restartService(req: Request, res: Response) {
    try {
      const { service } = req.body;
      const result = await ServersService.restartServerService(
        req.organizationId!,
        req.params.id,
        service || 'nginx',
        req.user?.id
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'RESTART_SERVICE_FAILED', message: err.message },
      });
    }
  }

  static async getJob(req: Request, res: Response) {
    try {
      const job = await ServersService.getJobStatus(
        req.organizationId!,
        req.params.jobId
      );
      return res.status(200).json({ success: true, data: job });
    } catch (err: any) {
      return res.status(404).json({
        success: false,
        error: { code: 'JOB_NOT_FOUND', message: err.message },
      });
    }
  }
}
