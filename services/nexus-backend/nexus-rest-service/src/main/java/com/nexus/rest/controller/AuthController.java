package com.nexus.rest.controller;

import com.nexus.common.entity.MembershipEntity;
import com.nexus.common.entity.OrganizationEntity;
import com.nexus.common.entity.UserEntity;
import com.nexus.common.repository.MembershipRepository;
import com.nexus.common.repository.OrganizationRepository;
import com.nexus.common.repository.UserRepository;
import com.nexus.rest.config.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final MembershipRepository membershipRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UserRepository userRepository,
                          OrganizationRepository organizationRepository,
                          MembershipRepository membershipRepository,
                          PasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.membershipRepository = membershipRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public record LoginRequest(String email, String password) {}
    public record RegisterRequest(String email, String password, String name) {}

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        var userOpt = userRepository.findByEmail(req.email().toLowerCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", Map.of("message", "Invalid credentials")));
        }

        UserEntity user = userOpt.get();
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", Map.of("message", "Invalid credentials")));
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        var memberships = membershipRepository.findByUserId(user.getId());
        List<Map<String, Object>> orgs = new ArrayList<>();
        for (var m : memberships) {
            organizationRepository.findById(m.getOrganizationId()).ifPresent(o -> {
                orgs.add(Map.of("id", o.getId().toString(), "name", o.getName(), "slug", o.getSlug(), "role", m.getRole()));
            });
        }

        Map<String, Object> data = new HashMap<>();
        data.put("accessToken", token);
        data.put("refreshToken", token);
        data.put("user", Map.of("id", user.getId().toString(), "email", user.getEmail(), "name", user.getFullName() != null ? user.getFullName() : ""));
        data.put("organizations", orgs);

        return ResponseEntity.ok(Map.of("success", true, "data", data));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        if (userRepository.existsByEmail(req.email().toLowerCase())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", Map.of("message", "Email already in use")));
        }

        UserEntity user = new UserEntity(UUID.randomUUID(), req.email().toLowerCase(), passwordEncoder.encode(req.password()), req.name());
        userRepository.save(user);

        OrganizationEntity org = new OrganizationEntity(UUID.randomUUID(), req.name() + "'s Org", "org-" + UUID.randomUUID().toString().substring(0, 8));
        organizationRepository.save(org);

        MembershipEntity membership = new MembershipEntity(org.getId(), user.getId(), "owner");
        membershipRepository.save(membership);

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        Map<String, Object> data = Map.of(
            "accessToken", token,
            "refreshToken", token,
            "user", Map.of("id", user.getId().toString(), "email", user.getEmail(), "name", user.getFullName()),
            "organizations", List.of(Map.of("id", org.getId().toString(), "name", org.getName(), "slug", org.getSlug(), "role", "owner"))
        );

        return ResponseEntity.ok(Map.of("success", true, "data", data));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", Map.of("message", "Unauthorized")));
        }
        try {
            var claims = jwtUtil.validateAndGetClaims(authHeader.substring(7));
            UUID userId = UUID.fromString(claims.getSubject());
            var user = userRepository.findById(userId).orElseThrow();
            var memberships = membershipRepository.findByUserId(user.getId());
            List<Map<String, Object>> orgs = new ArrayList<>();
            for (var m : memberships) {
                organizationRepository.findById(m.getOrganizationId()).ifPresent(o -> {
                    orgs.add(Map.of("id", o.getId().toString(), "name", o.getName(), "slug", o.getSlug(), "role", m.getRole()));
                });
            }

            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", Map.of(
                    "user", Map.of("id", user.getId().toString(), "email", user.getEmail(), "name", user.getFullName() != null ? user.getFullName() : ""),
                    "organizations", orgs
                )
            ));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", Map.of("message", "Invalid token")));
        }
    }
}
