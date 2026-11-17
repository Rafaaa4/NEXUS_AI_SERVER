# NEXUS AI — VPS & Server Management SaaS

AI-powered Linux VPS management SaaS platform with secure agent-to-platform communication, deterministic telemetry collection, and human-in-the-loop AI remediation.

---

## 🏗️ Architecture

```
nexus-ai/
├── apps/
│   ├── api/            # Express + TypeScript Modular Monolith API
│   └── dashboard/      # React 18 + Vite + TailwindCSS UI Dashboard
├── agent/
│   └── nexus-agent/    # Go Standalone Agent for Linux VPS
├── packages/
│   └── shared-types/   # Shared TypeScript definitions & contracts
├── docker-compose.yml  # PostgreSQL 16 & Redis
└── plan.md             # Complete Technical Architecture Blueprint
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js >= 18
- Go >= 1.22
- PostgreSQL 16+ & Redis (or Docker Compose)

### 2. Start Database & Queues
```bash
docker compose up -d
```

### 3. Initialize Backend API
```bash
cd apps/api
npm install
npx prisma db push
npm run dev
# API running on http://localhost:4000
```

### 4. Run Automated E2E Tests
```bash
cd apps/api
npx tsx test/e2e-phase1.ts
```

### 5. Build & Run Go Agent
```bash
cd agent/nexus-agent
go build -o nexus-agent cmd/nexus-agent/main.go
# Run live integration test:
cd ../..
./agent/test-live-agent.sh
```

### 6. Start Dashboard UI
```bash
cd apps/dashboard
npm run dev
# Dashboard running on http://localhost:3000
```

---

## 🔒 Security Principles
- **Strict Multi-Tenant Scoping:** All resources are strictly bound to `organization_id`. Cross-tenant queries are rejected at API and DB layers.
- **One-Time Enrollment Tokens:** Cryptographically signed tokens that expire after 15 minutes and can only be used once.
- **Zero Unattended Remediation:** The AI engine may only propose actions (`action_proposals`), which require cryptographic verification and explicit human approval before execution.
