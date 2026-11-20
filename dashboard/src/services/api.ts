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

export interface AppNotification {
  id: string;
  organizationId: string;
  userId?: string | null;
  title: string;
  message: string;
  type: 'incident' | 'deployment' | 'security' | 'ai' | 'member' | 'server' | 'system';
  severity: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  read: boolean;
  createdAt: string;
  readAt?: string | null;
}

class ApiService {
  private baseUrl = '/api/v1';

  private getToken(): string | null {
    return localStorage.getItem('nexus_access_token');
  }

  private getOrgId(): string | null {
    return localStorage.getItem('nexus_current_org_id');
  }

  private isRefreshing = false;

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    let token = this.getToken();
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

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/refresh')) {
      const refreshToken = localStorage.getItem('nexus_refresh_token');
      if (refreshToken && !this.isRefreshing) {
        this.isRefreshing = true;
        try {
          const res = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          const refreshData = await res.json();
          if (res.ok && refreshData.success && refreshData.data?.accessToken) {
            localStorage.setItem('nexus_access_token', refreshData.data.accessToken);
            if (refreshData.data.refreshToken) {
              localStorage.setItem('nexus_refresh_token', refreshData.data.refreshToken);
            }
            token = refreshData.data.accessToken;
            headers['Authorization'] = `Bearer ${token}`;
            response = await fetch(`${this.baseUrl}${endpoint}`, {
              ...options,
              headers,
            });
          }
        } catch {
          // Token refresh failed, continue to standard error throw
        } finally {
          this.isRefreshing = false;
        }
      }
    }

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

  async listMembers(orgId: string) {
    return this.request<{
      id: string;
      userId: string;
      organizationId: string;
      role: 'owner' | 'admin' | 'operator' | 'viewer';
      createdAt: string;
      user: {
        id: string;
        email: string;
        fullName: string | null;
      };
    }[]>(`/organizations/${orgId}/members`);
  }

  async addMember(orgId: string, email: string, role: string) {
    return this.request<any>(`/organizations/${orgId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  }

  async updateMemberRole(orgId: string, userId: string, role: string) {
    return this.request<any>(`/organizations/${orgId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async removeMember(orgId: string, userId: string) {
    return this.request<any>(`/organizations/${orgId}/members/${userId}`, {
      method: 'DELETE',
    });
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

  async deleteServer(id: string) {
    return this.request<{ id: string; deleted: boolean }> (`/servers/${id}`, {
      method: 'DELETE',
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

  async generateBaselineProposals(serverId: string) {
    return this.request<any[]>(`/servers/${serverId}/baseline-proposals`, {
      method: 'POST',
    });
  }

  async freeServerRam(serverId: string) {
    return this.request<{ success: boolean; data: { jobId: string; message: string } }>(
      `/servers/${serverId}/free-ram`,
      { method: 'POST' }
    );
  }

  async installAgentService(serverId: string) {
    return this.request<{ success: boolean; data: { jobId: string; message: string } }>(
      `/servers/${serverId}/install-service`,
      { method: 'POST' }
    );
  }

  async updateAgent(serverId: string, apiUrl?: string) {
    const dynamicApi = apiUrl || `http://${window.location.hostname}:4000`;
    return this.request<{ success: boolean; data: { jobId: string; message: string } }>(
      `/servers/${serverId}/update-agent`,
      {
        method: 'POST',
        body: JSON.stringify({ apiUrl: dynamicApi }),
      }
    );
  }

  async runServerCommand(serverId: string, command: string) {
    return this.request<{ success: boolean; data: { jobId: string; message: string } }>(
      `/servers/${serverId}/run-command`,
      {
        method: 'POST',
        body: JSON.stringify({ command }),
      }
    );
  }

  async restartServerService(serverId: string, service: string = 'nginx') {
    return this.request<{ success: boolean; data: { jobId: string; message: string } }>(
      `/servers/${serverId}/restart-service`,
      {
        method: 'POST',
        body: JSON.stringify({ service }),
      }
    );
  }

  async installDocker(serverId: string) {
    return this.request<{ success: boolean; data: { jobId: string; message: string } }>(
      `/servers/${serverId}/install-docker`,
      { method: 'POST' }
    );
  }

  async getJobStatus(jobId: string) {
    return this.request<{ success: boolean; data: any }>(`/servers/jobs/${jobId}`);
  }

  // Incidents
  async listIncidents(status?: string) {
    const q = status ? `?status=${status}` : '';
    return this.request<Incident[]>(`/incidents${q}`);
  }

  async getIncident(id: string) {
    return this.request<Incident>(`/incidents/${id}`);
  }

  async resolveIncident(id: string) {
    return this.request<Incident>(`/incidents/${id}/resolve`, {
      method: 'POST',
    });
  }

  async getServerMetrics(serverId: string) {
    return this.request<any>(`/servers/${serverId}/metrics`);
  }

  async getServerFirewall(serverId: string) {
    return this.request<{ status: string; rules: any[] }>(`/servers/${serverId}/firewall`);
  }

  async allowFirewallPort(serverId: string, port: string | number, protocol: string = 'tcp') {
    return this.request<any>(`/servers/${serverId}/firewall/allow`, {
      method: 'POST',
      body: JSON.stringify({ port, protocol }),
    });
  }

  async denyFirewallPort(serverId: string, port: string | number, protocol: string = 'tcp') {
    return this.request<any>(`/servers/${serverId}/firewall/deny`, {
      method: 'POST',
      body: JSON.stringify({ port, protocol }),
    });
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

  async updateDeployment(id: string, payload: {
    appName?: string;
    repositoryUrl?: string;
    branch?: string;
    environment?: string;
    deployConfig?: any;
  }) {
    return this.request<any>(`/deployments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteDeployment(id: string) {
    return this.request<{ success: boolean; deletedId: string }>(`/deployments/${id}`, {
      method: 'DELETE',
    });
  }

  async redeployDeployment(id: string) {
    return this.request<{ deployment: any; job: any }>(`/deployments/${id}/redeploy`, {
      method: 'POST',
    });
  }

  async rollbackDeployment(id: string) {
    return this.request<{ success: boolean; job: any }>(`/deployments/${id}/rollback`, {
      method: 'POST',
    });
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

  // Managed Databases per Server
  async listDatabases(serverId?: string) {
    const query = serverId ? `?serverId=${serverId}` : '';
    return this.request<any[]>(`/databases${query}`);
  }

  async createDatabase(payload: {
    serverId: string;
    name: string;
    dbType: string;
    port?: number;
    username?: string;
    password?: string;
  }) {
    return this.request<any>('/databases', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async databaseAction(id: string, action: 'start' | 'stop' | 'restart' | 'backup') {
    return this.request<any>(`/databases/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  async deleteDatabase(id: string) {
    return this.request<any>(`/databases/${id}`, {
      method: 'DELETE',
    });
  }

  // Platform Notifications
  async listNotifications(unreadOnly: boolean = false, limit: number = 50) {
    return this.request<{ success: boolean; count: number; unreadCount: number; data: AppNotification[] }>(
      `/notifications?unreadOnly=${unreadOnly}&limit=${limit}`
    );
  }

  async getUnreadNotificationsCount() {
    return this.request<{ success: boolean; unreadCount: number }>('/notifications/unread-count');
  }

  async markNotificationRead(id: string) {
    return this.request<{ success: boolean; data: AppNotification }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsRead() {
    return this.request<{ success: boolean; updated: number }>('/notifications/read-all', {
      method: 'POST',
    });
  }

  async deleteNotification(id: string) {
    return this.request<{ success: boolean; deleted: boolean; id: string }>(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  async clearReadNotifications() {
    return this.request<{ success: boolean; clearedCount: number }>('/notifications/clear', {
      method: 'DELETE',
    });
  }

  async createNotification(payload: {
    title: string;
    message?: string;
    type?: string;
    severity?: string;
    link?: string;
  }) {
    return this.request<{ success: boolean; data: AppNotification }>('/notifications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiService();
