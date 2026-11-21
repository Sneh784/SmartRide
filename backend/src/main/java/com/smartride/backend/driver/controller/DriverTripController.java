package com.smartride.backend.driver.controller;

import com.smartride.backend.driver.dto.DriverTripStatusRequest;
import com.smartride.backend.driver.service.DriverTripOperationsService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/driver")
public class DriverTripController {
    private final DriverTripOperationsService service;

    public DriverTripController(DriverTripOperationsService service) {
        this.service = service;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(Authentication authentication) {
        return service.dashboard(authentication.getName());
    }

    @GetMapping("/trips")
    public List<Map<String, Object>> trips(Authentication authentication,
                                           @RequestParam(defaultValue = "") String status) {
        return service.trips(authentication.getName(), status);
    }

    @GetMapping("/trips/{assignmentId}")
    public Map<String, Object> trip(Authentication authentication, @PathVariable long assignmentId) {
        return service.trip(authentication.getName(), assignmentId);
    }

    @PutMapping("/trips/{assignmentId}/status")
    public Map<String, Object> updateTripStatus(Authentication authentication, @PathVariable long assignmentId,
                                                @Valid @RequestBody DriverTripStatusRequest request) {
        return service.updateTripStatus(authentication.getName(), assignmentId, request);
    }
}
