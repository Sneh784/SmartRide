package com.smartride.backend;

import com.smartride.backend.dto.LoginRequest;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.RoleRepository;
import com.smartride.backend.repository.UserRepository;
import com.smartride.backend.security.JwtService;
import com.smartride.backend.service.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock private UserRepository users;
    @Mock private RoleRepository roles;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private JdbcTemplate jdbc;
    @InjectMocks private AuthService service;

    @Test
    void pendingDriverCannotLogInEvenWhenAccountIsActive() {
        User driver = driver("PENDING", true);
        when(users.findByEmail("driver@example.com")).thenReturn(Optional.of(driver));
        when(passwordEncoder.matches("StrongPass1!", driver.getPassword())).thenReturn(true);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> service.login(loginRequest()));

        assertEquals("Driver account is not approved", exception.getMessage());
    }

    @Test
    void approvedActiveDriverCanLogIn() {
        User driver = driver("APPROVED", true);
        when(users.findByEmail("driver@example.com")).thenReturn(Optional.of(driver));
        when(passwordEncoder.matches("StrongPass1!", driver.getPassword())).thenReturn(true);
        when(jwtService.generateToken("driver@example.com")).thenReturn("jwt-token");

        var response = service.login(loginRequest());

        assertEquals("jwt-token", response.token());
        assertEquals("DRIVER", response.role());
    }

    private static User driver(String status, boolean active) {
        User driver = new User();
        driver.setEmail("driver@example.com");
        driver.setFullName("Test Driver");
        driver.setPassword("encoded-password");
        driver.setRole(RoleName.DRIVER);
        driver.setApprovalStatus(status);
        driver.setActive(active);
        return driver;
    }

    private static LoginRequest loginRequest() {
        LoginRequest request = new LoginRequest();
        request.setEmail("driver@example.com");
        request.setPassword("StrongPass1!");
        return request;
    }
}
