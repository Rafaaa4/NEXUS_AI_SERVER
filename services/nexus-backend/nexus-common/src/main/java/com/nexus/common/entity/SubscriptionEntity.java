package com.nexus.common.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "subscriptions")
public class SubscriptionEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id = UUID.randomUUID();

    @Column(name = "organization_id", nullable = false, unique = true)
    private UUID organizationId;

    @Column(name = "plan", nullable = false)
    private String plan = "free";

    @Column(name = "server_limit", nullable = false)
    private int serverLimit = 2;

    @Column(name = "ai_requests_limit", nullable = false)
    private int aiRequestsLimit = 50;

    @Column(name = "status", nullable = false)
    private String status = "active";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public SubscriptionEntity() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getOrganizationId() { return organizationId; }
    public void setOrganizationId(UUID organizationId) { this.organizationId = organizationId; }

    public String getPlan() { return plan; }
    public void setPlan(String plan) { this.plan = plan; }

    public int getServerLimit() { return serverLimit; }
    public void setServerLimit(int serverLimit) { this.serverLimit = serverLimit; }

    public int getAiRequestsLimit() { return aiRequestsLimit; }
    public void setAiRequestsLimit(int aiRequestsLimit) { this.aiRequestsLimit = aiRequestsLimit; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
