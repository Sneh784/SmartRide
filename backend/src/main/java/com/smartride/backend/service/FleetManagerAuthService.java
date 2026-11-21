package com.smartride.backend.service;

import com.smartride.backend.dto.LoginRequest;
import com.smartride.backend.dto.LoginResponse;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.UserRepository;
import com.smartride.backend.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class FleetManagerAuthService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public FleetManagerAuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        User user = users.findByEmail(email).orElse(null);
        if (user == null || user.getRole() != RoleName.FLEET_MANAGER
                || !user.isActive() || !"ACTIVE".equalsIgnoreCase(user.getApprovalStatus())
                || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return new LoginResponse(jwtService.generateToken(user.getEmail()), "Bearer",
                user.getFullName(), RoleName.FLEET_MANAGER.name(), user.getEmail());
    }

    public Map<String, Object> currentUser(String email) {
        User user = users.findByEmail(email.toLowerCase(Locale.ROOT))
                .filter(account -> account.getRole() == RoleName.FLEET_MANAGER && account.isActive()
                        && "ACTIVE".equalsIgnoreCase(account.getApprovalStatus()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", user.getId());
        result.put("name", user.getFullName());
        result.put("email", user.getEmail());
        result.put("phone", user.getPhone());
        result.put("role", user.getRole().name());
        result.put("status", user.getApprovalStatus());
        return result;
    }
}
