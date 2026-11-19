-- CreateEnum
CREATE TYPE "Role" AS ENUM ('owner', 'admin', 'operator', 'viewer');

-- CreateEnum
CREATE TYPE "ServerStatus" AS ENUM ('pending', 'online', 'offline', 'error');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('offline', 'online', 'degraded');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('open', 'investigating', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "ProposalRiskLevel" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('pending', 'approved', 'rejected', 'executed', 'failed', 'expired');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('approved', 'rejected');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('free', 'pro', 'enterprise');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" VARCHAR(150),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'viewer',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("organization_id","user_id")
);

-- CreateTable
CREATE TABLE "servers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "hostname" VARCHAR(255),
    "provider" VARCHAR(100),
    "os_name" VARCHAR(100),
    "os_version" VARCHAR(100),
    "architecture" VARCHAR(50),
    "status" "ServerStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "server_id" UUID NOT NULL,
    "version" VARCHAR(50),
    "public_key" TEXT,
    "secret_hash" TEXT,
    "status" "AgentStatus" NOT NULL DEFAULT 'offline',
    "last_seen_at" TIMESTAMPTZ,
    "enrolled_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_enrollment_tokens" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "server_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_enrollment_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "server_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'open',
    "detected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "incident_id" UUID NOT NULL,
    "model_name" VARCHAR(100),
    "root_cause" TEXT,
    "confidence" DECIMAL(5,4),
    "recommendations" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_proposals" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "server_id" UUID NOT NULL,
    "analysis_id" UUID,
    "action_type" VARCHAR(100) NOT NULL,
    "parameters" JSONB NOT NULL,
    "risk_level" "ProposalRiskLevel" NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'pending',
    "proposal_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "proposal_id" UUID NOT NULL,
    "approved_by" UUID,
    "decision" "ApprovalDecision" NOT NULL,
    "proposal_hash" TEXT NOT NULL,
    "decided_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "server_id" UUID NOT NULL,
    "proposal_id" UUID,
    "job_type" VARCHAR(100) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'queued',
    "idempotency_key" TEXT,
    "result" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "actor_id" UUID,
    "action" VARCHAR(150) NOT NULL,
    "resource_type" VARCHAR(100),
    "resource_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "plan" "PlanTier" NOT NULL DEFAULT 'free',
    "server_limit" INTEGER NOT NULL DEFAULT 2,
    "ai_requests_limit" INTEGER NOT NULL DEFAULT 50,
    "status" TEXT NOT NULL DEFAULT 'active',
    "current_period_end" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "server_id" UUID NOT NULL,
    "app_name" VARCHAR(150) NOT NULL,
    "repository_url" TEXT,
    "branch" VARCHAR(100) DEFAULT 'main',
    "commit_sha" VARCHAR(100),
    "environment" VARCHAR(50) NOT NULL DEFAULT 'production',
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "deploy_config" JSONB,
    "logs" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "servers_organization_id_idx" ON "servers"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "servers_organization_id_id_key" ON "servers"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "agents_server_id_key" ON "agents"("server_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_enrollment_tokens_token_hash_key" ON "agent_enrollment_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "agent_enrollment_tokens_organization_id_server_id_idx" ON "agent_enrollment_tokens"("organization_id", "server_id");

-- CreateIndex
CREATE INDEX "incidents_organization_id_detected_at_idx" ON "incidents"("organization_id", "detected_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "jobs_idempotency_key_key" ON "jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "jobs_status_created_at_idx" ON "jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organization_id_key" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE INDEX "deployments_organization_id_created_at_idx" ON "deployments"("organization_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servers" ADD CONSTRAINT "servers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_enrollment_tokens" ADD CONSTRAINT "agent_enrollment_tokens_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_enrollment_tokens" ADD CONSTRAINT "agent_enrollment_tokens_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_proposals" ADD CONSTRAINT "action_proposals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_proposals" ADD CONSTRAINT "action_proposals_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_proposals" ADD CONSTRAINT "action_proposals_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "ai_analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "action_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "action_proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Seed Initial User, Organization, Subscription, Servers, and Agents
INSERT INTO "users" ("id", "email", "password_hash", "full_name", "email_verified", "created_at")
VALUES ('370086cd-e4cc-4ed3-93b0-b35f7cb3cd11', 'rafaaselmi6@gmail.com', '$2a$12$VwhEMtt.qhqWYV1bnb94nuXOPStY7RXY5I9AA7J3dBj4bPslNjkJ.', 'rafaa', true, NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "organizations" ("id", "name", "slug", "created_at")
VALUES ('1ab47797-365b-45a8-80aa-4692d020134f', 'rafaa''s Org', 'rafaa-org', NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "memberships" ("organization_id", "user_id", "role", "created_at")
VALUES ('1ab47797-365b-45a8-80aa-4692d020134f', '370086cd-e4cc-4ed3-93b0-b35f7cb3cd11', 'owner', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO "subscriptions" ("id", "organization_id", "plan", "server_limit", "status", "created_at")
VALUES ('7b123456-e4cc-4ed3-93b0-b35f7cb3cd11', '1ab47797-365b-45a8-80aa-4692d020134f', 'enterprise', 100, 'active', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO "servers" ("id", "organization_id", "name", "hostname", "provider", "os_name", "os_version", "architecture", "status", "created_at")
VALUES 
('2c425709-e204-49ed-8e71-9a725135ec21', '1ab47797-365b-45a8-80aa-4692d020134f', 'rafaa', '192.168.1.228', 'generic-linux', 'Ubuntu', '22.04', 'x86_64', 'online', NOW()),
('292bbf77-7b94-433e-85a9-81aa4f10b091', '1ab47797-365b-45a8-80aa-4692d020134f', 'test', '192.168.0.130', 'generic-linux', 'Ubuntu', '22.04', 'x86_64', 'online', NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "agents" ("id", "organization_id", "server_id", "version", "secret_hash", "status", "last_seen_at", "enrolled_at")
VALUES 
('42e0204f-c8ac-4d3a-9d8c-8ccdbf0a8e25', '1ab47797-365b-45a8-80aa-4692d020134f', '2c425709-e204-49ed-8e71-9a725135ec21', '0.1.0', '6788b454b96a9f229181fc084b04d734fde143d950498f9c8c292a3e61a2f2b3', 'online', NOW(), NOW()),
('b6727289-4089-42b7-a8b2-5f6534e34e56', '1ab47797-365b-45a8-80aa-4692d020134f', '292bbf77-7b94-433e-85a9-81aa4f10b091', '0.1.0', '6788b454b96a9f229181fc084b04d734fde143d950498f9c8c292a3e61a2f2b3', 'online', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- CreateTable
CREATE TABLE IF NOT EXISTS "managed_databases" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "server_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "db_type" VARCHAR(50) NOT NULL,
    "version" VARCHAR(50),
    "port" INTEGER NOT NULL,
    "username" VARCHAR(100),
    "password" VARCHAR(255),
    "container_name" VARCHAR(150),
    "status" VARCHAR(30) NOT NULL DEFAULT 'running',
    "storage_used" VARCHAR(50) DEFAULT '12 MB',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
