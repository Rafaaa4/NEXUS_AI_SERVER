package com.nexus.common.repository;

import com.nexus.common.entity.DeploymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeploymentRepository extends JpaRepository<DeploymentEntity, UUID> {
    List<DeploymentEntity> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);
    List<DeploymentEntity> findByServerId(UUID serverId);
    Optional<DeploymentEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
