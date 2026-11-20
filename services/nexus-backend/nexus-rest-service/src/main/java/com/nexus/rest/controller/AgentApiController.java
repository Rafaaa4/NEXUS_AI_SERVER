package com.nexus.rest.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexus.common.entity.AgentEntity;
import com.nexus.common.entity.JobEntity;
import com.nexus.common.entity.ServerEntity;
import com.nexus.common.repository.AgentRepository;
import com.nexus.common.repository.DeploymentRepository;
import com.nexus.common.repository.JobRepository;
import com.nexus.common.repository.ServerRepository;
import com.nexus.rest.service.ServerTelemetryService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.io.File;
import java.time.OffsetDateTime;
import java.util.*;

@RestController
public class AgentApiController {

    private final AgentRepository agentRepository;
    private final ServerRepository serverRepository;
    private final JobRepository jobRepository;
    private final DeploymentRepository deploymentRepository;
    private final ServerTelemetryService serverTelemetryService;
    private final ObjectMapper objectMapper;

    public AgentApiController(AgentRepository agentRepository,
                              ServerRepository serverRepository,
                              JobRepository jobRepository,
                              DeploymentRepository deploymentRepository,
                              ServerTelemetryService serverTelemetryService) {
        this.agentRepository = agentRepository;
        this.serverRepository = serverRepository;
        this.jobRepository = jobRepository;
        this.deploymentRepository = deploymentRepository;
        this.serverTelemetryService = serverTelemetryService;
        this.objectMapper = new ObjectMapper();
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
    public ResponseEntity<String> getBootstrapScript(HttpServletRequest request) {
        String reqHost = request.getHeader("Host");
        if (reqHost != null && reqHost.contains(":")) {
            reqHost = reqHost.substring(0, reqHost.indexOf(":"));
        }
        String defaultHost = (reqHost != null && !reqHost.isEmpty()) ? reqHost : "127.0.0.1";

        String script = String.format("""
        #!/usr/bin/env bash
        set -euo pipefail
        echo "============================================="
        echo "   NEXUS AI Node Agent Installer & Daemon   "
        echo "============================================="

        SERVER_ID=""
        HOST="${HOST:-%s}"
        PORT="${PORT:-4000}"

        while [[ "$#" -gt 0 ]]; do
            case $1 in
                --server-id) SERVER_ID="$2"; shift ;;
                --host) HOST="$2"; shift ;;
                --port) PORT="$2"; shift ;;
            esac
            shift
        done

        if [ -z "$SERVER_ID" ]; then
            echo "[ERROR] Missing required flag: --server-id <UUID>"
            exit 1
        fi

        echo "[1/4] Preparing directories (/etc/nexus, /var/www, /var/log/nexus)..."
        sudo mkdir -p /etc/nexus /var/www /var/log/nexus /opt/nexus /etc/nexus-agent
        sudo systemctl stop nexus-agent 2>/dev/null || true
        sudo pkill -9 nexus-agent 2>/dev/null || true
        sudo rm -f /etc/nexus-agent/config.env

        echo "[2/4] Downloading nexus-agent binary from http://${HOST}:${PORT}/agent/nexus-agent..."
        if ! curl -f -sSL "http://${HOST}:${PORT}/agent/nexus-agent" -o /tmp/nexus-agent; then
            echo "[ERROR] Failed to download agent binary. Make sure http://${HOST}:${PORT} is reachable from this machine."
            exit 1
        fi
        sudo mv /tmp/nexus-agent /opt/nexus/nexus-agent
        sudo chmod +x /opt/nexus/nexus-agent
        sudo cp -f /opt/nexus/nexus-agent /usr/local/bin/nexus-agent 2>/dev/null || true

        echo "[3/4] Creating systemd service configuration (/etc/systemd/system/nexus-agent.service)..."
        sudo tee /etc/systemd/system/nexus-agent.service > /dev/null <<EOF
        [Unit]
        Description=NEXUS AI Autonomous Linux Node Agent
        After=network.target

        [Service]
        Type=simple
        User=root
        ExecStart=/opt/nexus/nexus-agent --server-id ${SERVER_ID} --api-url http://${HOST}:${PORT}
        Restart=always
        RestartSec=5
        StandardOutput=journal
        StandardError=journal

        [Install]
        WantedBy=multi-user.target
        EOF

        echo "[4/4] Starting nexus-agent service via systemctl..."
        if command -v systemctl >/dev/null 2>&1; then
            sudo systemctl daemon-reload
            sudo systemctl enable nexus-agent.service
            sudo systemctl restart nexus-agent.service
            echo "[SUCCESS] nexus-agent is running as a systemd service!"
            systemctl status nexus-agent --no-pager || true
        else
            echo "[INFO] systemd not detected, launching background process..."
            sudo nohup /opt/nexus/nexus-agent --server-id "$SERVER_ID" --api-url "http://${HOST}:${PORT}" > /var/log/nexus/agent.log 2>&1 &
            echo "[SUCCESS] nexus-agent launched in background with PID: $!"
        fi

        echo "============================================="
        echo "Agent successfully enrolled! Check your Dashboard."
        echo "============================================="
        """, defaultHost);
        return ResponseEntity.ok(script);
    }

    @PostMapping(value = {"/agent/v1/enroll", "/api/v1/agent/enroll"})
    public ResponseEntity<?> enroll(@RequestBody Map<String, Object> body) {
        String serverIdStr = (String) body.get("serverId");
        if (serverIdStr == null || serverIdStr.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", Map.of("message", "serverId is required")));
        }
        UUID serverId = UUID.fromString(serverIdStr);
        String secret = UUID.randomUUID().toString().replace("-", "");

        AgentEntity agent = agentRepository.findByServerId(serverId).orElseGet(() -> {
            AgentEntity a = new AgentEntity();
            a.setServerId(serverId);
            a.setOrganizationId(UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f"));
            return a;
        });

        agent.setVersion(body.getOrDefault("version", "0.1.0").toString());
        agent.setSecretHash(secret);
        agent.setStatus("online");
        agent.setLastSeenAt(OffsetDateTime.now());
        agentRepository.save(agent);

        serverRepository.findById(serverId).ifPresent(s -> {
            s.setStatus("online");
            serverRepository.save(s);
        });

        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", Map.of(
                "agentId", agent.getId().toString(),
                "serverId", serverId.toString(),
                "secret", secret
            )
        ));
    }

    @GetMapping(value = {"/agent/v1/jobs/pending", "/api/v1/jobs", "/api/v1/jobs/pending"})
    public ResponseEntity<?> getPendingJobs(@RequestHeader(value = "x-server-id", required = false) String serverHeader) {
        if (serverHeader == null || serverHeader.isEmpty()) {
            return ResponseEntity.ok(Map.of("success", true, "data", Collections.emptyList()));
        }
        UUID serverId;
        try {
            serverId = UUID.fromString(serverHeader);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", true, "data", Collections.emptyList()));
        }

        var jobs = jobRepository.findByOrganizationIdAndServerIdAndStatus(
                UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f"), serverId, "queued");

        List<Map<String, Object>> formatted = new ArrayList<>();
        for (JobEntity job : jobs) {
            Map<String, Object> map = new HashMap<>();
            map.put("jobId", job.getId().toString());
            map.put("id", job.getId().toString());
            map.put("serverId", job.getServerId().toString());
            map.put("actionType", job.getJobType());
            map.put("jobType", job.getJobType());
            map.put("status", job.getStatus());
            map.put("idempotencyKey", job.getIdempotencyKey());

            if (job.getParameters() != null && !job.getParameters().isEmpty()) {
                try {
                    map.put("parameters", objectMapper.readValue(job.getParameters(), Map.class));
                } catch (Exception e) {
                    map.put("parameters", Map.of());
                }
            } else {
                map.put("parameters", Map.of());
            }
            formatted.add(map);
        }

        return ResponseEntity.ok(Map.of("success", true, "data", formatted));
    }

    @PostMapping(value = {"/agent/v1/jobs/{id}/result", "/api/v1/jobs/{id}/result"})
    public ResponseEntity<?> reportJobResult(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        jobRepository.findById(id).ifPresent(job -> {
            String status = body.getOrDefault("status", "completed").toString();
            String output = body.getOrDefault("output", "").toString();
            String error = body.getOrDefault("error", "").toString();

            job.setStatus(status.equalsIgnoreCase("completed") ? "completed" : "failed");
            job.setFinishedAt(OffsetDateTime.now());
            try {
                job.setResult(objectMapper.writeValueAsString(body));
            } catch (Exception ignored) {}
            jobRepository.save(job);

            // Synchronize status and logs with associated DeploymentEntity
            if (job.getParameters() != null && !job.getParameters().isEmpty()) {
                try {
                    Map<?, ?> params = objectMapper.readValue(job.getParameters(), Map.class);
                    if (params.containsKey("deploymentId")) {
                        UUID depId = UUID.fromString(params.get("deploymentId").toString());
                        deploymentRepository.findById(depId).ifPresent(dep -> {
                            dep.setStatus(status.equalsIgnoreCase("completed") ? "active" : "failed");
                            dep.setLogs((output + (error.isEmpty() ? "" : "\n[ERROR] " + error)).trim());
                            deploymentRepository.save(dep);
                        });
                    }
                } catch (Exception ignored) {}
            }
        });
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of("acknowledged", true)));
    }

    @PostMapping(value = {"/agent/v1/heartbeat", "/api/v1/agent/heartbeat"})
    public ResponseEntity<?> heartbeat(@RequestHeader(value = "x-server-id", required = false) String serverHeader) {
        if (serverHeader != null && !serverHeader.isEmpty()) {
            try {
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
            } catch (Exception ignored) {}
        }
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of("status", "healthy")));
    }

    @PostMapping(value = {"/agent/v1/metrics", "/api/v1/agent/metrics"})
    public ResponseEntity<?> receiveMetrics(@RequestHeader(value = "x-server-id", required = false) String serverHeader,
                                            @RequestBody Map<String, Object> metrics) {
        if (serverHeader != null && !serverHeader.isEmpty()) {
            try {
                UUID serverId = UUID.fromString(serverHeader);
                serverRepository.findById(serverId).ifPresent(s -> {
                    s.setStatus("online");
                    serverRepository.save(s);
                });
                serverTelemetryService.recordMetrics(serverId, metrics);
            } catch (Exception ignored) {}
        }
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of("received", true)));
    }

    @PostMapping(value = {"/agent/v1/logs", "/api/v1/agent/logs"})
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> receiveLogs(@RequestHeader(value = "x-server-id", required = false) String serverHeader,
                                         @RequestBody Map<String, Object> body) {
        if (serverHeader != null && !serverHeader.isEmpty()) {
            try {
                UUID serverId = UUID.fromString(serverHeader);
                Object logsObj = body.get("logs");
                if (logsObj instanceof List) {
                    serverTelemetryService.appendLogs(serverId, (List<Map<String, Object>>) logsObj);
                }
            } catch (Exception ignored) {}
        }
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of("received", true)));
    }
}
