package com.smartride.backend.driver.controller;

import com.smartride.backend.driver.dto.DriverRegistrationRequest;
import com.smartride.backend.driver.service.DriverApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/driver")
public class DriverApplicationController {
    private final DriverApplicationService service;

    public DriverApplicationController(DriverApplicationService service) {
        this.service = service;
    }

    @PostMapping("/auth/register")
    public ResponseEntity<Map<String, Object>> register(
            @Valid @RequestPart("application") DriverRegistrationRequest request,
            @RequestPart("drivingLicense") MultipartFile drivingLicense,
            @RequestPart("identityProof") MultipartFile identityProof,
            @RequestPart(value = "profilePhoto", required = false) MultipartFile profilePhoto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.register(request, drivingLicense, identityProof, profilePhoto));
    }
}
