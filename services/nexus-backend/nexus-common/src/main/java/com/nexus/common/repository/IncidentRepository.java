package com.nexus.common.repository;

import com.nexus.common.entity.IncidentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface IncidentRepository extends JpaRepository<IncidentEntity, UUID> {
    List<IncidentEntity> findByOrganizationIdOrderByDetectedAtDesc(UUID organizationId);
}
