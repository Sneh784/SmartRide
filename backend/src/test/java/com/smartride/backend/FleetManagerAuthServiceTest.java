package com.smartride.backend;

import com.smartride.backend.dto.LoginRequest;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.UserRepository;
import com.smartride.backend.security.JwtService;
import com.smartride.backend.service.FleetManagerAuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FleetManagerAuthServiceTest {
    @Mock private UserRepository users;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @InjectMocks private FleetManagerAuthService service;

    @Test
    void activeFleetManagerCanLogInWithConfiguredCredentials() {
        User manager = user(RoleName.FLEET_MANAGER, true, "ACTIVE");
        when(users.findByEmail("manager@example.com")).thenReturn(Optional.of(manager));
        when(passwordEncoder.matches("StrongFleetPass123!", "encoded-password")).thenReturn(true);
        when(jwtService.generateToken("manager@example.com")).thenReturn("fleet-token");

        var response = service.login(loginRequest());

        assertEquals("fleet-token", response.token());
        assertEquals("FLEET_MANAGER", response.role());
        assertEquals("manager@example.com", response.email());
    }

    @Test
    void rejectsInactiveOrUnapprovedAccounts() {
        User manager = user(RoleName.FLEET_MANAGER, true, "PENDING");
        when(users.findByEmail("manager@example.com")).thenReturn(Optional.of(manager));

        assertThrows(ResponseStatusException.class, () -> service.login(loginRequest()));
    }

    private static User user(RoleName role, boolean active, String status) {
        User user = new User();
        user.setEmail("manager@example.com");
        user.setFullName("Fleet Manager");
        user.setPassword("encoded-password");
        user.setRole(role);
        user.setApprovalStatus(status);
        user.setActive(active);
        return user;
    }

    private static LoginRequest loginRequest() {
        LoginRequest request = new LoginRequest();
        request.setEmail(" Manager@Example.com ");
        request.setPassword("StrongFleetPass123!");
        return request;
    }
}
