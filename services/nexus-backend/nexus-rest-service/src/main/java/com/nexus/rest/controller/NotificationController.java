package com.nexus.rest.controller;

import com.nexus.common.entity.NotificationEntity;
import com.nexus.rest.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    private UUID resolveOrgId(String orgHeader) {
        if (orgHeader != null && !orgHeader.trim().isEmpty()) {
            try {
                return UUID.fromString(orgHeader.trim());
            } catch (Exception ignored) {}
        }
        return UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");
    }

    private UUID resolveUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() != null) {
            String principal = auth.getPrincipal().toString();
            try {
                return UUID.fromString(principal);
            } catch (Exception ignored) {}
        }
        return null;
    }

    @GetMapping
    public ResponseEntity<?> listNotifications(
            @RequestParam(required = false, defaultValue = "false") Boolean unreadOnly,
            @RequestParam(required = false, defaultValue = "50") Integer limit,
            @RequestHeader(value = "x-organization-id", required = false) String orgHeader) {
        UUID orgId = resolveOrgId(orgHeader);
        UUID userId = resolveUserId();
        List<NotificationEntity> list = notificationService.getNotifications(orgId, userId, unreadOnly, limit);
        long unreadCount = notificationService.getUnreadCount(orgId, userId);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("count", list.size());
        resp.put("unreadCount", unreadCount);
        resp.put("data", list);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(
            @RequestHeader(value = "x-organization-id", required = false) String orgHeader) {
        UUID orgId = resolveOrgId(orgHeader);
        UUID userId = resolveUserId();
        long unreadCount = notificationService.getUnreadCount(orgId, userId);
        return ResponseEntity.ok(Map.of("success", true, "unreadCount", unreadCount));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable UUID id) {
        return notificationService.markAsRead(id)
                .map(notif -> ResponseEntity.ok(Map.of("success", true, "data", notif)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(
            @RequestHeader(value = "x-organization-id", required = false) String orgHeader) {
        UUID orgId = resolveOrgId(orgHeader);
        UUID userId = resolveUserId();
        int updated = notificationService.markAllAsRead(orgId, userId);
        return ResponseEntity.ok(Map.of("success", true, "updated", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable UUID id) {
        boolean deleted = notificationService.delete(id);
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("success", true, "deleted", true, "id", id));
    }

    @DeleteMapping("/clear")
    public ResponseEntity<?> clearRead(
            @RequestHeader(value = "x-organization-id", required = false) String orgHeader) {
        UUID orgId = resolveOrgId(orgHeader);
        UUID userId = resolveUserId();
        int cleared = notificationService.clearRead(orgId, userId);
        return ResponseEntity.ok(Map.of("success", true, "clearedCount", cleared));
    }

    public record CreateNotificationRequest(
            String title,
            String message,
            String type,
            String severity,
            String link,
            UUID targetUserId
    ) {}

    @PostMapping
    public ResponseEntity<?> createNotification(
            @RequestBody CreateNotificationRequest req,
            @RequestHeader(value = "x-organization-id", required = false) String orgHeader) {
        if (req.title() == null || req.title().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "title is required"));
        }
        UUID orgId = resolveOrgId(orgHeader);
        NotificationEntity created = notificationService.send(
                orgId,
                req.targetUserId(),
                req.title().trim(),
                req.message() != null ? req.message().trim() : "",
                req.type() != null ? req.type() : "system",
                req.severity() != null ? req.severity() : "info",
                req.link() != null ? req.link() : "overview"
        );
        return ResponseEntity.ok(Map.of("success", true, "data", created));
    }
}
