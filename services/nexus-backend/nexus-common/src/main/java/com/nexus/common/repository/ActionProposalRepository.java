package com.nexus.common.repository;

import com.nexus.common.entity.ActionProposalEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ActionProposalRepository extends JpaRepository<ActionProposalEntity, UUID> {
    List<ActionProposalEntity> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);
    List<ActionProposalEntity> findByOrganizationIdAndStatusOrderByCreatedAtDesc(UUID organizationId, String status);
}
