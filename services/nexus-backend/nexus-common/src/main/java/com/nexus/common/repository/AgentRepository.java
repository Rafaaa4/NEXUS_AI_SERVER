package com.nexus.common.repository;

import com.nexus.common.entity.AgentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgentRepository extends JpaRepository<AgentEntity, UUID> {
    Optional<AgentEntity> findByServerId(UUID serverId);
    List<AgentEntity> findByOrganizationId(UUID organizationId);
}
