package com.nexus.rest.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexus.common.entity.AgentEntity;
import com.nexus.common.entity.JobEntity;
import com.nexus.common.entity.ServerEntity;
import com.nexus.common.repository.AgentRepository;
import com.nexus.common.repository.JobRepository;
import com.nexus.common.repository.ManagedDatabaseRepository;
import com.nexus.common.repository.ServerRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/servers")
public class ServerController {

    private final ServerRepository serverRepository;
    private final AgentRepository agentRepository;
    private final JobRepository jobRepository;
    private final ManagedDatabaseRepository managedDatabaseRepository;
    private final ObjectMapper objectMapper;

    public ServerController(ServerRepository serverRepository,
                            AgentRepository agentRepository,
                            JobRepository jobRepository,
                            ManagedDatabaseRepository managedDatabaseRepository) {
        this.serverRepository = serverRepository;
        this.agentRepository = agentRepository;
        this.jobRepository = jobRepository;
        this.managedDatabaseRepository = managedDatabaseRepository;
        this.objectMapper = new ObjectMapper();
    }

    public record CreateServerRequest(String name, String hostname, String provider) {}

    @GetMapping
    public ResponseEntity<?> listServers(@RequestHeader(value = "x-organization-id", required = false) String orgHeader) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty() ? UUID.fromString(orgHeader) : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");
        var servers = serverRepository.findByOrganizationId(orgId);
        List<Map<String, Object>> response = new ArrayList<>();
        OffsetDateTime now = OffsetDateTime.now();

        for (var s : servers) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", s.getId().toString());
            map.put("name", s.getName());
            map.put("hostname", s.getHostname());
            map.put("provider", s.getProvider());
            map.put("osName", s.getOsName());
            map.put("osVersion", s.getOsVersion());
            map.put("architecture", s.getArchitecture());
            map.put("createdAt", s.getCreatedAt().toString());

            var agentOpt = agentRepository.findByServerId(s.getId());
            String computedStatus = "offline";

            if (agentOpt.isPresent()) {
                var a = agentOpt.get();
                if (a.getLastSeenAt() != null) {
                    long diffSeconds = Duration.between(a.getLastSeenAt(), now).abs().getSeconds();
                    // Agent sends heartbeat every 5-15s. If no heartbeat within 60s, server is shutdown/offline!
                    if (diffSeconds <= 60) {
                        computedStatus = "online";
                    }
                }

                if (!computedStatus.equals(a.getStatus())) {
                    a.setStatus(computedStatus);
                    agentRepository.save(a);
                }

                map.put("agent", Map.of(
                    "id", a.getId().toString(),
                    "version", a.getVersion() != null ? a.getVersion() : "0.1.0",
                    "status", computedStatus,
                    "lastSeenAt", a.getLastSeenAt() != null ? a.getLastSeenAt().toString() : ""
                ));
            }

            if (!computedStatus.equals(s.getStatus())) {
                s.setStatus(computedStatus);
                serverRepository.save(s);
            }
            map.put("status", computedStatus);

