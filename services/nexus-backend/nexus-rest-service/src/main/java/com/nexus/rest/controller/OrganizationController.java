package com.nexus.rest.controller;

import com.nexus.common.entity.MembershipEntity;
import com.nexus.common.entity.OrganizationEntity;
import com.nexus.common.entity.UserEntity;
import com.nexus.common.repository.MembershipRepository;
import com.nexus.common.repository.OrganizationRepository;
import com.nexus.common.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/organizations")
public class OrganizationController {

    private final OrganizationRepository organizationRepository;
    private final MembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.nexus.rest.service.NotificationService notificationService;

    public OrganizationController(OrganizationRepository organizationRepository,
                                  MembershipRepository membershipRepository,
                                  UserRepository userRepository,
                                  PasswordEncoder passwordEncoder,
                                  com.nexus.rest.service.NotificationService notificationService) {
        this.organizationRepository = organizationRepository;
        this.membershipRepository = membershipRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.notificationService = notificationService;
    }

    public record AddMemberRequest(String email, String role) {}
    public record UpdateRoleRequest(String role) {}

    @GetMapping("/{id}/members")
    public ResponseEntity<?> listMembers(@PathVariable UUID id) {
        List<MembershipEntity> memberships = membershipRepository.findByOrganizationId(id);
        List<Map<String, Object>> response = new ArrayList<>();

        for (MembershipEntity m : memberships) {
            Map<String, Object> map = new HashMap<>();
            map.put("userId", m.getUserId().toString());
            map.put("organizationId", m.getOrganizationId().toString());
            map.put("role", m.getRole());
            map.put("createdAt", m.getCreatedAt() != null ? m.getCreatedAt().toString() : OffsetDateTime.now().toString());

            var userOpt = userRepository.findById(m.getUserId());
            if (userOpt.isPresent()) {
                UserEntity u = userOpt.get();
                map.put("user", Map.of(
                    "id", u.getId().toString(),
                    "email", u.getEmail(),
                    "fullName", u.getFullName() != null ? u.getFullName() : ""
                ));
            } else {
                map.put("user", Map.of(
                    "id", m.getUserId().toString(),
                    "email", "user-" + m.getUserId().toString().substring(0, 6) + "@nexus.internal",
                    "fullName", "Team Member"
                ));
            }
            response.add(map);
        }

        return ResponseEntity.ok(Map.of("success", true, "data", response));
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<?> addMember(@PathVariable UUID id, @RequestBody AddMemberRequest req) {
        if (req.email() == null || req.email().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", Map.of("message", "Email is required")));
        }

        String email = req.email().toLowerCase().trim();
        String role = (req.role() != null && !req.role().isBlank()) ? req.role().toLowerCase().trim() : "operator";

        UserEntity user = userRepository.findByEmail(email).orElseGet(() -> {
            String tempPassword = UUID.randomUUID().toString().substring(0, 12);
            String initialName = email.contains("@") ? email.substring(0, email.indexOf("@")) : "Team Member";
            UserEntity newUser = new UserEntity(UUID.randomUUID(), email, passwordEncoder.encode(tempPassword), initialName);
            return userRepository.save(newUser);
        });

        MembershipEntity membership = membershipRepository.findByOrganizationIdAndUserId(id, user.getId())
                .orElse(new MembershipEntity(id, user.getId(), role));
        membership.setRole(role);
        membershipRepository.save(membership);

        notificationService.send(
            id,
            "Team Member Added: " + email,
            "User " + email + " assigned role '" + role + "' in organization.",
            "member",
            "info",
            "team"
        );

        Map<String, Object> data = Map.of(
            "userId", user.getId().toString(),
            "organizationId", id.toString(),
            "role", role,
            "createdAt", OffsetDateTime.now().toString(),
            "user", Map.of("id", user.getId().toString(), "email", user.getEmail(), "fullName", user.getFullName() != null ? user.getFullName() : "")
        );

        return ResponseEntity.ok(Map.of("success", true, "data", data));
    }

    @PatchMapping("/{id}/members/{userId}")
    public ResponseEntity<?> updateMemberRole(@PathVariable UUID id, @PathVariable UUID userId, @RequestBody UpdateRoleRequest req) {
        var opt = membershipRepository.findByOrganizationIdAndUserId(id, userId);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "error", Map.of("message", "Member not found")));
        }
        MembershipEntity m = opt.get();
        if (req.role() != null && !req.role().isBlank()) {
            m.setRole(req.role().trim().toLowerCase());
            membershipRepository.save(m);
        }
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of("updated", true)));
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<?> removeMember(@PathVariable UUID id, @PathVariable UUID userId) {
        membershipRepository.findByOrganizationIdAndUserId(id, userId).ifPresent(membershipRepository::delete);
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of("removed", true)));
    }
}
