package com.nexus.rest.controller;

import com.nexus.common.entity.JobEntity;
import com.nexus.common.entity.ManagedDatabaseEntity;
import com.nexus.common.repository.JobRepository;
import com.nexus.common.repository.ManagedDatabaseRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/databases")
public class DatabaseController {

    private final ManagedDatabaseRepository databaseRepository;
    private final JobRepository jobRepository;

    public DatabaseController(ManagedDatabaseRepository databaseRepository, JobRepository jobRepository) {
        this.databaseRepository = databaseRepository;
        this.jobRepository = jobRepository;
    }

    public record CreateDatabaseRequest(
            UUID serverId,
            String name,
            String dbType,
            Integer port,
            String username,
            String password
    ) {}

    public record DatabaseActionRequest(String action) {}

    @GetMapping
    public ResponseEntity<?> listDatabases(
            @RequestHeader(value = "x-organization-id", required = false) String orgHeader,
            @RequestParam(value = "serverId", required = false) UUID serverId) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty() ? UUID.fromString(orgHeader) : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");

        List<ManagedDatabaseEntity> list;
        if (serverId != null) {
            list = databaseRepository.findByOrganizationIdAndServerId(orgId, serverId);
        } else {
            list = databaseRepository.findByOrganizationId(orgId);
        }

        return ResponseEntity.ok(Map.of("success", true, "data", list));
    }

    @PostMapping
    public ResponseEntity<?> createDatabase(
            @RequestHeader(value = "x-organization-id", required = false) String orgHeader,
            @RequestBody CreateDatabaseRequest req) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty() ? UUID.fromString(orgHeader) : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");

        String dbType = req.dbType() != null ? req.dbType() : "PostgreSQL";
        int port = req.port() != null ? req.port() : getDefaultPort(dbType);
        String containerName = "nexus-db-" + req.name().toLowerCase().replaceAll("[^a-z0-9_-]", "-");

        ManagedDatabaseEntity db = new ManagedDatabaseEntity();
        db.setOrganizationId(orgId);
        db.setServerId(req.serverId());
        db.setName(req.name());
        db.setDbType(dbType);
        db.setVersion(getDefaultVersion(dbType));
        db.setPort(port);
        db.setUsername(req.username() != null ? req.username() : "nexus_admin");
        db.setPassword(req.password() != null ? req.password() : UUID.randomUUID().toString().substring(0, 16));
        db.setContainerName(containerName);
        db.setStatus("running");
        db.setStorageUsed("16 MB");
        databaseRepository.save(db);

        // Dispatch a docker provision job to remote agent
        JobEntity job = new JobEntity();
        job.setOrganizationId(orgId);
        job.setServerId(req.serverId());
        job.setJobType("database.provision");
        job.setStatus("queued");
        job.setResult(String.format("{\"containerName\":\"%s\",\"type\":\"%s\",\"port\":%d,\"dbName\":\"%s\"}",
                containerName, dbType, port, req.name()));
        job.setCreatedAt(OffsetDateTime.now());
        jobRepository.save(job);

        return ResponseEntity.ok(Map.of("success", true, "data", db));
    }

    @PostMapping("/{id}/action")
    public ResponseEntity<?> performAction(
            @PathVariable UUID id,
            @RequestHeader(value = "x-organization-id", required = false) String orgHeader,
            @RequestBody DatabaseActionRequest req) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty() ? UUID.fromString(orgHeader) : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");
        var dbOpt = databaseRepository.findByIdAndOrganizationId(id, orgId);
        if (dbOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        ManagedDatabaseEntity db = dbOpt.get();
        String action = req.action() != null ? req.action().toLowerCase() : "restart";

        switch (action) {
            case "stop" -> db.setStatus("stopped");
            case "start", "restart" -> db.setStatus("running");
            case "backup" -> db.setStorageUsed(db.getStorageUsed());
        }
        databaseRepository.save(db);

        // Dispatch command job to agent
        JobEntity job = new JobEntity();
        job.setOrganizationId(orgId);
        job.setServerId(db.getServerId());
        job.setJobType("database." + action);
        job.setStatus("queued");
        job.setResult(String.format("{\"containerName\":\"%s\",\"action\":\"%s\"}", db.getContainerName(), action));
        job.setCreatedAt(OffsetDateTime.now());
        jobRepository.save(job);

        return ResponseEntity.ok(Map.of("success", true, "data", db, "message", "Database action '" + action + "' triggered successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDatabase(
            @PathVariable UUID id,
            @RequestHeader(value = "x-organization-id", required = false) String orgHeader) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty() ? UUID.fromString(orgHeader) : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");
        databaseRepository.findByIdAndOrganizationId(id, orgId).ifPresent(db -> {
            JobEntity job = new JobEntity();
            job.setOrganizationId(orgId);
            job.setServerId(db.getServerId());
            job.setJobType("database.delete");
            job.setStatus("queued");
            job.setResult(String.format("{\"containerName\":\"%s\"}", db.getContainerName()));
            job.setCreatedAt(OffsetDateTime.now());
            jobRepository.save(job);

            databaseRepository.delete(db);
        });
        return ResponseEntity.ok(Map.of("success", true, "message", "Database deleted successfully"));
    }

    private int getDefaultPort(String type) {
        return switch (type.toLowerCase()) {
            case "mysql", "mariadb" -> 3306;
            case "mongodb" -> 27017;
            case "redis" -> 6379;
            default -> 5432;
        };
    }

    private String getDefaultVersion(String type) {
        return switch (type.toLowerCase()) {
            case "mysql" -> "8.0 Alpine";
            case "mariadb" -> "10.11";
            case "mongodb" -> "7.0 Community";
            case "redis" -> "7.2 Alpine";
            default -> "16.4 Alpine";
        };
    }
}
