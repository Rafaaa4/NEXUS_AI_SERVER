package com.nexus.rest.controller;

import com.nexus.common.entity.IncidentEntity;
import com.nexus.common.entity.ServerEntity;
import com.nexus.common.repository.IncidentRepository;
import com.nexus.common.repository.ServerRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/incidents")
public class IncidentController {

    private final IncidentRepository incidentRepository;
    private final ServerRepository serverRepository;

    public IncidentController(IncidentRepository incidentRepository, ServerRepository serverRepository) {
        this.incidentRepository = incidentRepository;
        this.serverRepository = serverRepository;
    }

    @GetMapping
    public ResponseEntity<?> listIncidents(
            @RequestParam(required = false) String status,
            @RequestHeader(value = "x-organization-id", required = false) String orgHeader) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty()
                ? UUID.fromString(orgHeader)
                : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");

        List<IncidentEntity> incidents = incidentRepository.findByOrganizationIdOrderByDetectedAtDesc(orgId);
        if (status != null && !status.isEmpty()) {
            incidents = incidents.stream()
                    .filter(i -> status.equalsIgnoreCase(i.getStatus()))
                    .toList();
        }

        Map<UUID, ServerEntity> serverMap = new HashMap<>();
        serverRepository.findByOrganizationId(orgId).forEach(s -> serverMap.put(s.getId(), s));

        List<Map<String, Object>> responseData = incidents.stream().map(inc -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", inc.getId());
            map.put("organizationId", inc.getOrganizationId());
            map.put("serverId", inc.getServerId());
            map.put("title", inc.getTitle());
            map.put("description", inc.getDescription());
            map.put("severity", inc.getSeverity());
            map.put("status", inc.getStatus());
            map.put("detectedAt", inc.getDetectedAt() != null ? inc.getDetectedAt().toString() : null);
            map.put("resolvedAt", inc.getResolvedAt() != null ? inc.getResolvedAt().toString() : null);

            ServerEntity server = serverMap.get(inc.getServerId());
            if (server != null) {
                map.put("server", Map.of(
                        "name", server.getName(),
                        "hostname", server.getHostname() != null ? server.getHostname() : server.getName()
                ));
            }
            return map;
        }).toList();

        return ResponseEntity.ok(Map.of("success", true, "data", responseData));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getIncident(@PathVariable UUID id) {
        return incidentRepository.findById(id)
                .map(inc -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", inc.getId());
                    map.put("organizationId", inc.getOrganizationId());
                    map.put("serverId", inc.getServerId());
                    map.put("title", inc.getTitle());
                    map.put("description", inc.getDescription());
                    map.put("severity", inc.getSeverity());
                    map.put("status", inc.getStatus());
                    map.put("detectedAt", inc.getDetectedAt() != null ? inc.getDetectedAt().toString() : null);
                    map.put("resolvedAt", inc.getResolvedAt() != null ? inc.getResolvedAt().toString() : null);

                    serverRepository.findById(inc.getServerId()).ifPresent(server -> {
                        map.put("server", Map.of(
                                "name", server.getName(),
                                "hostname", server.getHostname() != null ? server.getHostname() : server.getName()
                        ));
                    });
                    return ResponseEntity.ok(Map.of("success", true, "data", map));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<?> resolveIncident(@PathVariable UUID id) {
        return incidentRepository.findById(id)
                .map(inc -> {
                    inc.setStatus("resolved");
                    inc.setResolvedAt(OffsetDateTime.now());
                    incidentRepository.save(inc);
                    return ResponseEntity.ok(Map.of("success", true, "data", inc));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
