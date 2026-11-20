package com.nexus.rest.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtUtil jwtUtil;
    private final com.nexus.common.repository.MembershipRepository membershipRepository;

    public SecurityConfig(JwtUtil jwtUtil, com.nexus.common.repository.MembershipRepository membershipRepository) {
        this.jwtUtil = jwtUtil;
        this.membershipRepository = membershipRepository;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/agent/**").permitAll()
                .requestMatchers("/api/v1/agent/**").permitAll()
                .requestMatchers("/api/v1/deployments/webhook").permitAll()
                .requestMatchers("/error").permitAll()
                .anyRequest().permitAll() // Allow development access seamlessly
            )
            .addFilterBefore(new JwtFilter(jwtUtil, membershipRepository), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    public static class JwtFilter extends OncePerRequestFilter {
        private final JwtUtil jwtUtil;
        private final com.nexus.common.repository.MembershipRepository membershipRepository;

        public JwtFilter(JwtUtil jwtUtil, com.nexus.common.repository.MembershipRepository membershipRepository) {
            this.jwtUtil = jwtUtil;
            this.membershipRepository = membershipRepository;
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, IOException {
            String header = request.getHeader("Authorization");
            String userId = null;
            if (header != null && header.startsWith("Bearer ")) {
                String token = header.substring(7);
                try {
                    var claims = jwtUtil.validateAndGetClaims(token);
                    userId = claims.getSubject();
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(userId, null, Collections.emptyList());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                } catch (Exception ignored) {
                }
            }

            // RBAC Enforcement: Strict block on mutating actions for Viewers
            String method = request.getMethod().toUpperCase();
            if (userId != null && List.of("POST", "PUT", "PATCH", "DELETE").contains(method)) {
                String uri = request.getRequestURI();
                boolean isExempt = uri.startsWith("/api/v1/auth") ||
                                   uri.startsWith("/agent") ||
                                   uri.startsWith("/api/v1/agent") ||
                                   uri.startsWith("/api/v1/notifications") ||
                                   uri.startsWith("/api/v1/deployments/webhook");

                if (!isExempt) {
                    String orgHeader = request.getHeader("x-organization-id");
                    if (orgHeader != null && !orgHeader.isBlank()) {
                        try {
                            java.util.UUID orgUuid = java.util.UUID.fromString(orgHeader.trim());
                            java.util.UUID userUuid = java.util.UUID.fromString(userId);
                            var membership = membershipRepository.findByOrganizationIdAndUserId(orgUuid, userUuid);
                            if (membership.isPresent() && "viewer".equalsIgnoreCase(membership.get().getRole())) {
                                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                                response.setContentType("application/json");
                                response.getWriter().write("{\"success\":false,\"error\":{\"message\":\"Forbidden: Viewer role has read-only access. Actions and mutations are blocked.\"}}");
                                return;
                            }
                        } catch (Exception ignored) {}
                    }
                }
            }

            filterChain.doFilter(request, response);
        }
    }
}
