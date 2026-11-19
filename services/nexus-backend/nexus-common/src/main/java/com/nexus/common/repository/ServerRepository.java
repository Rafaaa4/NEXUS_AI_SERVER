package com.nexus.common.repository;

import com.nexus.common.entity.ServerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ServerRepository extends JpaRepository<ServerEntity, UUID> {
    List<ServerEntity> findByOrganizationId(UUID organizationId);
    Optional<ServerEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);
    long countByOrganizationId(UUID organizationId);
}
