import { z } from 'zod';

export const createServerSchema = z.object({
  name: z.string().min(2, 'Server name must be at least 2 characters'),
  hostname: z.string().optional(),
  provider: z.string().optional(),
  osName: z.string().optional(),
  osVersion: z.string().optional(),
  architecture: z.string().optional(),
});

export const updateServerSchema = z.object({
  name: z.string().min(2).optional(),
  hostname: z.string().optional(),
  provider: z.string().optional(),
});
