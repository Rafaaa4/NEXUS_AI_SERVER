package com.nexus.common.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "memberships")
@IdClass(MembershipEntity.MembershipId.class)
public class MembershipEntity {

    @Id
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "role", nullable = false)
    private String role = "viewer";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public MembershipEntity() {}

    public MembershipEntity(UUID organizationId, UUID userId, String role) {
        this.organizationId = organizationId;
        this.userId = userId;
        this.role = role;
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getOrganizationId() { return organizationId; }
    public void setOrganizationId(UUID organizationId) { this.organizationId = organizationId; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public static class MembershipId implements Serializable {
        private UUID organizationId;
        private UUID userId;

        public MembershipId() {}
        public MembershipId(UUID organizationId, UUID userId) {
            this.organizationId = organizationId;
            this.userId = userId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            MembershipId that = (MembershipId) o;
            return Objects.equals(organizationId, that.organizationId) &&
                   Objects.equals(userId, that.userId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(organizationId, userId);
        }
    }
}