            response.add(map);
        }
        return ResponseEntity.ok(Map.of("success", true, "data", response));
    }

    @PostMapping
    public ResponseEntity<?> createServer(@RequestHeader(value = "x-organization-id", required = false) String orgHeader,
                                          @RequestBody CreateServerRequest req) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty() ? UUID.fromString(orgHeader) : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");
        ServerEntity server = new ServerEntity();
        server.setOrganizationId(orgId);
        server.setName(req.name());
        server.setHostname(req.hostname());
        server.setProvider(req.provider() != null ? req.provider() : "generic-linux");
        server.setStatus("offline");
        serverRepository.save(server);

        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
            "id", server.getId().toString(),
            "name", server.getName(),
            "status", server.getStatus()
        )));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteServer(
            @PathVariable UUID id,
            @RequestHeader(value = "x-organization-id", required = false) String orgHeader) {
        return serverRepository.findById(id).map(server -> {
            try {
                var dbs = managedDatabaseRepository.findByOrganizationIdAndServerId(server.getOrganizationId(), id);
                managedDatabaseRepository.deleteAll(dbs);
            } catch (Exception ignored) {}

            serverRepository.delete(server);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", Map.of("id", id.toString(), "deleted", true, "message", "Server deleted successfully")
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(value = {"/{id}/enrollment-token", "/{id}/install-command"})
    public ResponseEntity<?> getInstallCommand(@PathVariable UUID id, HttpServletRequest request) {
        String host = request.getServerName();
        if (host == null || host.isEmpty() || host.equals("0.0.0.0")) {
            host = "localhost";
        }
        String installCmd = String.format("curl -sSL http://%s:4000/agent/bootstrap.sh | sudo bash -s -- --server-id %s --host %s", host, id, host);
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
            "token", UUID.randomUUID().toString(),
            "serverId", id.toString(),
            "expiresAt", OffsetDateTime.now().plusMinutes(15).toString(),
            "installCommand", installCmd
        )));
    }

    @PostMapping("/{id}/baseline-proposals")
    public ResponseEntity<?> generateBaselineProposals(@PathVariable UUID id) {
        return ResponseEntity.ok(Map.of("success", true, "data", List.of()));
    }

    @PostMapping("/{id}/update-agent")
    public ResponseEntity<?> updateAgent(@PathVariable UUID id,
                                         @RequestHeader(value = "x-organization-id", required = false) String orgHeader) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty() ? UUID.fromString(orgHeader) : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");
        JobEntity job = new JobEntity();
        job.setOrganizationId(orgId);
        job.setServerId(id);
        job.setJobType("agent.self_update");
        job.setStatus("queued");
        job.setCreatedAt(OffsetDateTime.now());
        jobRepository.save(job);

        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
            "message", "Agent self-update job dispatched successfully.",
            "jobId", job.getId().toString()
        )));
    }

    @GetMapping("/{id}/metrics")
    public ResponseEntity<?> getServerMetrics(@PathVariable UUID id) {
        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", Map.of(
                "serverId", id.toString(),
                "cpuUsage", 18.5,
                "memoryUsage", 42.1,
                "diskUsage", 37.8,
                "networkIn", 2048,
                "networkOut", 4096,
                "timestamp", OffsetDateTime.now().toString()
            )
        ));
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<?> getServerLogs(@PathVariable UUID id, @RequestParam(defaultValue = "50") int limit) {
        List<Map<String, Object>> sampleLogs = List.of(
            Map.of("id", UUID.randomUUID().toString(), "timestamp", OffsetDateTime.now().minusMinutes(2).toString(), "level", "info", "source", "systemd", "message", "Nexus Node Agent heartbeat service active"),
            Map.of("id", UUID.randomUUID().toString(), "timestamp", OffsetDateTime.now().minusMinutes(1).toString(), "level", "info", "source", "kernel", "message", "Telemetry stream synchronized with gRPC backend"),
            Map.of("id", UUID.randomUUID().toString(), "timestamp", OffsetDateTime.now().toString(), "level", "info", "source", "agent", "message", "Security baseline and container checks normal")
        );
        return ResponseEntity.ok(Map.of("success", true, "data", sampleLogs));
    }

    @PostMapping("/{id}/run-command")
    public ResponseEntity<?> runServerCommand(@PathVariable UUID id,
                                              @RequestHeader(value = "x-organization-id", required = false) String orgHeader,
                                              @RequestBody Map<String, String> body) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty() ? UUID.fromString(orgHeader) : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");
        String command = body.get("command");
        if (command == null || command.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", Map.of("message", "command is required")));
        }

        JobEntity job = new JobEntity();
        job.setOrganizationId(orgId);
        job.setServerId(id);
        job.setJobType("system.run_command");
        job.setStatus("queued");
        job.setCreatedAt(OffsetDateTime.now());

        Map<String, Object> params = Map.of("command", command);
        try {
            job.setParameters(objectMapper.writeValueAsString(params));
        } catch (Exception ignored) {}
        jobRepository.save(job);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", Map.of(
                "jobId", job.getId().toString(),
                "message", "Command dispatched to server agent"
            )
        ));
    }

    @PostMapping("/{id}/install-docker")
    public ResponseEntity<?> installDocker(@PathVariable UUID id,
                                          @RequestHeader(value = "x-organization-id", required = false) String orgHeader) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty() ? UUID.fromString(orgHeader) : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");
        JobEntity job = new JobEntity();
        job.setOrganizationId(orgId);
        job.setServerId(id);
        job.setJobType("provision.docker");
        job.setStatus("queued");
        job.setCreatedAt(OffsetDateTime.now());
        jobRepository.save(job);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", Map.of(
                "jobId", job.getId().toString(),
                "message", "Docker installation dispatched to server agent"
            )
        ));
    }

    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<?> getJobStatus(@PathVariable UUID jobId) {
        return jobRepository.findById(jobId).map(job -> {
            Map<String, Object> res = new HashMap<>();
            res.put("id", job.getId().toString());
            res.put("status", job.getStatus());
            res.put("jobType", job.getJobType());
            res.put("serverId", job.getServerId().toString());
            if (job.getResult() != null && !job.getResult().isEmpty()) {
                try {
                    res.put("result", objectMapper.readValue(job.getResult(), Map.class));
                } catch (Exception e) {
                    res.put("result", Map.of("output", job.getResult()));
                }
            } else {
                res.put("result", Map.of());
            }
            return ResponseEntity.ok(Map.of("success", true, "data", res));
        }).orElseGet(() -> ResponseEntity.ok(Map.of("success", true, "data", Map.of("id", jobId.toString(), "status", "completed"))));
    }
}
