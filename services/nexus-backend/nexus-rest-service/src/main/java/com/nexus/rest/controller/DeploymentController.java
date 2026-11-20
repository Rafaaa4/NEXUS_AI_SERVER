package com.nexus.rest.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexus.common.entity.DeploymentEntity;
import com.nexus.common.entity.JobEntity;
import com.nexus.common.entity.ServerEntity;
import com.nexus.common.repository.DeploymentRepository;
import com.nexus.common.repository.JobRepository;
import com.nexus.common.repository.ServerRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/deployments")
public class DeploymentController {

    private final DeploymentRepository deploymentRepository;
    private final JobRepository jobRepository;
    private final ServerRepository serverRepository;
    private final com.nexus.rest.service.NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public DeploymentController(DeploymentRepository deploymentRepository,
                                JobRepository jobRepository,
                                ServerRepository serverRepository,
                                com.nexus.rest.service.NotificationService notificationService) {
        this.deploymentRepository = deploymentRepository;
        this.jobRepository = jobRepository;
        this.serverRepository = serverRepository;
        this.notificationService = notificationService;
        this.objectMapper = new ObjectMapper();
    }

    public record DeployRequest(
        UUID serverId,
        String appName,
        String repositoryUrl,
        String branch,
        String githubToken,
        Map<String, Object> deployConfig
    ) {}

    public record UpdateDeploymentRequest(
        String appName,
        String repositoryUrl,
        String branch,
        String environment,
        Map<String, Object> deployConfig
    ) {}

    private Map<String, Object> formatDeployment(DeploymentEntity d) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", d.getId().toString());
        map.put("appName", d.getAppName());
        map.put("repositoryUrl", d.getRepositoryUrl());
        map.put("branch", d.getBranch());
        map.put("status", d.getStatus());
        map.put("commitSha", d.getCommitSha() != null ? d.getCommitSha() : "HEAD");
        map.put("logs", d.getLogs());
        map.put("createdAt", d.getCreatedAt().toString());
        map.put("serverId", d.getServerId().toString());

        Optional<ServerEntity> sOpt = serverRepository.findById(d.getServerId());
        String host = "127.0.0.1";
        if (sOpt.isPresent()) {
            ServerEntity s = sOpt.get();
            map.put("server", Map.of(
                "id", s.getId().toString(),
                "name", s.getName(),
                "hostname", s.getHostname() != null ? s.getHostname() : "127.0.0.1",
                "status", s.getStatus()
            ));
            if (s.getHostname() != null && !s.getHostname().isEmpty()) {
                host = s.getHostname();
            }
        } else {
            map.put("server", Map.of("name", "Host Server", "hostname", "127.0.0.1"));
        }

        map.put("siteUrl", "http://" + host + "/");
        map.put("serverHost", host);

