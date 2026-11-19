package com.smartride.backend.service;

import com.smartride.backend.dto.AdminLoginRequest;
import com.smartride.backend.dto.AdminLoginResponse;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.UserRepository;
import com.smartride.backend.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AdminAuthService {
    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCK_DURATION_MS = 15 * 60 * 1000L;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ConcurrentHashMap<String, Attempts> attempts = new ConcurrentHashMap<>();

    public AdminAuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AdminLoginResponse login(AdminLoginRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        long now = System.currentTimeMillis();
        Attempts current = attempts.get(email);
        if (current != null && current.blockedUntil() > now) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many login attempts. Try again later.");
        }

        User user = userRepository.findByEmail(email).orElse(null);
        boolean isAdmin = user != null && (user.getRole() == RoleName.ADMIN
                || user.getRoles().stream().anyMatch(role -> role.getName() == RoleName.ADMIN));
        if (user == null || !user.isActive() || !isAdmin
                || !passwordEncoder.matches(request.password(), user.getPassword())) {
            attempts.compute(email, (key, previous) -> {
                int count = previous == null || (previous.blockedUntil() > 0 && previous.blockedUntil() <= now)
                        ? 1 : previous.count() + 1;
                return new Attempts(count, count >= MAX_ATTEMPTS ? now + LOCK_DURATION_MS : 0);
            });
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        attempts.remove(email);
        AdminLoginResponse.AdminUser safeUser = new AdminLoginResponse.AdminUser(
                user.getId(), user.getFullName(), user.getEmail(), RoleName.ADMIN.name());
        return new AdminLoginResponse(true, "Admin login successful",
                jwtService.generateToken(user.getEmail()), safeUser);
    }

    private record Attempts(int count, long blockedUntil) {}
}
