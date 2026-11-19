package com.nexus.rest.controller;

import com.nexus.common.entity.DeploymentEntity;
import com.nexus.common.entity.JobEntity;
import com.nexus.common.repository.DeploymentRepository;
import com.nexus.common.repository.JobRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/deployments")
public class DeploymentController {

    private final DeploymentRepository deploymentRepository;
    private final JobRepository jobRepository;

    public DeploymentController(DeploymentRepository deploymentRepository, JobRepository jobRepository) {
        this.deploymentRepository = deploymentRepository;
        this.jobRepository = jobRepository;
    }

    public record DeployRequest(UUID serverId, String appName, String repositoryUrl, String branch, String githubToken) {}

    @GetMapping
    public ResponseEntity<?> listDeployments(@RequestHeader(value = "x-organization-id", required = false) String orgHeader) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty() ? UUID.fromString(orgHeader) : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");
        var list = deploymentRepository.findByOrganizationIdOrderByCreatedAtDesc(orgId);
        List<Map<String, Object>> res = new ArrayList<>();
        for (var d : list) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", d.getId().toString());
            map.put("appName", d.getAppName());
            map.put("repositoryUrl", d.getRepositoryUrl());
            map.put("branch", d.getBranch());
            map.put("status", d.getStatus());
            map.put("logs", d.getLogs());
            map.put("createdAt", d.getCreatedAt().toString());
            map.put("serverId", d.getServerId().toString());
            res.add(map);
        }
        return ResponseEntity.ok(Map.of("data", res));
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
        dep.setBranch(req.branch() != null ? req.branch() : "main");
        dep.setStatus("pending");
        deploymentRepository.save(dep);

        JobEntity job = new JobEntity();
        job.setOrganizationId(orgId);
        job.setServerId(req.serverId());
        job.setJobType("deploy.git");
        job.setStatus("queued");
        job.setCreatedAt(OffsetDateTime.now());
        jobRepository.save(job);

        return ResponseEntity.ok(Map.of("data", Map.of(
            "id", dep.getId().toString(),
            "status", "pending",
            "message", "Deployment dispatched"
        )));
    }
}
