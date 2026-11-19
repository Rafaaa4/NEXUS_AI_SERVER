package com.nexus.rest.controller;

import com.nexus.common.entity.SubscriptionEntity;
import com.nexus.common.repository.ServerRepository;
import com.nexus.common.repository.SubscriptionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping("/subscription")
    public ResponseEntity<?> getSubscription(@RequestHeader(value = "x-organization-id", required = false) String orgHeader) {
        UUID orgId = orgHeader != null && !orgHeader.isEmpty() ? UUID.fromString(orgHeader) : UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");
        var subOpt = subscriptionRepository.findByOrganizationId(orgId);
        SubscriptionEntity sub = subOpt.orElseGet(() -> {
            SubscriptionEntity s = new SubscriptionEntity();
            s.setOrganizationId(orgId);
            s.setPlan("enterprise");
            s.setServerLimit(100);
            return subscriptionRepository.save(s);
        });

        long currentCount = serverRepository.countByOrganizationId(orgId);

        return ResponseEntity.ok(Map.of("success", true, "data", Map.of(
            "plan", sub.getPlan(),
            "serverLimit", sub.getServerLimit(),
            "currentServers", currentCount,
            "remainingServers", Math.max(0, sub.getServerLimit() - currentCount),
            "status", sub.getStatus()
        )));
    }
}
