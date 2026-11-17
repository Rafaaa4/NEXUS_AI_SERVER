import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRoutes } from './modules/auth/auth.routes';
import { organizationRoutes } from './modules/organizations/organizations.routes';
import { serverRoutes } from './modules/servers/servers.routes';
import { incidentRoutes } from './modules/incidents/incident.routes';
import { aiRoutes } from './modules/ai/ai.routes';
import { agentRoutes } from './modules/agent/agent.routes';
import { agentJobRoutes } from './modules/jobs/jobs.routes';
import { agentLogRoutes } from './modules/logs/logs.routes';
import { billingRoutes } from './modules/billing/billing.routes';
import { auditRoutes } from './modules/audit/audit.routes';
import { deploymentRoutes } from './modules/deployments/deployments.routes';
import { LogsService } from './modules/logs/logs.service';
import { AgentController } from './modules/agent/agent.controller';
import { authenticate } from './middleware/auth';
import { requireOrgAccess } from './middleware/rbac';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'nexus-api',
  });
});

// Dynamic Agent Installer Script
app.get('/install.sh', (req: Request, res: Response) => {
  const protocol = req.protocol;
  const host = req.get('host');
  const defaultApi = `${protocol}://${host}`;

  const script = `#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo "    NEXUS AI - Agent Installation        "
echo "=========================================="

if [ "$(id -u)" -ne 0 ]; then
  echo "Error: This script must be run as root (or using sudo)." >&2
  exit 1
fi

TOKEN="\${NEXUS_TOKEN:-}"
SERVER_ID="\${NEXUS_SERVER_ID:-}"
API_URL="\${NEXUS_API:-${defaultApi}}"

if [ -z "$TOKEN" ] || [ -z "$SERVER_ID" ]; then
  echo "Error: NEXUS_TOKEN and NEXUS_SERVER_ID must be provided." >&2
  echo "Example: sudo NEXUS_TOKEN=xxx NEXUS_SERVER_ID=yyy NEXUS_API=${defaultApi} bash" >&2
  exit 1
fi

echo ">> Registering server agent with NEXUS AI Platform..."
HOSTNAME=$(hostname)
OS_NAME=$(uname -s)
ARCH=$(uname -m)

ENROLL_PAYLOAD=$(cat <<EOF
{
  "serverId": "$SERVER_ID",
  "token": "$TOKEN",
  "hostname": "$HOSTNAME",
  "osName": "$OS_NAME",
  "architecture": "$ARCH",
  "version": "0.1.0"
}
EOF
)

ENROLL_RESP=$(curl -s -X POST "$API_URL/agent/v1/enroll" \\
  -H "Content-Type: application/json" \\
  -d "$ENROLL_PAYLOAD")

SUCCESS=$(echo "$ENROLL_RESP" | grep -o '"success":true' || true)

if [ -z "$SUCCESS" ]; then
  echo "Error: Failed to enroll agent with platform." >&2
  echo "$ENROLL_RESP" >&2
  exit 1
fi

SECRET=$(echo "$ENROLL_RESP" | grep -o '"secret":"[^"]*"' | cut -d'"' -f4)

mkdir -p /etc/nexus-agent
cat <<EOF > /etc/nexus-agent/config.env
NEXUS_API_URL=$API_URL
NEXUS_SERVER_ID=$SERVER_ID
NEXUS_AGENT_SECRET=$SECRET
EOF
chmod 600 /etc/nexus-agent/config.env

echo ">> Agent successfully enrolled and credentials saved to /etc/nexus-agent/config.env"
echo ">> NEXUS Agent is ready to start."
`;

  res.setHeader('Content-Type', 'text/x-shellscript');
  res.send(script);
});

// Server Metrics query endpoint (for dashboard)
app.get(
  '/api/v1/servers/:serverId/metrics',
  authenticate,
  requireOrgAccess('viewer'),
  AgentController.getMetrics
);

// Server Logs query endpoint (for dashboard)
app.get(
  '/api/v1/servers/:serverId/logs',
  authenticate,
  requireOrgAccess('viewer'),
  async (req: Request, res: Response) => {
    try {
      const logs = await LogsService.getLogs(req.params.serverId, {
        level: req.query.level as string,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 100,
      });
      return res.status(200).json({ success: true, data: logs });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { code: 'GET_LOGS_FAILED', message: err.message } });
    }
  }
);

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/servers', serverRoutes);
app.use('/api/v1/incidents', incidentRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/deployments', deploymentRoutes);

// Agent v1 Routes
app.use('/agent/v1', agentRoutes);
app.use('/agent/v1', agentJobRoutes);
app.use('/agent/v1', agentLogRoutes);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'Requested route does not exist',
    },
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
    },
  });
});
