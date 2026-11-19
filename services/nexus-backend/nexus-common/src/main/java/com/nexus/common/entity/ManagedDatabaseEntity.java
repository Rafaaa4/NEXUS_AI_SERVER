package com.nexus.common.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "managed_databases")
public class ManagedDatabaseEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id = UUID.randomUUID();

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "server_id", nullable = false)
    private UUID serverId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "db_type", nullable = false, length = 50)
    private String dbType;

    @Column(name = "version", length = 50)
    private String version;

    @Column(name = "port", nullable = false)
    private int port;

    @Column(name = "username", length = 100)
    private String username;

    @Column(name = "password")
    private String password;

    @Column(name = "container_name", length = 150)
    private String containerName;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "running";

    @Column(name = "storage_used", length = 50)
    private String storageUsed = "12 MB";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public ManagedDatabaseEntity() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getOrganizationId() { return organizationId; }
    public void setOrganizationId(UUID organizationId) { this.organizationId = organizationId; }

    public UUID getServerId() { return serverId; }
    public void setServerId(UUID serverId) { this.serverId = serverId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDbType() { return dbType; }
    public void setDbType(String dbType) { this.dbType = dbType; }

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }

    public int getPort() { return port; }
    public void setPort(int port) { this.port = port; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getContainerName() { return containerName; }
    public void setContainerName(String containerName) { this.containerName = containerName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getStorageUsed() { return storageUsed; }
    public void setStorageUsed(String storageUsed) { this.storageUsed = storageUsed; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