        if (d.getDeployConfig() != null && !d.getDeployConfig().isEmpty()) {
            try {
                map.put("deployConfig", objectMapper.readValue(d.getDeployConfig(), Map.class));
            } catch (Exception ignored) {}
        }
        return map;
    }

    @GetMapping
    public ResponseEntity<?> listDeployments(@RequestHeader(value = "x-organization-id", required = false) String orgHeader,
                                            @RequestParam(value = "serverId", required = false) String serverIdStr) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty() ? UUID.fromString(orgHeader) : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");
        var list = deploymentRepository.findByOrganizationIdOrderByCreatedAtDesc(orgId);
        List<Map<String, Object>> res = new ArrayList<>();
        for (var d : list) {
            if (serverIdStr != null && !serverIdStr.isEmpty()) {
                if (!d.getServerId().toString().equals(serverIdStr)) {
                    continue;
                }
            }
            res.add(formatDeployment(d));
        }
        return ResponseEntity.ok(Map.of("success", true, "data", res));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getDeployment(@PathVariable UUID id) {
        return deploymentRepository.findById(id)
                .map(d -> ResponseEntity.ok(Map.of("success", true, "data", formatDeployment(d))))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> deploy(@RequestHeader(value = "x-organization-id", required = false) String orgHeader,
                                    @RequestBody DeployRequest req) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty() ? UUID.fromString(orgHeader) : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");

        DeploymentEntity dep = new DeploymentEntity();
        dep.setOrganizationId(orgId);
        dep.setServerId(req.serverId());
        dep.setAppName(req.appName());
        dep.setRepositoryUrl(req.repositoryUrl());
        dep.setBranch(req.branch() != null && !req.branch().isEmpty() ? req.branch() : "main");
        dep.setStatus("deploying");

        if (req.deployConfig() != null) {
            try {
                dep.setDeployConfig(objectMapper.writeValueAsString(req.deployConfig()));
            } catch (Exception ignored) {}
        }
        deploymentRepository.save(dep);

        // Queue deployment job for agent
        JobEntity job = new JobEntity();
        job.setOrganizationId(orgId);
        job.setServerId(req.serverId());
        job.setJobType("deployment.run");
        job.setStatus("queued");
        job.setCreatedAt(OffsetDateTime.now());

        Map<String, Object> params = new HashMap<>();
        params.put("deploymentId", dep.getId().toString());
        params.put("appName", dep.getAppName());
        params.put("repositoryUrl", dep.getRepositoryUrl());
        params.put("branch", dep.getBranch());
        if (req.deployConfig() != null) {
            params.put("deployConfig", req.deployConfig());
        }
        try {
            job.setParameters(objectMapper.writeValueAsString(params));
        } catch (Exception ignored) {}
        jobRepository.save(job);

        // Notify
        notificationService.send(
            orgId,
            "Deployment Triggered: " + dep.getAppName(),
            "Deployment job queued for " + dep.getAppName() + " (" + dep.getBranch() + ")",
            "deployment",
            "info",
            "deployments"
        );

        Map<String, Object> formattedDep = formatDeployment(dep);
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
            "deployment", formattedDep,
            "job", Map.of("id", job.getId().toString(), "status", job.getStatus()),
            "id", dep.getId().toString(),
            "status", "deploying"
        )));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> updateDeployment(@PathVariable UUID id, @RequestBody UpdateDeploymentRequest req) {
        return deploymentRepository.findById(id).map(dep -> {
            if (req.appName() != null && !req.appName().isBlank()) dep.setAppName(req.appName());
            if (req.repositoryUrl() != null) dep.setRepositoryUrl(req.repositoryUrl());
            if (req.branch() != null && !req.branch().isBlank()) dep.setBranch(req.branch());
            if (req.deployConfig() != null) {
                try {
                    dep.setDeployConfig(objectMapper.writeValueAsString(req.deployConfig()));
                } catch (Exception ignored) {}
            }
            deploymentRepository.save(dep);
            return ResponseEntity.ok(Map.of("success", true, "data", formatDeployment(dep)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/redeploy")
    public ResponseEntity<?> redeploy(@PathVariable UUID id) {
        return deploymentRepository.findById(id).map(dep -> {
            dep.setStatus("deploying");
            deploymentRepository.save(dep);

            JobEntity job = new JobEntity();
            job.setOrganizationId(dep.getOrganizationId());
            job.setServerId(dep.getServerId());
            job.setJobType("deployment.run");
            job.setStatus("queued");
            job.setCreatedAt(OffsetDateTime.now());

            Map<String, Object> params = new HashMap<>();
            params.put("deploymentId", dep.getId().toString());
            params.put("appName", dep.getAppName());
            params.put("repositoryUrl", dep.getRepositoryUrl());
            params.put("branch", dep.getBranch());
            if (dep.getDeployConfig() != null) {
                try {
                    params.put("deployConfig", objectMapper.readValue(dep.getDeployConfig(), Map.class));
                } catch (Exception ignored) {}
            }
            try {
                job.setParameters(objectMapper.writeValueAsString(params));
            } catch (Exception ignored) {}
            jobRepository.save(job);

            notificationService.send(
                dep.getOrganizationId(),
                "Redeployment Triggered: " + dep.getAppName(),
                "Redeploying application " + dep.getAppName() + " (" + dep.getBranch() + ")",
                "deployment",
                "info",
                "deployments"
            );

            return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
                "deployment", formatDeployment(dep),
                "job", Map.of("id", job.getId().toString(), "status", job.getStatus())
            )));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/rollback")
    public ResponseEntity<?> rollback(@PathVariable UUID id) {
        return deploymentRepository.findById(id).map(dep -> {
            dep.setStatus("deploying");
            deploymentRepository.save(dep);

            JobEntity job = new JobEntity();
            job.setOrganizationId(dep.getOrganizationId());
            job.setServerId(dep.getServerId());
            job.setJobType("deployment.rollback");
            job.setStatus("queued");
            job.setCreatedAt(OffsetDateTime.now());

            Map<String, Object> params = new HashMap<>();
            params.put("deploymentId", dep.getId().toString());
            params.put("appName", dep.getAppName());
            try {
                job.setParameters(objectMapper.writeValueAsString(params));
            } catch (Exception ignored) {}
            jobRepository.save(job);

            notificationService.send(
                dep.getOrganizationId(),
                "Redeployment Triggered: " + dep.getAppName(),
                "Redeploying application " + dep.getAppName() + " (" + dep.getBranch() + ")",
                "deployment",
                "info",
                "deployments"
            );

            return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
                "success", true,
                "job", Map.of("id", job.getId().toString(), "status", job.getStatus())
            )));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDeployment(@PathVariable UUID id) {
        return deploymentRepository.findById(id).map(dep -> {
            // Queue agent delete job to stop systemd services and clean nginx / /var/www/nexus files
            JobEntity job = new JobEntity();
            job.setOrganizationId(dep.getOrganizationId());
            job.setServerId(dep.getServerId());
            job.setJobType("deployment.delete");
            job.setStatus("queued");
            job.setCreatedAt(OffsetDateTime.now());

            Map<String, Object> params = new HashMap<>();
            params.put("appName", dep.getAppName());
            try {
                job.setParameters(objectMapper.writeValueAsString(params));
            } catch (Exception ignored) {}
            jobRepository.save(job);

            deploymentRepository.delete(dep);

            return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
                "success", true,
                "deletedId", id.toString()
            )));
        }).orElse(ResponseEntity.notFound().build());
    }
}
