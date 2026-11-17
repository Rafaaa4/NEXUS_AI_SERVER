#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo "  LIVE TEST: Real Go Agent + NEXUS Express API    "
echo "=================================================="

# Start API in background
cd /home/rafa3/Desktop/vps_controller/apps/api
PORT=4000 npx tsx src/index.ts > /tmp/api-live.log 2>&1 &
API_PID=$!

cleanup() {
  echo "Cleaning up..."
  kill $API_PID 2>/dev/null || true
  kill $AGENT_PID 2>/dev/null || true
}
trap cleanup EXIT

echo ">> Waiting for API to become ready..."
for i in {1..30}; do
  if curl -s http://localhost:4000/health > /dev/null; then
    echo ">> API is healthy on http://localhost:4000"
    break
  fi
  sleep 0.5
done

# Step 1: Register User & Org
echo ">> Step 1: Registering user & tenant org..."
REG_RESP=$(curl -s -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"dev-vps@nexus.ai","password":"Password123!","fullName":"Dev DevOps"}')

TOKEN=$(echo "$REG_RESP" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
ORG_ID=$(echo "$REG_RESP" | grep -o '"id":"[^"]*"' | head -n2 | tail -n1 | cut -d'"' -f4)

echo ">> Access Token received, Org ID: $ORG_ID"

# Step 2: Create Server Record
echo ">> Step 2: Creating VPS server record..."
SERVER_RESP=$(curl -s -X POST http://localhost:4000/api/v1/servers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-organization-id: $ORG_ID" \
  -d '{"name":"ubuntu-live-node","provider":"custom-vps","hostname":"vps-node-1"}')

SERVER_ID=$(echo "$SERVER_RESP" | grep -o '"id":"[^"]*"' | head -n1 | cut -d'"' -f4)
echo ">> Server created with ID: $SERVER_ID"

# Step 3: Generate One-Time Enrollment Token
echo ">> Step 3: Generating enrollment token..."
ENROLL_RESP=$(curl -s -X POST "http://localhost:4000/api/v1/servers/$SERVER_ID/enrollment-token" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-organization-id: $ORG_ID")

ENROLL_TOKEN=$(echo "$ENROLL_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo ">> Enrollment token: $ENROLL_TOKEN"

# Step 4: Run Go Agent with token and server ID
echo ">> Step 4: Launching Go Agent binary..."
cd /home/rafa3/Desktop/vps_controller/agent/nexus-agent
rm -f ./config.env

NEXUS_API_URL="http://localhost:4000" \
NEXUS_SERVER_ID="$SERVER_ID" \
NEXUS_TOKEN="$ENROLL_TOKEN" \
NEXUS_METRICS_INTERVAL_SEC=2 \
NEXUS_HEARTBEAT_INTERVAL_SEC=3 \
./nexus-agent > /tmp/agent-live.log 2>&1 &
AGENT_PID=$!

echo ">> Agent started (PID: $AGENT_PID). Waiting 6 seconds for initial enroll, heartbeat, and metrics collection..."
sleep 6

# Step 5: Check Agent Logs
echo ">> Step 5: Agent execution log:"
cat /tmp/agent-live.log

# Step 6: Verify Server & Agent state in API
echo ">> Step 6: Querying Server state via API..."
SERVER_STATUS_RESP=$(curl -s -X GET "http://localhost:4000/api/v1/servers/$SERVER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-organization-id: $ORG_ID")

echo "$SERVER_STATUS_RESP"

STATUS=$(echo "$SERVER_STATUS_RESP" | grep -o '"status":"online"' || true)
if [ -n "$STATUS" ]; then
  echo ""
  echo "🎯 MILESTONE 1 VERIFICATION SUCCESSFUL!"
  echo "✅ Server enrolled securely"
  echo "✅ Go Agent running and sending live metrics"
  echo "✅ Platform reports server status ONLINE"
else
  echo "❌ Verification failed. Server is not online."
  exit 1
fi
