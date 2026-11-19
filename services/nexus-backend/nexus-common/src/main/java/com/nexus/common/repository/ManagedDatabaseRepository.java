package com.nexus.common.repository;

import com.nexus.common.entity.ManagedDatabaseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ManagedDatabaseRepository extends JpaRepository<ManagedDatabaseEntity, UUID> {
    List<ManagedDatabaseEntity> findByOrganizationIdAndServerId(UUID organizationId, UUID serverId);
    List<ManagedDatabaseEntity> findByOrganizationId(UUID organizationId);
    Optional<ManagedDatabaseEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
