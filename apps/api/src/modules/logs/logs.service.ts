import { LogRedactor } from './logRedactor';
import { redis } from '../../lib/redis';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'fatal';
  source: string;
  message: string;
}

export class LogsService {
  // In dev / single node we store recent logs in Redis / memory buffer per server
  private static memoryLogs: Map<string, LogEntry[]> = new Map();

  static async ingestLogs(organizationId: string, serverId: string, logs: LogEntry[]) {
    const sanitizedLogs = logs.map((log) => ({
      ...log,
      message: LogRedactor.redact(log.message),
    }));

    const key = `server:logs:${serverId}`;
    try {
      for (const log of sanitizedLogs) {
        await redis.rpush(key, JSON.stringify(log));
      }
      await redis.ltrim(key, -1000, -1); // Keep last 1000 lines
      await redis.expire(key, 86400 * 3); // 3 days retention
    } catch {
      // Memory fallback if Redis not running
      const current = this.memoryLogs.get(serverId) || [];
      const updated = [...current, ...sanitizedLogs].slice(-1000);
      this.memoryLogs.set(serverId, updated);
    }

    return { ingested: sanitizedLogs.length };
  }

  static async getLogs(
    serverId: string,
    query?: { level?: string; search?: string; limit?: number }
  ): Promise<LogEntry[]> {
    const limit = query?.limit || 100;
    let rawEntries: LogEntry[] = [];

    try {
      const redisEntries = await redis.lrange(`server:logs:${serverId}`, -limit, -1);
      if (redisEntries && redisEntries.length > 0) {
        rawEntries = redisEntries.map((e) => JSON.parse(e));
      }
    } catch {}

    if (rawEntries.length === 0) {
      rawEntries = this.memoryLogs.get(serverId) || [];
    }

    let filtered = rawEntries;
    if (query?.level) {
      filtered = filtered.filter((l) => l.level === query.level);
    }
    if (query?.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(
        (l) => l.message.toLowerCase().includes(searchLower) || l.source.toLowerCase().includes(searchLower)
      );
    }

    return filtered.slice(-limit);
  }
}
