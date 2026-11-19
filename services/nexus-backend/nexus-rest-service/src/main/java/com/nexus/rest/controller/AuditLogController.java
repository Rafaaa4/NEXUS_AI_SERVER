package com.nexus.rest.controller;

import com.nexus.common.entity.AuditLogEntity;
import com.nexus.common.entity.UserEntity;
import com.nexus.common.repository.AuditLogRepository;
import com.nexus.common.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/audit-logs")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public AuditLogController(AuditLogRepository auditLogRepository, UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> listAuditLogs(
            @RequestParam(defaultValue = "50") int limit,
            @RequestHeader(value = "x-organization-id", required = false) String orgHeader) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty()
                ? UUID.fromString(orgHeader)
                : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");

        List<AuditLogEntity> logs = auditLogRepository.findByOrganizationIdOrderByCreatedAtDesc(
                orgId, PageRequest.of(0, Math.min(limit, 100)));

        Map<UUID, UserEntity> userCache = new HashMap<>();

        List<Map<String, Object>> response = logs.stream().<Map<String, Object>>map(log -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", log.getId());
            map.put("action", log.getAction());
            map.put("resourceType", log.getResourceType());
            map.put("resourceId", log.getResourceId());
            map.put("metadata", log.getMetadata());
            map.put("createdAt", log.getCreatedAt().toString());

            if (log.getActorId() != null) {
                UserEntity user = userCache.computeIfAbsent(log.getActorId(),
                        id -> userRepository.findById(id).orElse(null));
                if (user != null) {
                    map.put("actor", Map.of("email", user.getEmail(), "fullName", user.getFullName()));
                } else {
                    map.put("actor", null);
                }
            } else {
                map.put("actor", null);
            }
            return map;
        }).toList();

        return ResponseEntity.ok(Map.of("success", true, "data", response));
    }
}
