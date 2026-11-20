package com.nexus.common.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "deployments")
public class DeploymentEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id = UUID.randomUUID();

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "server_id", nullable = false)
    private UUID serverId;

    @Column(name = "app_name", nullable = false, length = 150)
    private String appName;

    @Column(name = "repository_url")
    private String repositoryUrl;

    @Column(name = "branch", length = 100)
    private String branch = "main";

    @Column(name = "commit_sha", length = 100)
    private String commitSha;

    @Column(name = "environment", nullable = false, length = 50)
    private String environment = "production";

    @Column(name = "status", nullable = false, length = 30)
    private String status = "pending";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "deploy_config", columnDefinition = "jsonb")
    private String deployConfig;

    @Column(name = "logs", columnDefinition = "text")
    private String logs;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public DeploymentEntity() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getOrganizationId() { return organizationId; }
    public void setOrganizationId(UUID organizationId) { this.organizationId = organizationId; }

    public UUID getServerId() { return serverId; }
    public void setServerId(UUID serverId) { this.serverId = serverId; }

    public String getAppName() { return appName; }
    public void setAppName(String appName) { this.appName = appName; }

    public String getRepositoryUrl() { return repositoryUrl; }
    public void setRepositoryUrl(String repositoryUrl) { this.repositoryUrl = repositoryUrl; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public String getCommitSha() { return commitSha; }
    public void setCommitSha(String commitSha) { this.commitSha = commitSha; }

    public String getEnvironment() { return environment; }
    public void setEnvironment(String environment) { this.environment = environment; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDeployConfig() { return deployConfig; }
    public void setDeployConfig(String deployConfig) { this.deployConfig = deployConfig; }

    public String getLogs() { return logs; }
    public void setLogs(String logs) { this.logs = logs; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
