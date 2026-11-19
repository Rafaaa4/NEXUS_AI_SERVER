package com.nexus.rest.controller;

import com.nexus.common.entity.AgentEntity;
import com.nexus.common.entity.JobEntity;
import com.nexus.common.entity.ServerEntity;
import com.nexus.common.repository.AgentRepository;
import com.nexus.common.repository.JobRepository;
import com.nexus.common.repository.ServerRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/servers")
public class ServerController {

    private final ServerRepository serverRepository;
    private final AgentRepository agentRepository;
    private final JobRepository jobRepository;

    public ServerController(ServerRepository serverRepository,
                            AgentRepository agentRepository,
                            JobRepository jobRepository) {
        this.serverRepository = serverRepository;
        this.agentRepository = agentRepository;
        this.jobRepository = jobRepository;
    }

    public record CreateServerRequest(String name, String hostname, String provider) {}

    @GetMapping
    public ResponseEntity<?> listServers(@RequestHeader(value = "x-organization-id", required = false) String orgHeader) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty() ? UUID.fromString(orgHeader) : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");
        var servers = serverRepository.findByOrganizationId(orgId);
        List<Map<String, Object>> response = new ArrayList<>();
        for (var s : servers) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", s.getId().toString());
            map.put("name", s.getName());
            map.put("hostname", s.getHostname());
            map.put("provider", s.getProvider());
            map.put("osName", s.getOsName());
            map.put("osVersion", s.getOsVersion());
            map.put("architecture", s.getArchitecture());
            map.put("status", s.getStatus());
            map.put("createdAt", s.getCreatedAt().toString());

            var agentOpt = agentRepository.findByServerId(s.getId());
            if (agentOpt.isPresent()) {
                var a = agentOpt.get();
                map.put("agent", Map.of(
                    "id", a.getId().toString(),
                    "version", a.getVersion() != null ? a.getVersion() : "0.1.0",
                    "status", a.getStatus(),
                    "lastSeenAt", a.getLastSeenAt() != null ? a.getLastSeenAt().toString() : ""
                ));
            }
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
        server.setStatus("pending");
        serverRepository.save(server);

        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
            "id", server.getId().toString(),
            "name", server.getName(),
            "status", server.getStatus()
        )));
    }

    @PostMapping("/{id}/install-command")
    public ResponseEntity<?> getInstallCommand(@PathVariable UUID id, HttpServletRequest request) {
        String host = request.getServerName();
        String installCmd = String.format("curl -sSL http://%s:4000/agent/bootstrap.sh | sudo bash -s -- --server-id %s", host, id);
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of("installCommand", installCmd)));
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
}
