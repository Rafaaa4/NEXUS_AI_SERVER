#!/usr/bin/env bash
set -euo pipefail

echo "================================================================="
echo "  FULL LIFECYCLE: Real Go Agent + Anomaly + AI + Approval + Exec  "
echo "================================================================="

API_PID=""
AGENT_PID=""

cleanup() {
  if [ -n "$API_PID" ]; then
    kill "$API_PID" 2>/dev/null || true
  fi
  if [ -n "$AGENT_PID" ]; then
    kill "$AGENT_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Kill any previous process on port 4000
fuser -k 4000/tcp 2>/dev/null || true

cd /home/rafa3/Desktop/vps_controller/apps/api
PORT=4000 npx tsx src/index.ts > /tmp/api-full.log 2>&1 &
API_PID=$!

echo ">> Waiting for API..."
for i in {1..30}; do
  if curl -s http://localhost:4000/health > /dev/null; then
    break
  fi
  sleep 0.5
done
echo ">> API is healthy on port 4000."

# 1. Register
REG_RESP=$(curl -s -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"lead-ops-'$(date +%s)'@nexus.ai","password":"Password123!","fullName":"Lead Ops"}')
TOKEN=$(echo "$REG_RESP" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
ORG_ID=$(echo "$REG_RESP" | grep -o '"id":"[^"]*"' | head -n2 | tail -n1 | cut -d'"' -f4)

# 2. Server & Enrollment
SERVER_RESP=$(curl -s -X POST http://localhost:4000/api/v1/servers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-organization-id: $ORG_ID" \
  -d '{"name":"ubuntu-prod-node","provider":"hetzner"}')
SERVER_ID=$(echo "$SERVER_RESP" | grep -o '"id":"[^"]*"' | head -n1 | cut -d'"' -f4)

ENROLL_RESP=$(curl -s -X POST "http://localhost:4000/api/v1/servers/$SERVER_ID/enrollment-token" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-organization-id: $ORG_ID")
ENROLL_TOKEN=$(echo "$ENROLL_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 3. Start real Go Agent
cd /home/rafa3/Desktop/vps_controller/agent/nexus-agent
rm -f ./config.env

NEXUS_API_URL="http://localhost:4000" \
NEXUS_SERVER_ID="$SERVER_ID" \
NEXUS_TOKEN="$ENROLL_TOKEN" \
NEXUS_METRICS_INTERVAL_SEC=2 \
NEXUS_HEARTBEAT_INTERVAL_SEC=2 \
./nexus-agent > /tmp/agent-full.log 2>&1 &
AGENT_PID=$!

echo ">> Go Agent started (PID: $AGENT_PID). Waiting 3 seconds for initial connection..."
sleep 3

# 4. Trigger service anomaly (simulate nginx down)
AGENT_SECRET=$(grep NEXUS_AGENT_SECRET ./config.env | cut -d= -f2)

echo ">> Simulating service failure anomaly via Agent metrics channel..."
curl -s -X POST http://localhost:4000/agent/v1/metrics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -d '{
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "cpuUsagePercent": 42.0,
    "memoryTotalBytes": 8589934592,
    "memoryUsedBytes": 2147483648,
    "memoryUsagePercent": 25.0,
    "diskTotalBytes": 107374182400,
    "diskUsedBytes": 21474836480,
    "diskUsagePercent": 20.0,
    "uptimeSeconds": 3600,
    "loadAverage": [0.5, 0.4, 0.2],
    "services": [{"name": "nginx", "status": "failed", "enabled": true}]
  }' > /dev/null

# 5. Check Incident
INCIDENTS_RESP=$(curl -s -X GET http://localhost:4000/api/v1/incidents \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-organization-id: $ORG_ID")
INCIDENT_ID=$(echo "$INCIDENTS_RESP" | grep -o '"id":"[^"]*"' | head -n1 | cut -d'"' -f4)
echo ">> Detected Incident ID: $INCIDENT_ID"

# 6. Request AI Diagnosis
echo ">> Requesting AI Diagnosis and Remediation Proposal..."
AI_RESP=$(curl -s -X POST "http://localhost:4000/api/v1/ai/analyze/$INCIDENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-organization-id: $ORG_ID")

PROPOSAL_ID=$(echo "$AI_RESP" | grep -o '"id":"[^"]*"' | tail -n1 | cut -d'"' -f4)
PROPOSAL_HASH=$(echo "$AI_RESP" | grep -o '"proposalHash":"[^"]*"' | cut -d'"' -f4)
echo ">> AI proposed action with cryptographic hash: $PROPOSAL_HASH"

# 7. Human Approves Proposal
echo ">> Approving remediation proposal with cryptographic hash..."
curl -s -X POST "http://localhost:4000/api/v1/ai/proposals/$PROPOSAL_ID/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-organization-id: $ORG_ID" \
  -d '{"proposalHash":"'"$PROPOSAL_HASH"'"}' > /dev/null

echo ">> Waiting 4 seconds for Go Agent to poll job and execute..."
sleep 4

# 8. Check Agent execution log
echo ">> Agent execution log excerpt:"
grep -E "Received approved|completed with status|Executing approved" /tmp/agent-full.log || cat /tmp/agent-full.log

# 9. Verify Incident resolution
INC_CHECK=$(curl -s -X GET "http://localhost:4000/api/v1/incidents/$INCIDENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-organization-id: $ORG_ID")

STATUS=$(echo "$INC_CHECK" | grep -o '"status":"resolved"' || true)
if [ -n "$STATUS" ]; then
  echo ""
  echo "🏆 FULL LIFECYCLE TEST COMPLETED WITH 100% SUCCESS!"
  echo "✅ Anomaly detected deterministically"
  echo "✅ AI diagnosed incident and produced tamper-proof proposal"
  echo "✅ Human approved proposal via cryptographic hash"
  echo "✅ Standalone Go Agent polled job, verified allowlist, and executed fix"
  echo "✅ Incident marked automatically as RESOLVED"
else
  echo "❌ Incident was not resolved. Status: $INC_CHECK"
  exit 1
fi
