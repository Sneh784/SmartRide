package com.smartride.backend.security;

import com.smartride.backend.entity.User;
import com.smartride.backend.repository.UserRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.stream.Collectors;
import java.util.Locale;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                String email = jwtService.getUsernameFromToken(authorization.substring(7));
                userRepository.findByEmail(email).filter(User::isActive).ifPresent(user -> {
                    var authorities = user.getRoles().stream()
                            .filter(role -> isRoleAccessApproved(user, role.getName().name()))
                            .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getName().name()))
                            .collect(Collectors.toSet());
                    if (authorities.isEmpty() && user.getRole() != null
                            && isRoleAccessApproved(user, user.getRole().name())) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
                    }
                    var authentication = new UsernamePasswordAuthenticationToken(
                            user.getEmail(), null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                });
            } catch (JwtException | IllegalArgumentException ignored) {
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }

    private static boolean isRoleAccessApproved(User user, String role) {
        if ("CUSTOMER".equals(role) || "ADMIN".equals(role)) return true;
        if ("FLEET_MANAGER".equals(role)) {
            return user.isActive() && user.getApprovalStatus() != null
                    && "ACTIVE".equals(user.getApprovalStatus().trim().toUpperCase(Locale.ROOT));
        }
        return user.getApprovalStatus() != null
                && "APPROVED".equals(user.getApprovalStatus().trim().toUpperCase(Locale.ROOT));
    }
}
