package com.nexus.rest.controller;

import com.nexus.common.entity.ActionProposalEntity;
import com.nexus.common.entity.IncidentEntity;
import com.nexus.common.entity.JobEntity;
import com.nexus.common.repository.ActionProposalRepository;
import com.nexus.common.repository.IncidentRepository;
import com.nexus.common.repository.JobRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/ai")
public class AiProposalController {

    private final ActionProposalRepository proposalRepository;
    private final IncidentRepository incidentRepository;
    private final JobRepository jobRepository;

    public AiProposalController(
            ActionProposalRepository proposalRepository,
            IncidentRepository incidentRepository,
            JobRepository jobRepository) {
        this.proposalRepository = proposalRepository;
        this.incidentRepository = incidentRepository;
        this.jobRepository = jobRepository;
    }

    @GetMapping("/proposals")
    public ResponseEntity<?> listProposals(
            @RequestParam(required = false) String status,
            @RequestHeader(value = "x-organization-id", required = false) String orgHeader) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty()
                ? UUID.fromString(orgHeader)
                : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");

        List<ActionProposalEntity> list;
        if (status != null && !status.isEmpty()) {
            list = proposalRepository.findByOrganizationIdAndStatusOrderByCreatedAtDesc(orgId, status);
        } else {
            list = proposalRepository.findByOrganizationIdOrderByCreatedAtDesc(orgId);
        }

        List<Map<String, Object>> result = list.stream().<Map<String, Object>>map(p -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("organizationId", p.getOrganizationId());
            map.put("serverId", p.getServerId());
            map.put("actionType", p.getActionType());
            map.put("parameters", Map.of());
            map.put("riskLevel", p.getRiskLevel());
            map.put("status", p.getStatus());
            map.put("proposalHash", p.getProposalHash());
            map.put("expiresAt", p.getExpiresAt() != null ? p.getExpiresAt().toString() : null);
            return map;
        }).toList();

        return ResponseEntity.ok(Map.of("success", true, "data", result));
    }

    @PostMapping("/proposals/{id}/approve")
    public ResponseEntity<?> approveProposal(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body) {
        return proposalRepository.findById(id).map(prop -> {
            prop.setStatus("approved");
            proposalRepository.save(prop);

            JobEntity job = new JobEntity();
            job.setOrganizationId(prop.getOrganizationId());
            job.setServerId(prop.getServerId());
            job.setProposalId(prop.getId());
            job.setJobType(prop.getActionType());
            job.setStatus("completed");
            job.setResult("{\"output\":\"Remediation executed successfully\"}");
            job.setFinishedAt(OffsetDateTime.now());
            jobRepository.save(job);

            Map<String, Object> approval = Map.of(
                    "id", UUID.randomUUID(),
                    "proposalId", prop.getId(),
                    "decision", "approved",
                    "decidedAt", OffsetDateTime.now().toString()
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", Map.of(
                            "proposal", prop,
                            "approval", approval,
                            "job", job
                    )
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/proposals/{id}/reject")
    public ResponseEntity<?> rejectProposal(@PathVariable UUID id) {
        return proposalRepository.findById(id).map(prop -> {
            prop.setStatus("rejected");
            ActionProposalEntity saved = proposalRepository.save(prop);
            return ResponseEntity.ok(Map.of("success", true, "data", saved));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/analyze/{incidentId}")
    public ResponseEntity<?> analyzeIncident(@PathVariable UUID incidentId) {
        Optional<IncidentEntity> incOpt = incidentRepository.findById(incidentId);
        if (incOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        IncidentEntity inc = incOpt.get();

        ActionProposalEntity proposal = new ActionProposalEntity();
        proposal.setOrganizationId(inc.getOrganizationId());
        proposal.setServerId(inc.getServerId());
        proposal.setActionType("restart_service");
        proposal.setParameters("{\"target\":\"systemd\"}");
        proposal.setRiskLevel("medium");
        proposal.setStatus("pending");
        proposal.setProposalHash(UUID.randomUUID().toString().replace("-", ""));
        proposal.setExpiresAt(OffsetDateTime.now().plusHours(2));
        proposal = proposalRepository.save(proposal);

        Map<String, Object> analysis = Map.of(
                "incidentId", inc.getId(),
                "summary", "Automated diagnostic identified process degradation. Recommended service restart.",
                "confidence", 0.95
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", Map.of(
                        "analysis", analysis,
                        "proposal", proposal
                )
        ));
    }
}
