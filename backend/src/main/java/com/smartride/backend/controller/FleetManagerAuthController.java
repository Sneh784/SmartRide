package com.smartride.backend.controller;

import com.smartride.backend.dto.LoginRequest;
import com.smartride.backend.dto.LoginResponse;
import com.smartride.backend.service.FleetManagerAuthService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/fleet-manager/auth")
public class FleetManagerAuthController {
    private final FleetManagerAuthService service;

    public FleetManagerAuthController(FleetManagerAuthService service) {
        this.service = service;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return service.login(request);
    }

    @GetMapping("/me")
    public Map<String, Object> currentUser(Authentication authentication) {
        return service.currentUser(authentication.getName());
    }
}
