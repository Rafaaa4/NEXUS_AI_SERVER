import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must have at least 2 characters'),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase alphanumeric characters and hyphens')
    .optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'operator', 'viewer']),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'operator', 'viewer']),
});
