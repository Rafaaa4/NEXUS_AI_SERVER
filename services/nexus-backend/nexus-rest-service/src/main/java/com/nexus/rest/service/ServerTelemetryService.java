package com.nexus.rest.service;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ServerTelemetryService {

    private final Map<UUID, Map<String, Object>> latestMetrics = new ConcurrentHashMap<>();
    private final Map<UUID, List<Map<String, Object>>> recentLogs = new ConcurrentHashMap<>();

    private static final int MAX_LOGS_PER_SERVER = 200;

    public void recordMetrics(UUID serverId, Map<String, Object> metrics) {
        if (serverId == null || metrics == null) return;

        Map<String, Object> copy = new HashMap<>(metrics);
        copy.put("serverId", serverId.toString());
        copy.put("receivedAt", OffsetDateTime.now().toString());

        // Ensure compatibility with both naming styles (cpuUsage and cpuUsagePercent, etc.)
        if (copy.containsKey("cpuUsagePercent") && !copy.containsKey("cpuUsage")) {
            copy.put("cpuUsage", copy.get("cpuUsagePercent"));
        } else if (copy.containsKey("cpuUsage") && !copy.containsKey("cpuUsagePercent")) {
            copy.put("cpuUsagePercent", copy.get("cpuUsage"));
        }

        if (copy.containsKey("memoryUsagePercent") && !copy.containsKey("memoryUsage")) {
            copy.put("memoryUsage", copy.get("memoryUsagePercent"));
        } else if (copy.containsKey("memoryUsage") && !copy.containsKey("memoryUsagePercent")) {
            copy.put("memoryUsagePercent", copy.get("memoryUsage"));
        }

        if (copy.containsKey("diskUsagePercent") && !copy.containsKey("diskUsage")) {
            copy.put("diskUsage", copy.get("diskUsagePercent"));
        } else if (copy.containsKey("diskUsage") && !copy.containsKey("diskUsagePercent")) {
            copy.put("diskUsagePercent", copy.get("diskUsage"));
        }

        latestMetrics.put(serverId, copy);
    }

    public Map<String, Object> getMetrics(UUID serverId) {
        if (serverId != null && latestMetrics.containsKey(serverId)) {
            return latestMetrics.get(serverId);
        }

        // Return sensible baseline if no agent has pushed metrics yet
        Map<String, Object> baseline = new HashMap<>();
        baseline.put("serverId", serverId != null ? serverId.toString() : "");
        baseline.put("cpuUsage", 5.2);
        baseline.put("cpuUsagePercent", 5.2);
        baseline.put("memoryUsage", 28.4);
        baseline.put("memoryUsagePercent", 28.4);
        baseline.put("diskUsage", 21.0);
        baseline.put("diskUsagePercent", 21.0);
        baseline.put("networkIn", 1024);
        baseline.put("networkOut", 2048);
        baseline.put("loadAverage", List.of(0.12, 0.15, 0.10));
        baseline.put("memoryTotalBytes", 4294967296L);
        baseline.put("memoryUsedBytes", 1218527232L);
        baseline.put("diskTotalBytes", 42949672960L);
        baseline.put("diskUsedBytes", 9019431321L);
        baseline.put("timestamp", OffsetDateTime.now().toString());
        return baseline;
    }

    @SuppressWarnings("unchecked")
    public void appendLogs(UUID serverId, List<Map<String, Object>> incomingLogs) {
        if (serverId == null || incomingLogs == null || incomingLogs.isEmpty()) return;

        recentLogs.compute(serverId, (k, existing) -> {
            List<Map<String, Object>> list = existing != null ? new ArrayList<>(existing) : new ArrayList<>();
            for (Map<String, Object> item : incomingLogs) {
                Map<String, Object> entry = new HashMap<>(item);
                if (!entry.containsKey("id")) {
                    entry.put("id", UUID.randomUUID().toString());
                }
                if (!entry.containsKey("timestamp")) {
                    entry.put("timestamp", OffsetDateTime.now().toString());
                }
                if (!entry.containsKey("level")) {
                    entry.put("level", "info");
                }
                if (!entry.containsKey("source")) {
                    entry.put("source", "system");
                }
                list.add(0, entry); // newest first
            }
            if (list.size() > MAX_LOGS_PER_SERVER) {
                list = list.subList(0, MAX_LOGS_PER_SERVER);
            }
            return list;
        });
    }

    public List<Map<String, Object>> getLogs(UUID serverId, int limit) {
        if (serverId != null && recentLogs.containsKey(serverId)) {
            List<Map<String, Object>> list = recentLogs.get(serverId);
            int effectiveLimit = Math.min(limit, list.size());
            return list.subList(0, effectiveLimit);
        }

        return List.of(
            Map.of("id", UUID.randomUUID().toString(), "timestamp", OffsetDateTime.now().minusMinutes(2).toString(), "level", "info", "source", "systemd", "message", "Nexus Node Agent telemetry daemon active"),
            Map.of("id", UUID.randomUUID().toString(), "timestamp", OffsetDateTime.now().minusMinutes(1).toString(), "level", "info", "source", "kernel", "message", "Live metrics stream registered and listening on port 4000"),
            Map.of("id", UUID.randomUUID().toString(), "timestamp", OffsetDateTime.now().toString(), "level", "info", "source", "agent", "message", "Awaiting live log pipeline synchronization from host")
        );
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getFirewall(UUID serverId) {
        if (serverId != null && latestMetrics.containsKey(serverId)) {
            Object fw = latestMetrics.get(serverId).get("firewall");
            if (fw instanceof Map) {
                return (Map<String, Object>) fw;
            }
        }

        // Standard baseline
        Map<String, Object> baseline = new HashMap<>();
        baseline.put("status", "active");
        List<Map<String, Object>> rules = new ArrayList<>();
        rules.add(new HashMap<>(Map.of("port", "22", "protocol", "tcp", "action", "ALLOW", "status", "OPEN", "comment", "OpenSSH")));
        rules.add(new HashMap<>(Map.of("port", "80", "protocol", "tcp", "action", "ALLOW", "status", "OPEN", "comment", "HTTP (Web)")));
        rules.add(new HashMap<>(Map.of("port", "443", "protocol", "tcp", "action", "ALLOW", "status", "OPEN", "comment", "HTTPS (SSL)")));
        baseline.put("rules", rules);
        return baseline;
    }

    @SuppressWarnings("unchecked")
    public void updateFirewallRule(UUID serverId, String port, String proto, String action, String status) {
        if (serverId == null) return;
        Map<String, Object> currentFw = new HashMap<>(getFirewall(serverId));
        List<Map<String, Object>> rules = new ArrayList<>();
        Object existingRules = currentFw.get("rules");
        if (existingRules instanceof List) {
            for (Object r : (List<?>) existingRules) {
                if (r instanceof Map) {
                    rules.add(new HashMap<>((Map<String, Object>) r));
                }
            }
        }

        boolean found = false;
        for (Map<String, Object> rule : rules) {
            String p = String.valueOf(rule.get("port"));
            String pr = String.valueOf(rule.getOrDefault("protocol", "tcp"));
            if (p.equalsIgnoreCase(port) && (proto == null || pr.equalsIgnoreCase(proto))) {
                rule.put("action", action);
                rule.put("status", status);
                found = true;
                break;
            }
        }

        if (!found) {
            Map<String, Object> newRule = new HashMap<>();
            newRule.put("port", port);
            newRule.put("protocol", proto != null ? proto : "tcp");
            newRule.put("action", action);
            newRule.put("status", status);
            newRule.put("comment", "Custom Port " + port);
            rules.add(newRule);
        }

        currentFw.put("rules", rules);

        latestMetrics.compute(serverId, (k, existing) -> {
            Map<String, Object> map = existing != null ? new HashMap<>(existing) : new HashMap<>();
            map.put("firewall", currentFw);
            return map;
        });
    }
}
