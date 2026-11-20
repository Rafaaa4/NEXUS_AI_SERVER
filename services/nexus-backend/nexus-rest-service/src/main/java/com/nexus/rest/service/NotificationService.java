package com.nexus.rest.service;

import com.nexus.common.entity.NotificationEntity;
import com.nexus.common.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public NotificationEntity send(UUID organizationId, String title, String message, String type, String severity, String link) {
        return send(organizationId, null, title, message, type, severity, link);
    }

    @Transactional
    public NotificationEntity send(UUID organizationId, UUID userId, String title, String message, String type, String severity, String link) {
        if (organizationId == null) {
            organizationId = UUID.fromString("1ab47797-365b-45a8-80aa-4692d020134f");
        }
        NotificationEntity notification = new NotificationEntity(organizationId, title, message, type, severity, link);
        notification.setUserId(userId);
        NotificationEntity saved = notificationRepository.save(notification);
        log.info("📢 Emitted Notification [{}]: {} - {} (Target User: {})", type, title, message, userId);
        return saved;
    }

    public List<NotificationEntity> getNotifications(UUID organizationId, UUID userId, Boolean unreadOnly, Integer limit) {
        ensureInitialNotifications(organizationId);

        List<NotificationEntity> list;
        if (userId != null) {
            list = Boolean.TRUE.equals(unreadOnly)
                    ? notificationRepository.findUnreadForOrgAndUser(organizationId, userId)
                    : notificationRepository.findForOrgAndUser(organizationId, userId);
        } else {
            list = Boolean.TRUE.equals(unreadOnly)
                    ? notificationRepository.findByOrganizationIdAndReadFalseOrderByCreatedAtDesc(organizationId)
                    : notificationRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId);
        }

        if (limit != null && limit > 0 && list.size() > limit) {
            return list.subList(0, limit);
        }
        return list;
    }

    public long getUnreadCount(UUID organizationId, UUID userId) {
        ensureInitialNotifications(organizationId);
        if (userId != null) {
            return notificationRepository.countUnreadForOrgAndUser(organizationId, userId);
        }
        return notificationRepository.countByOrganizationIdAndReadFalse(organizationId);
    }

    @Transactional
    public Optional<NotificationEntity> markAsRead(UUID id) {
        return notificationRepository.findById(id).map(notif -> {
            notif.setRead(true);
            notif.setReadAt(OffsetDateTime.now());
            return notificationRepository.save(notif);
        });
    }

    @Transactional
    public int markAllAsRead(UUID organizationId, UUID userId) {
        if (userId != null) {
            return notificationRepository.markAllAsReadForOrgAndUser(organizationId, userId);
        }
        return notificationRepository.markAllAsRead(organizationId);
    }

    @Transactional
    public boolean delete(UUID id) {
        if (notificationRepository.existsById(id)) {
            notificationRepository.deleteById(id);
            return true;
        }
        return false;
    }

    @Transactional
    public int clearRead(UUID organizationId, UUID userId) {
        if (userId != null) {
            return notificationRepository.deleteReadForOrgAndUser(organizationId, userId);
        }
        return notificationRepository.deleteReadByOrganizationId(organizationId);
    }

    private synchronized void ensureInitialNotifications(UUID orgId) {
        if (orgId == null) return;
        try {
            long count = notificationRepository.count();
            if (count == 0) {
                log.info("Seeding initial enterprise notifications for organization: {}", orgId);
                send(orgId, "NEXUS Linux Node Agent Connected", "Autonomous Go agent v0.1.0 online. Real-time telemetry streaming active.", "system", "success", "monitoring");
                send(orgId, "Zero-Trust UFW Firewall Active", "Firewall rules enforced with default DROP policy on external interfaces.", "security", "info", "security");
                send(orgId, "AI DevOps Guardian Initialized", "FastAPI inference engine ready for root-cause diagnosis and auto-remediation.", "ai", "info", "ai");
                send(orgId, "Welcome to NEXUS Cloud Platform", "All 7 microservices and data pipelines are running healthy.", "system", "info", "overview");
            }
        } catch (Exception e) {
            log.warn("Could not check/seed notifications: {}", e.getMessage());
        }
    }
}
