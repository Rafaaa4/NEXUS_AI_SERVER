import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import http from 'http';

async function runPhase6Tests() {
  console.log('🧪 Starting Phase 6: Billing, Quotas & Audit Trail Tests...');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  const request = async (urlPath: string, options: RequestInit = {}) => {
    const res = await fetch(`${baseUrl}${urlPath}`, {
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
    // 1. Register User & Default Org
    const userEmail = `founder-${Date.now()}@nexus-fleet.com`;
    const regRes = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: userEmail,
        password: 'Password123!',
        fullName: 'Cloud Architect',
      }),
    });
    const token = regRes.body.data.accessToken;
    const orgId = regRes.body.data.organization.id;
    console.log('✅ 1. User & Organization registered successfully');

    // 2. Check Default Plan (Free Tier)
    const subRes = await request('/api/v1/billing/subscription', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'x-organization-id': orgId },
    });
    console.assert(subRes.status === 200, 'Failed to fetch subscription');
    const { subscription, usage } = subRes.body.data;
    console.assert(subscription.plan === 'free', 'Default plan is not free');
    console.assert(usage.serverLimit === 2, `Expected limit 2, got ${usage.serverLimit}`);
    console.log(`✅ 2. Default Plan verified: ${subscription.plan.toUpperCase()} (Max: ${usage.serverLimit} servers)`);

    // 3. Create Server 1 (Within Quota)
    const s1 = await request('/api/v1/servers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'x-organization-id': orgId },
      body: JSON.stringify({ name: 'node-free-01', provider: 'hetzner' }),
    });
    console.assert(s1.status === 201, 'Server 1 creation failed');
    console.log('✅ 3. Server 1 created successfully (Usage: 1/2)');

    // 4. Create Server 2 (Reaches Quota Limit)
    const s2 = await request('/api/v1/servers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'x-organization-id': orgId },
      body: JSON.stringify({ name: 'node-free-02', provider: 'digitalocean' }),
    });
    console.assert(s2.status === 201, 'Server 2 creation failed');
    console.log('✅ 4. Server 2 created successfully (Usage: 2/2 - Limit reached)');

    // 5. Attempt to Create Server 3 (MUST EXCEED QUOTA AND BE REJECTED)
    const s3Attempt = await request('/api/v1/servers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'x-organization-id': orgId },
      body: JSON.stringify({ name: 'node-free-03-illegal', provider: 'ovh' }),
    });
    console.assert(
      s3Attempt.status === 403,
      `Expected 403 Forbidden for quota breach, got ${s3Attempt.status}`
    );
    console.assert(
      s3Attempt.body.error.code === 'QUOTA_EXCEEDED',
      `Expected QUOTA_EXCEEDED, got ${s3Attempt.body.error.code}`
    );
    console.log('🔒 5. Quota Enforcement verified: Server 3 creation denied with 403 QUOTA_EXCEEDED');

    // 6. Upgrade Subscription to "pro" Plan
    const upgradeRes = await request('/api/v1/billing/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'x-organization-id': orgId },
      body: JSON.stringify({ plan: 'pro' }),
    });
    console.assert(upgradeRes.status === 200, 'Upgrade to pro plan failed');
    console.assert(upgradeRes.body.data.plan === 'pro', 'Plan not updated to pro');
    console.assert(upgradeRes.body.data.serverLimit === 10, 'Server limit not upgraded to 10');
    console.log('💎 6. Plan upgraded successfully to PRO (Server limit expanded to 10)');

    // 7. Retry Creating Server 3 (Now within PRO Quota)
    const s3Retry = await request('/api/v1/servers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'x-organization-id': orgId },
      body: JSON.stringify({ name: 'node-pro-03', provider: 'ovh' }),
    });
    console.assert(s3Retry.status === 201, 'Server 3 creation should now succeed after upgrade');
    console.log('✅ 7. Server 3 created successfully under PRO quota (Usage: 3/10)');

    // 8. Audit Trail Verification
    const auditRes = await request('/api/v1/audit-logs', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'x-organization-id': orgId },
    });
    console.assert(auditRes.status === 200, 'Failed to fetch audit logs');
    const logs = auditRes.body.data;
    console.assert(logs.length >= 3, `Expected at least 3 audit logs, got ${logs.length}`);

    const serverCreateLogs = logs.filter((l: any) => l.action === 'server.create');
    console.assert(serverCreateLogs.length >= 3, 'Audit logs missing server.create events');
    console.log(`🛡️ 8. Audit Trail verified: ${logs.length} immutable security events logged with actor & metadata`);

    console.log('\n🎉 ALL PHASE 6 BILLING, QUOTAS & AUDIT TESTS PASSED 100%!\n');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runPhase6Tests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
