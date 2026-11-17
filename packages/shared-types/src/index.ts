// User & Organization Roles
export type UserRole = 'owner' | 'admin' | 'operator' | 'viewer';

export interface UserSummary {
  id: string;
  email: string;
  fullName: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  role: UserRole;
  createdAt: string;
}

// Server & Agent
export type ServerStatus = 'pending' | 'online' | 'offline' | 'error';
export type AgentStatus = 'offline' | 'online' | 'degraded';

export interface Server {
  id: string;
  organizationId: string;
  name: string;
  hostname: string | null;
  provider: string | null;
  osName: string | null;
  osVersion: string | null;
  architecture: string | null;
  status: ServerStatus;
  createdAt: string;
  agent?: AgentSummary | null;
}

export interface AgentSummary {
  id: string;
  serverId: string;
  version: string | null;
  status: AgentStatus;
  lastSeenAt: string | null;
  enrolledAt: string;
}

// Enrollment
export interface EnrollmentTokenResponse {
  token: string;
  serverId: string;
  expiresAt: string;
  installCommand: string;
}

// Metrics
export interface ServerMetricSnapshot {
  serverId: string;
  timestamp: string;
  cpuUsagePercent: number;
  memoryTotalBytes: number;
  memoryUsedBytes: number;
  memoryUsagePercent: number;
  diskTotalBytes: number;
  diskUsedBytes: number;
  diskUsagePercent: number;
  networkRxBytesPerSec: number;
  networkTxBytesPerSec: number;
  uptimeSeconds: number;
  loadAverage: [number, number, number]; // 1m, 5m, 15m
  services: ServiceStatusSummary[];
}

export interface ServiceStatusSummary {
  name: string;
  status: 'running' | 'stopped' | 'failed' | 'unknown';
  enabled: boolean;
}

// Incidents & AI Proposals
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface Incident {
  id: string;
  organizationId: string;
  serverId: string;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  detectedAt: string;
  resolvedAt: string | null;
}

export type ProposalRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'failed' | 'expired';

export interface ActionProposal {
  id: string;
  organizationId: string;
  serverId: string;
  analysisId: string | null;
  actionType: string;
  parameters: Record<string, any>;
  riskLevel: ProposalRiskLevel;
  status: ProposalStatus;
  proposalHash: string;
  expiresAt: string;
  createdAt: string;
}

export interface ApprovalDecision {
  proposalId: string;
  decision: 'approved' | 'rejected';
  proposalHash: string;
}

// API Responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
