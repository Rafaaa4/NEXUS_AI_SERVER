package com.nexus.rest.controller;

import com.nexus.common.entity.AgentEntity;
import com.nexus.common.entity.JobEntity;
import com.nexus.common.entity.ServerEntity;
import com.nexus.common.repository.AgentRepository;
import com.nexus.common.repository.JobRepository;
import com.nexus.common.repository.ServerRepository;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.time.OffsetDateTime;
import java.util.*;

@RestController
public class AgentApiController {

    private final AgentRepository agentRepository;
    private final ServerRepository serverRepository;
    private final JobRepository jobRepository;

    public AgentApiController(AgentRepository agentRepository,
                              ServerRepository serverRepository,
                              JobRepository jobRepository) {
        this.agentRepository = agentRepository;
        this.serverRepository = serverRepository;
        this.jobRepository = jobRepository;
    }

    @GetMapping(value = "/agent/nexus-agent", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<Resource> downloadAgentBinary() {
        File binary = new File("/app/bin/nexus-agent");
        if (!binary.exists()) {
            binary = new File("services/nexus-backend/nexus-rest-service/bin/nexus-agent");
        }
        if (!binary.exists()) {
            binary = new File("/home/rafa3/Desktop/vps_controller/agent/dist/nexus-agent");
        }
        if (!binary.exists()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"nexus-agent\"")
                .body(new FileSystemResource(binary));
    }

    @GetMapping(value = "/agent/bootstrap.sh", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> getBootstrapScript() {
        String script = """
        #!/usr/bin/env bash
        set -euo pipefail
        echo "=== NEXUS AI Agent Quick Installer ==="
        SERVER_ID=""
        while [[ "$#" -gt 0 ]]; do
            case $1 in
                --server-id) SERVER_ID="$2"; shift ;;
            esac
            shift
        done
        if [ -z "$SERVER_ID" ]; then
            echo "Error: Missing --server-id"
            exit 1
        fi
        HOST="${HOST:-127.0.0.1}"
        echo "Downloading agent binary..."
        curl -sSL "http://${HOST}:4000/agent/nexus-agent" -o /tmp/nexus-agent
        chmod +x /tmp/nexus-agent
        sudo mkdir -p /var/www /etc/nexus
        echo "Enrolling agent..."
        /tmp/nexus-agent --server-id "$SERVER_ID" --api-url "http://${HOST}:4000" &
        echo "Agent started successfully!"
        """;
        return ResponseEntity.ok(script);
    }

    @GetMapping("/api/v1/jobs")
    public ResponseEntity<?> getPendingJobs(@RequestHeader(value = "x-server-id", required = false) String serverHeader) {
        if (serverHeader == null || serverHeader.isEmpty()) {
            return ResponseEntity.ok(Map.of("data", Collections.emptyList()));
        }
        UUID serverId = UUID.fromString(serverHeader);
        var jobs = jobRepository.findByOrganizationIdAndServerIdAndStatus(
                UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f"), serverId, "queued");
        return ResponseEntity.ok(Map.of("data", jobs));
    }

    @PostMapping("/api/v1/jobs/{id}/result")
    public ResponseEntity<?> reportJobResult(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        jobRepository.findById(id).ifPresent(job -> {
            job.setStatus(body.getOrDefault("status", "completed").toString());
            job.setFinishedAt(OffsetDateTime.now());
            jobRepository.save(job);
        });
        return ResponseEntity.ok(Map.of("data", Map.of("success", true)));
    }

    @PostMapping("/api/v1/agent/heartbeat")
    public ResponseEntity<?> heartbeat(@RequestHeader(value = "x-server-id", required = false) String serverHeader) {
        if (serverHeader != null && !serverHeader.isEmpty()) {
            UUID serverId = UUID.fromString(serverHeader);
            agentRepository.findByServerId(serverId).ifPresent(agent -> {
                agent.setStatus("online");
                agent.setLastSeenAt(OffsetDateTime.now());
                agentRepository.save(agent);
            });
            serverRepository.findById(serverId).ifPresent(s -> {
                s.setStatus("online");
                serverRepository.save(s);
            });
        }
        return ResponseEntity.ok(Map.of("data", Map.of("status", "healthy")));
    }
}
