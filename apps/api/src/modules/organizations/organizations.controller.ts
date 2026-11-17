import { Request, Response } from 'express';
import { OrganizationsService } from './organizations.service';

export class OrganizationsController {
  static async listUserOrganizations(req: Request, res: Response) {
    try {
      const orgs = await OrganizationsService.listUserOrganizations(req.user!.id);
      return res.status(200).json({ success: true, data: orgs });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'LIST_ORGS_FAILED', message: err.message },
      });
    }
  }

  static async createOrganization(req: Request, res: Response) {
    try {
      const org = await OrganizationsService.createOrganization(req.user!.id, req.body);
      return res.status(201).json({ success: true, data: org });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'CREATE_ORG_FAILED', message: err.message },
      });
    }
  }

  static async getOrganization(req: Request, res: Response) {
    try {
      const org = await OrganizationsService.getOrganization(req.organizationId!);
      if (!org) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORG_NOT_FOUND', message: 'Organization not found' },
        });
      }
      return res.status(200).json({ success: true, data: org });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'GET_ORG_FAILED', message: err.message },
      });
    }
  }

  static async listMembers(req: Request, res: Response) {
    try {
      const members = await OrganizationsService.listMembers(req.organizationId!);
      return res.status(200).json({ success: true, data: members });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'LIST_MEMBERS_FAILED', message: err.message },
      });
    }
  }

  static async addMember(req: Request, res: Response) {
    try {
      const membership = await OrganizationsService.addMember(
        req.organizationId!,
        req.body.email,
        req.body.role
      );
      return res.status(201).json({ success: true, data: membership });
    } catch (err: any) {
      if (err.message === 'USER_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User with this email not registered yet' },
        });
      }
      if (err.message === 'USER_ALREADY_MEMBER') {
        return res.status(409).json({
          success: false,
          error: { code: 'USER_ALREADY_MEMBER', message: 'User is already a member of this organization' },
        });
      }
      return res.status(500).json({
        success: false,
        error: { code: 'ADD_MEMBER_FAILED', message: err.message },
      });
    }
  }

  static async updateMemberRole(req: Request, res: Response) {
    try {
      const updated = await OrganizationsService.updateMemberRole(
        req.organizationId!,
        req.params.userId,
        req.body.role
      );
      return res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'UPDATE_ROLE_FAILED', message: err.message },
      });
    }
  }

  static async removeMember(req: Request, res: Response) {
    try {
      await OrganizationsService.removeMember(req.organizationId!, req.params.userId);
      return res.status(200).json({ success: true, data: { message: 'Member removed' } });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'REMOVE_MEMBER_FAILED', message: err.message },
      });
    }
  }
}
