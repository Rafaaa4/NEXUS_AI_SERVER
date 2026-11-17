export interface User {
  id: string;
  email: string;
  fullName: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface Server {
  id: string;
  organizationId: string;
  name: string;
  hostname: string | null;
  provider: string | null;
  osName: string | null;
  osVersion: string | null;
  architecture: string | null;
  status: 'pending' | 'online' | 'offline' | 'error';
  createdAt: string;
  agent?: {
    id: string;
    version: string;
    status: string;
    lastSeenAt: string;
  } | null;
}

export interface Incident {
  id: string;
  organizationId: string;
  serverId: string;
  title: string;
  description: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  detectedAt: string;
  resolvedAt: string | null;
  server?: {
    name: string;
    hostname: string | null;
  };
}

export interface ActionProposal {
  id: string;
  organizationId: string;
  serverId: string;
  actionType: string;
  parameters: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed' | 'expired';
  proposalHash: string;
  expiresAt: string;
  createdAt: string;
  server?: {
    name: string;
  };
  analysis?: {
    rootCause: string;
    confidence: number;
    incident?: {
      title: string;
      severity: string;
    };
  };
}

class ApiService {
  private baseUrl = '/api/v1';

  private getToken(): string | null {
    return localStorage.getItem('nexus_access_token');
  }

  private getOrgId(): string | null {
    return localStorage.getItem('nexus_current_org_id');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const orgId = this.getOrgId();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (orgId) {
      headers['x-organization-id'] = orgId;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || `Request failed with status ${response.status}`);
    }

    return data.data;
  }

  // Auth
  async register(payload: { email: string; password: string; fullName?: string }) {
    return this.request<{
      user: User;
      organization: Organization;
      accessToken: string;
      refreshToken: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async login(payload: { email: string; password: string }) {
    return this.request<{
      user: User;
      organizations: Organization[];
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getMe() {
    return this.request<{ user: User; organizations: Organization[] }>('/auth/me');
  }

  // Organizations
  async listOrganizations() {
    return this.request<Organization[]>('/organizations');
  }

  // Servers
  async listServers() {
    return this.request<Server[]>('/servers');
  }

  async createServer(payload: { name: string; provider?: string; hostname?: string }) {
    return this.request<Server>('/servers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async generateEnrollmentToken(serverId: string) {
    return this.request<{
      token: string;
      serverId: string;
      expiresAt: string;
      installCommand: string;
    }>(`/servers/${serverId}/enrollment-token`, {
      method: 'POST',
    });
  }

  // Incidents
  async listIncidents(status?: string) {
    const q = status ? `?status=${status}` : '';
    return this.request<Incident[]>(`/incidents${q}`);
  }

  // AI & Proposals
  async triggerAiAnalysis(incidentId: string) {
    return this.request<{ analysis: any; proposal: ActionProposal }>(`/ai/analyze/${incidentId}`, {
      method: 'POST',
    });
  }

  async listProposals(status?: string) {
    const q = status ? `?status=${status}` : '';
    return this.request<ActionProposal[]>(`/ai/proposals${q}`);
  }

  async approveProposal(proposalId: string, proposalHash: string) {
    return this.request<{ proposal: ActionProposal; approval: any; job: any }>(
      `/ai/proposals/${proposalId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ proposalHash }),
      }
    );
  }

  async rejectProposal(proposalId: string) {
    return this.request<ActionProposal>(`/ai/proposals/${proposalId}/reject`, {
      method: 'POST',
    });
  }

  // Logs
  async getServerLogs(serverId: string, limit: number = 50) {
    return this.request<any[]>(`/servers/${serverId}/logs?limit=${limit}`);
  }

  // Billing & Subscriptions
  async getSubscription() {
    return this.request<{
      subscription: {
        plan: 'free' | 'pro' | 'enterprise';
        serverLimit: number;
        aiRequestsLimit: number;
        status: string;
      };
      planDetails: {
        tier: string;
        name: string;
        price: number;
        serverLimit: number;
        features: string[];
      };
      usage: {
        serverCount: number;
        serverLimit: number;
        remainingServers: number;
      };
    }>('/billing/subscription');
  }

  async getPlans() {
    return this.request<any[]>('/billing/plans');
  }

  async subscribe(plan: string) {
    return this.request<any>('/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
  }

  // Deployments
  async createDeployment(payload: {
    serverId: string;
    appName: string;
    repositoryUrl?: string;
    branch?: string;
    deployConfig?: any;
  }) {
    return this.request<{ deployment: any; job: any }>('/deployments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listDeployments(serverId?: string) {
    const q = serverId ? `?serverId=${serverId}` : '';
    return this.request<any[]>(`/deployments${q}`);
  }

  async getDeployment(id: string) {
    return this.request<any>(`/deployments/${id}`);
  }

  // Audit Logs
  async listAuditLogs(limit: number = 50) {
    return this.request<{
      id: string;
      action: string;
      resourceType: string;
      resourceId: string;
      metadata: any;
      createdAt: string;
      actor: { email: string; fullName: string | null } | null;
    }[]>(`/audit-logs?limit=${limit}`);
  }
}

export const api = new ApiService();
