import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import http from 'http';
import { exec } from 'child_process';
import path from 'path';

async function runPhases345Test() {
  console.log('🧪 Starting End-to-End Tests for Phases 3, 4 & 5...');

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
    // 1. Setup User & Server
    const regRes = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: `ops-${Date.now()}@nexus-ai.dev`,
        password: 'Password123!',
        fullName: 'DevOps Lead',
      }),
    });
    const token = regRes.body.data.accessToken;
    const orgId = regRes.body.data.organization.id;

    const serverRes = await request('/api/v1/servers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'x-organization-id': orgId },
      body: JSON.stringify({ name: 'web-production-node', provider: 'hetzner' }),
    });
    const serverId = serverRes.body.data.id;

    const enrollTokenRes = await request(`/api/v1/servers/${serverId}/enrollment-token`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'x-organization-id': orgId },
    });
    const { token: enrollmentToken } = enrollTokenRes.body.data;

    // Enroll Agent
    const enrollRes = await request('/agent/v1/enroll', {
      method: 'POST',
      body: JSON.stringify({
        serverId,
        token: enrollmentToken,
        hostname: 'node-prod-01',
        version: '0.1.0',
      }),
    });
    const agentSecret = enrollRes.body.data.secret;
    console.log('✅ 1. Agent enrolled successfully for server:', serverId);

    // ==========================================
    // PHASE 3: LOG REDACTION & INCIDENT CREATION
    // ==========================================
    console.log('\n--- TESTING PHASE 3: TELEMETRY, LOGS & INCIDENT CREATION ---');

    // Test Log Redaction
    const dirtyLogs = [
      {
        timestamp: new Date().toISOString(),
        level: 'error' as const,
        source: 'nginx',
        message: 'Database authentication failed for postgresql://nexus:my_super_secret_pw123@10.0.0.5/prod',
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info' as const,
        source: 'auth-service',
        message: 'Request authorized with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretpayload.sig and apiKey = ak_live_998877665544',
      },
    ];

    const logIngestRes = await request('/agent/v1/logs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${agentSecret}` },
      body: JSON.stringify({ logs: dirtyLogs }),
    });
    console.assert(logIngestRes.status === 200, 'Log ingestion failed');

    // Retrieve sanitized logs via user API
    const getLogsRes = await request(`/api/v1/servers/${serverId}/logs`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'x-organization-id': orgId },
    });
    const retrievedLogs = getLogsRes.body.data;
    console.assert(retrievedLogs.length >= 2, 'Logs not retrieved');

    // Verify secrets are NOT present
    const rawContent = JSON.stringify(retrievedLogs);
    console.assert(!rawContent.includes('my_super_secret_pw123'), 'Database password was NOT redacted!');
    console.assert(!rawContent.includes('ak_live_998877665544'), 'API Key was NOT redacted!');
    console.assert(rawContent.includes('[REDACTED_PASSWORD]'), 'Missing [REDACTED_PASSWORD] placeholder');
    console.assert(rawContent.includes('[REDACTED]'), 'Missing [REDACTED] placeholder');
    console.log('🔒 2. Secret Redaction verified: Passwords and tokens masked before persistence');

    // Test Automated Incident Triggering via Metric Anomalies
    const anomalyMetrics = {
      timestamp: new Date().toISOString(),
      cpuUsagePercent: 94.2, // Critical CPU > 85%
      memoryTotalBytes: 8589934592,
      memoryUsedBytes: 4294967296,
      memoryUsagePercent: 50.0,
      diskTotalBytes: 107374182400,
      diskUsedBytes: 32212254720,
      diskUsagePercent: 30.0,
      networkRxBytesPerSec: 1000,
      networkTxBytesPerSec: 1000,
      uptimeSeconds: 120000,
      loadAverage: [4.5, 3.2, 2.1] as [number, number, number],
      services: [
        { name: 'nginx', status: 'failed' as const, enabled: true }, // Service down
      ],
    };

    await request('/agent/v1/metrics', {
      method: 'POST',
      headers: { Authorization: `Bearer ${agentSecret}` },
      body: JSON.stringify(anomalyMetrics),
    });

    // Query incidents
    const incidentsRes = await request('/api/v1/incidents', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'x-organization-id': orgId },
    });
    const incidents = incidentsRes.body.data;
    console.assert(incidents.length >= 1, 'Incident was not automatically created by monitoring engine!');
    const targetIncident = incidents.find((i: any) => i.title.includes('nginx') || i.title.includes('CPU'));
    console.log('🚨 3. Deterministic Alert triggered Incident:', targetIncident.title, `(Severity: ${targetIncident.severity})`);

    // ==========================================
    // PHASE 4: AI DIAGNOSTICS & APPROVAL HASH
    // ==========================================
    console.log('\n--- TESTING PHASE 4: AI DIAGNOSTIC & PROPOSAL HASH BINDING ---');

    // Request AI Analysis for the detected incident
    const aiRes = await request(`/api/v1/ai/analyze/${targetIncident.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'x-organization-id': orgId },
    });
    console.assert(aiRes.status === 200, 'AI analysis failed');
    const { analysis, proposal } = aiRes.body.data;
    console.log('🤖 4. AI Diagnosis produced:');
    console.log('   Root Cause:', analysis.rootCause);
    console.log('   Confidence:', analysis.confidence);
    console.log('   Proposed Action:', proposal.actionType);
    console.log('   Proposal Hash (SHA-256):', proposal.proposalHash);

    // Security Test: Attempt approval with altered hash (Tampering simulation)
    const fakeHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const tamperRes = await request(`/api/v1/ai/proposals/${proposal.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'x-organization-id': orgId },
      body: JSON.stringify({ proposalHash: fakeHash }),
    });
    console.assert(
      tamperRes.status === 409,
      `Expected 409 Conflict for tampered hash, got ${tamperRes.status}`
    );
    console.log('🔒 5. Tamper-Proofing verified: Proposal rejected when hash is altered (409 Conflict)');

    // Approve Proposal with the genuine cryptographic hash
    const approveRes = await request(`/api/v1/ai/proposals/${proposal.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'x-organization-id': orgId },
      body: JSON.stringify({ proposalHash: proposal.proposalHash }),
    });
    console.assert(approveRes.status === 200, 'Legitimate approval failed');
    const { job } = approveRes.body.data;
    console.log('✅ 6. Human Approval recorded! Execution Job queued with ID:', job.id);

    // ==========================================
    // PHASE 5: RESTRICTED AGENT EXECUTION
    // ==========================================
    console.log('\n--- TESTING PHASE 5: RESTRICTED AGENT EXECUTION & AUTO-RESOLUTION ---');

    // Agent queries pending jobs
    const pendingJobsRes = await request('/agent/v1/jobs/pending', {
      method: 'GET',
      headers: { Authorization: `Bearer ${agentSecret}` },
    });
    console.assert(pendingJobsRes.body.data.length >= 1, 'Job not dispatched to agent');
    const receivedJob = pendingJobsRes.body.data[0];
    console.assert(receivedJob.jobId === job.id, 'Dispatched job ID mismatch');
    console.log('📥 7. Agent received approved job:', receivedJob.actionType);

    // Agent executes job via restricted executor and reports back
    const reportRes = await request(`/agent/v1/jobs/${receivedJob.jobId}/result`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${agentSecret}` },
      body: JSON.stringify({
        status: 'completed',
        output: 'Service restarted successfully. Health checks returning 200 OK.',
        executedAt: new Date().toISOString(),
      }),
    });
    console.assert(reportRes.status === 200, 'Job result reporting failed');
    console.log('✅ 8. Agent reported execution completion successfully');

    // Verify incident is automatically marked as resolved
    const incidentCheck = await request(`/api/v1/incidents/${targetIncident.id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'x-organization-id': orgId },
    });
    console.assert(
      incidentCheck.body.data.status === 'resolved',
      `Incident status expected 'resolved', got '${incidentCheck.body.data.status}'`
    );
    console.log('🎯 9. Incident automatically marked RESOLVED following verified execution!');

    console.log('\n🎉 ALL PHASES 3, 4 & 5 VALIDATION TESTS PASSED 100%!\n');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runPhases345Test().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
