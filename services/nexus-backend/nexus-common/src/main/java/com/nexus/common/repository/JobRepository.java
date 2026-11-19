package com.nexus.common.repository;

import com.nexus.common.entity.JobEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobRepository extends JpaRepository<JobEntity, UUID> {
    List<JobEntity> findByOrganizationIdAndServerIdAndStatus(UUID organizationId, UUID serverId, String status);
    Optional<JobEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
