import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

const roleHierarchy: Record<Role, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
  owner: 4,
};

export const requireOrgAccess = (minRole: Role = 'viewer') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const orgId = (req.headers['x-organization-id'] as string) || req.params.orgId || req.body?.organizationId;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ORGANIZATION_REQUIRED',
          message: 'Target organizationId must be provided via x-organization-id header or request parameters',
        },
      });
    }

    try {
      const membership = await prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: req.user.id,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not a member of this organization',
          },
        });
      }

      if (roleHierarchy[membership.role] < roleHierarchy[minRole]) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `Requires minimum role: ${minRole}`,
          },
        });
      }

      req.organizationId = orgId;
      req.userRole = membership.role;
      next();
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to verify organization membership' },
      });
    }
  };
};
