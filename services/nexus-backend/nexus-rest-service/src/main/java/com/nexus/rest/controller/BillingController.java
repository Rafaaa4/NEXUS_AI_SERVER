package com.nexus.rest.controller;

import com.nexus.common.entity.SubscriptionEntity;
import com.nexus.common.repository.ServerRepository;
import com.nexus.common.repository.SubscriptionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/billing")
public class BillingController {

    private final SubscriptionRepository subscriptionRepository;
    private final ServerRepository serverRepository;

    public BillingController(SubscriptionRepository subscriptionRepository, ServerRepository serverRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.serverRepository = serverRepository;
    }

    @GetMapping("/plans")
    public ResponseEntity<?> getPlans() {
        List<Map<String, Object>> plans = List.of(
            Map.of(
                "id", "free",
                "name", "Free Tier",
                "tier", "free",
                "price", 0,
                "serverLimit", 2,
                "aiRequestsLimit", 50,
                "features", List.of("2 Managed Servers", "Basic Telemetry", "Community Support")
            ),
            Map.of(
                "id", "pro",
                "name", "Professional",
                "tier", "pro",
                "price", 29,
                "serverLimit", 10,
                "aiRequestsLimit", 500,
                "features", List.of("10 Managed Servers", "Autonomous Remediation", "Managed DBs", "Priority Support")
            ),
            Map.of(
                "id", "enterprise",
                "name", "Enterprise",
                "tier", "enterprise",
                "price", 99,
                "serverLimit", 100,
                "aiRequestsLimit", 5000,
                "features", List.of("Unlimited Servers", "Full SOAP & gRPC Telemetry", "Custom Integrations", "SLA Guarantee")
            )
        );
        return ResponseEntity.ok(Map.of("success", true, "data", plans));
    }

    @GetMapping("/subscription")
    public ResponseEntity<?> getSubscription(@RequestHeader(value = "x-organization-id", required = false) String orgHeader) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty()
                ? UUID.fromString(orgHeader)
                : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");

        SubscriptionEntity sub = subscriptionRepository.findByOrganizationId(orgId).orElseGet(() -> {
            SubscriptionEntity s = new SubscriptionEntity();
            s.setOrganizationId(orgId);
            s.setPlan("enterprise");
            s.setServerLimit(100);
            return subscriptionRepository.save(s);
        });

        long currentCount = serverRepository.countByOrganizationId(orgId);

        Map<String, Object> subMap = Map.of(
            "plan", sub.getPlan(),
            "serverLimit", sub.getServerLimit(),
            "aiRequestsLimit", sub.getAiRequestsLimit(),
            "status", sub.getStatus()
        );

        Map<String, Object> planDetails = Map.of(
            "tier", sub.getPlan(),
            "name", sub.getPlan().substring(0, 1).toUpperCase() + sub.getPlan().substring(1) + " Plan",
            "price", "enterprise".equalsIgnoreCase(sub.getPlan()) ? 99 : 29,
            "serverLimit", sub.getServerLimit(),
            "features", List.of("Automated Remediation", "Full Telemetry")
        );

        Map<String, Object> usage = Map.of(
            "serverCount", currentCount,
            "serverLimit", sub.getServerLimit(),
            "remainingServers", Math.max(0, sub.getServerLimit() - currentCount)
        );

        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", Map.of(
                "subscription", subMap,
                "planDetails", planDetails,
                "usage", usage,
                "plan", sub.getPlan(),
                "serverLimit", sub.getServerLimit(),
                "currentServers", currentCount,
                "remainingServers", Math.max(0, sub.getServerLimit() - currentCount),
                "status", sub.getStatus()
            )
        ));
    }

    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(
            @RequestHeader(value = "x-organization-id", required = false) String orgHeader,
            @RequestBody Map<String, String> body) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty()
                ? UUID.fromString(orgHeader)
                : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");

        String targetPlan = body.getOrDefault("plan", "pro");
        SubscriptionEntity sub = subscriptionRepository.findByOrganizationId(orgId).orElseGet(() -> {
            SubscriptionEntity s = new SubscriptionEntity();
            s.setOrganizationId(orgId);
            return s;
        });

        sub.setPlan(targetPlan);
        if ("enterprise".equalsIgnoreCase(targetPlan)) {
            sub.setServerLimit(100);
            sub.setAiRequestsLimit(5000);
        } else if ("pro".equalsIgnoreCase(targetPlan)) {
            sub.setServerLimit(10);
            sub.setAiRequestsLimit(500);
        } else {
            sub.setServerLimit(2);
            sub.setAiRequestsLimit(50);
        }

        SubscriptionEntity updated = subscriptionRepository.save(sub);
        return ResponseEntity.ok(Map.of("success", true, "data", updated));
    }
}
