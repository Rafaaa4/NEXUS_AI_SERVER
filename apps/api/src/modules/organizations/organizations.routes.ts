import { Router } from 'express';
import { OrganizationsController } from './organizations.controller';
import { authenticate } from '../../middleware/auth';
import { requireOrgAccess } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  createOrganizationSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from './organizations.schema';

const router = Router();

// Routes accessible to any authenticated user
router.get('/', authenticate, OrganizationsController.listUserOrganizations);
router.post('/', authenticate, validate(createOrganizationSchema), OrganizationsController.createOrganization);

// Organization-scoped routes
router.get('/:orgId', authenticate, requireOrgAccess('viewer'), OrganizationsController.getOrganization);
router.get('/:orgId/members', authenticate, requireOrgAccess('viewer'), OrganizationsController.listMembers);
router.post(
  '/:orgId/members',
  authenticate,
  requireOrgAccess('admin'),
  validate(inviteMemberSchema),
  OrganizationsController.addMember
);
router.patch(
  '/:orgId/members/:userId',
  authenticate,
  requireOrgAccess('admin'),
  validate(updateMemberRoleSchema),
  OrganizationsController.updateMemberRole
);
router.delete(
  '/:orgId/members/:userId',
  authenticate,
  requireOrgAccess('owner'),
  OrganizationsController.removeMember
);

export const organizationRoutes = router;
