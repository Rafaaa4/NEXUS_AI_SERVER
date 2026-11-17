import { z } from 'zod';

export const agentEnrollSchema = z.object({
  serverId: z.string().uuid(),
  token: z.string().min(16),
  version: z.string().optional(),
  hostname: z.string().optional(),
  osName: z.string().optional(),
  osVersion: z.string().optional(),
  architecture: z.string().optional(),
});

export const agentHeartbeatSchema = z.object({
  version: z.string().optional(),
  status: z.enum(['online', 'degraded', 'offline']).default('online'),
});

export const agentMetricsSchema = z.object({
  timestamp: z.string(),
  cpuUsagePercent: z.number(),
  memoryTotalBytes: z.number(),
  memoryUsedBytes: z.number(),
  memoryUsagePercent: z.number(),
  diskTotalBytes: z.number(),
  diskUsedBytes: z.number(),
  diskUsagePercent: z.number(),
  networkRxBytesPerSec: z.number().default(0),
  networkTxBytesPerSec: z.number().default(0),
  uptimeSeconds: z.number(),
  loadAverage: z.tuple([z.number(), z.number(), z.number()]),
  services: z.array(
    z.object({
      name: z.string(),
      status: z.enum(['running', 'stopped', 'failed', 'unknown']),
      enabled: z.boolean(),
    })
  ).default([]),
});
