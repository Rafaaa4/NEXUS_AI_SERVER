import { Request, Response } from 'express';
import { IncidentService } from './incident.service';

export class IncidentController {
  static async listIncidents(req: Request, res: Response) {
    try {
      const incidents = await IncidentService.listIncidents(req.organizationId!, {
        status: req.query.status as any,
        serverId: req.query.serverId as string,
      });
      return res.status(200).json({ success: true, data: incidents });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'LIST_INCIDENTS_FAILED', message: err.message },
      });
    }
  }

  static async getIncident(req: Request, res: Response) {
    try {
      const incident = await IncidentService.getIncident(req.organizationId!, req.params.id);
      if (!incident) {
        return res.status(404).json({
          success: false,
          error: { code: 'INCIDENT_NOT_FOUND', message: 'Incident not found' },
        });
      }
      return res.status(200).json({ success: true, data: incident });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'GET_INCIDENT_FAILED', message: err.message },
      });
    }
  }

  static async resolveIncident(req: Request, res: Response) {
    try {
      const result = await IncidentService.resolveIncident(req.organizationId!, req.params.id);
      if (result.count === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'INCIDENT_NOT_FOUND', message: 'Incident not found' },
        });
      }
      return res.status(200).json({ success: true, data: { message: 'Incident resolved' } });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'RESOLVE_INCIDENT_FAILED', message: err.message },
      });
    }
  }
}
