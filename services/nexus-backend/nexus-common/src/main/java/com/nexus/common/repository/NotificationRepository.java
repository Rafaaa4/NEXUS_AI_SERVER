package com.nexus.common.repository;

import com.nexus.common.entity.NotificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<NotificationEntity, UUID> {

    List<NotificationEntity> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);

    List<NotificationEntity> findByOrganizationIdAndReadFalseOrderByCreatedAtDesc(UUID organizationId);

    long countByOrganizationIdAndReadFalse(UUID organizationId);

    @Query("SELECT n FROM NotificationEntity n WHERE (n.organizationId = :organizationId OR (n.userId IS NOT NULL AND n.userId = :userId)) ORDER BY n.createdAt DESC")
    List<NotificationEntity> findForOrgAndUser(@Param("organizationId") UUID organizationId, @Param("userId") UUID userId);

    @Query("SELECT n FROM NotificationEntity n WHERE (n.organizationId = :organizationId OR (n.userId IS NOT NULL AND n.userId = :userId)) AND n.read = false ORDER BY n.createdAt DESC")
    List<NotificationEntity> findUnreadForOrgAndUser(@Param("organizationId") UUID organizationId, @Param("userId") UUID userId);

    @Query("SELECT COUNT(n) FROM NotificationEntity n WHERE (n.organizationId = :organizationId OR (n.userId IS NOT NULL AND n.userId = :userId)) AND n.read = false")
    long countUnreadForOrgAndUser(@Param("organizationId") UUID organizationId, @Param("userId") UUID userId);

    @Transactional
    @Modifying
    @Query("UPDATE NotificationEntity n SET n.read = true, n.readAt = CURRENT_TIMESTAMP WHERE (n.organizationId = :organizationId OR (n.userId IS NOT NULL AND n.userId = :userId)) AND n.read = false")
    int markAllAsReadForOrgAndUser(@Param("organizationId") UUID organizationId, @Param("userId") UUID userId);

    @Transactional
    @Modifying
    @Query("DELETE FROM NotificationEntity n WHERE (n.organizationId = :organizationId OR (n.userId IS NOT NULL AND n.userId = :userId)) AND n.read = true")
    int deleteReadForOrgAndUser(@Param("organizationId") UUID organizationId, @Param("userId") UUID userId);

    @Transactional
    @Modifying
    @Query("UPDATE NotificationEntity n SET n.read = true, n.readAt = CURRENT_TIMESTAMP WHERE n.organizationId = :organizationId AND n.read = false")
    int markAllAsRead(@Param("organizationId") UUID organizationId);

    @Transactional
    @Modifying
    @Query("DELETE FROM NotificationEntity n WHERE n.organizationId = :organizationId AND n.read = true")
    int deleteReadByOrganizationId(@Param("organizationId") UUID organizationId);
}
