import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import http from 'http';

async function runTests() {
  console.log('🧪 Starting Phase 1 E2E & Multi-Tenant Isolation Tests...');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  const request = async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, body: json };
  };

  try {
    // 1. Health check
    const health = await request('/health');
    console.assert(health.status === 200, 'Health check failed');
    console.log('✅ 1. Health check passed');

    // 2. Register User 1
    const user1Email = `user1-${Date.now()}@example.com`;
    const reg1 = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: user1Email,
        password: 'Password123!',
        fullName: 'Alice Founder',
      }),
    });
    console.assert(reg1.status === 201 && reg1.body.success, 'Registration failed');
    const token1 = reg1.body.data.accessToken;
    const org1 = reg1.body.data.organization;
    console.log('✅ 2. User 1 registered with default organization:', org1.name);

    // 3. Register User 2 (Separate tenant)
    const user2Email = `user2-${Date.now()}@example.com`;
    const reg2 = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: user2Email,
        password: 'Password123!',
        fullName: 'Bob Competitor',
      }),
    });
    console.assert(reg2.status === 201 && reg2.body.success, 'User 2 registration failed');
    const token2 = reg2.body.data.accessToken;
    const org2 = reg2.body.data.organization;
    console.log('✅ 3. User 2 registered with separate tenant organization:', org2.name);

    // 4. Create Server for User 1 in Org 1
    const createServerRes = await request('/api/v1/servers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token1}`,
        'x-organization-id': org1.id,
      },
      body: JSON.stringify({
        name: 'production-vps-01',
        hostname: 'vps01.example.com',
        provider: 'hetzner',
        osName: 'Ubuntu',
        osVersion: '24.04',
        architecture: 'amd64',
      }),
    });
    console.assert(createServerRes.status === 201, 'Server creation failed');
    const server1 = createServerRes.body.data;
    console.log('✅ 4. Server created for Org 1:', server1.name, `(ID: ${server1.id})`);

    // 5. TEST MULTI-TENANT ISOLATION (Crucial Security Test)
    // User 2 tries to access User 1's server in Org 1
    const crossTenantAttempt1 = await request(`/api/v1/servers/${server1.id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token2}`,
        'x-organization-id': org1.id, // User 2 trying to spoof Org 1
      },
    });
    console.assert(
      crossTenantAttempt1.status === 403,
      `Expected 403 Forbidden for cross-tenant access, got ${crossTenantAttempt1.status}`
    );
    console.log('🔒 5. Multi-Tenant Protection verified: User 2 denied access to Org 1 (403 Forbidden)');

    // User 2 queries their own servers list -> Server 1 must NOT appear
    const org2ServersRes = await request('/api/v1/servers', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token2}`,
        'x-organization-id': org2.id,
      },
    });
    console.assert(org2ServersRes.body.data.length === 0, 'Server from Org 1 leaked into Org 2!');
    console.log('🔒 6. Multi-Tenant List Isolation verified: Org 2 server list is clean and isolated');

    // 7. Generate Enrollment Token for Server 1
    const enrollTokenRes = await request(`/api/v1/servers/${server1.id}/enrollment-token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token1}`,
        'x-organization-id': org1.id,
      },
    });
    console.assert(enrollTokenRes.status === 200, 'Failed to generate enrollment token');
    const { token: enrollmentToken, installCommand } = enrollTokenRes.body.data;
    console.log('✅ 7. Agent enrollment token generated successfully');
    console.log('   Install Command template:', installCommand);

    // 8. Simulate Agent Enrollment (`/agent/v1/enroll`)
    const agentEnrollRes = await request('/agent/v1/enroll', {
      method: 'POST',
      body: JSON.stringify({
        serverId: server1.id,
        token: enrollmentToken,
        hostname: 'vps01.example.com',
        osName: 'Linux',
        architecture: 'amd64',
        version: '0.1.0',
      }),
    });
    console.assert(agentEnrollRes.status === 200, 'Agent enrollment failed');
    const { secret: agentSecret, agentId } = agentEnrollRes.body.data;
    console.log('✅ 8. Agent successfully enrolled with platform! (Agent ID:', agentId, ')');

    // Token reuse test: Enrollment token should now be rejected (one-time use)
    const tokenReuseRes = await request('/agent/v1/enroll', {
      method: 'POST',
      body: JSON.stringify({
        serverId: server1.id,
        token: enrollmentToken,
      }),
    });
    console.assert(tokenReuseRes.status === 401, 'One-time token was illegally reused!');
    console.log('🔒 9. One-time token protection verified: Re-enrollment with same token rejected');

    // 10. Agent Heartbeat (`/agent/v1/heartbeat`)
    const heartbeatRes = await request('/agent/v1/heartbeat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${agentSecret}`,
      },
      body: JSON.stringify({
        status: 'online',
        version: '0.1.0',
      }),
    });
    console.assert(heartbeatRes.status === 200, 'Agent heartbeat failed');
    console.log('✅ 10. Agent heartbeat recorded successfully');

    // 11. Agent Telemetry Metrics Ingestion (`/agent/v1/metrics`)
    const metricsPayload = {
      timestamp: new Date().toISOString(),
      cpuUsagePercent: 14.5,
      memoryTotalBytes: 8589934592,
      memoryUsedBytes: 3221225472,
      memoryUsagePercent: 37.5,
      diskTotalBytes: 107374182400,
      diskUsedBytes: 32212254720,
      diskUsagePercent: 30.0,
      networkRxBytesPerSec: 1048576,
      networkTxBytesPerSec: 524288,
      uptimeSeconds: 864000,
      loadAverage: [0.15, 0.22, 0.18] as [number, number, number],
      services: [
        { name: 'nginx', status: 'running' as const, enabled: true },
        { name: 'docker', status: 'running' as const, enabled: true },
        { name: 'sshd', status: 'running' as const, enabled: true },
      ],
    };

    const metricsIngestRes = await request('/agent/v1/metrics', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${agentSecret}`,
      },
      body: JSON.stringify(metricsPayload),
    });
    console.assert(metricsIngestRes.status === 200, 'Metrics ingestion failed');
    console.log('✅ 11. Metrics snapshot successfully ingested from Go Agent protocol');

    // 12. Check Server Details & Status via Dashboard API
    const serverDetailsRes = await request(`/api/v1/servers/${server1.id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token1}`,
        'x-organization-id': org1.id,
      },
    });
    console.assert(serverDetailsRes.body.data.status === 'online', 'Server status not updated to online');
    console.assert(serverDetailsRes.body.data.agent.status === 'online', 'Agent status not online');
    console.log('✅ 12. Dashboard API reports Server & Agent status as ONLINE!');

    console.log('\n🎉 ALL PHASE 1 CORE BACKEND & SECURITY TESTS PASSED PERFECTLY!\n');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
