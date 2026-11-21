package com.smartride.backend.controller;

import com.smartride.backend.service.AdminFleetManagerScopeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/fleet-manager-access")
public class AdminFleetManagerScopeController {
    private final AdminFleetManagerScopeService service;

    public AdminFleetManagerScopeController(AdminFleetManagerScopeService service) {
        this.service = service;
    }

    @GetMapping
    public Map<String, Object> overview() {
        return service.overview();
    }

    @PostMapping("/{fleetManagerId}/vehicles/{vehicleId}")
    public ResponseEntity<Void> grantVehicle(Authentication authentication,
                                              @PathVariable long fleetManagerId,
                                              @PathVariable long vehicleId) {
        service.grantVehicle(authentication.getName(), fleetManagerId, vehicleId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{fleetManagerId}/vehicles/{vehicleId}")
    public ResponseEntity<Void> revokeVehicle(Authentication authentication,
                                               @PathVariable long fleetManagerId,
                                               @PathVariable long vehicleId) {
        service.revokeVehicle(authentication.getName(), fleetManagerId, vehicleId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{fleetManagerId}/drivers/{driverId}")
    public ResponseEntity<Void> grantDriver(Authentication authentication,
                                            @PathVariable long fleetManagerId,
                                            @PathVariable long driverId) {
        service.grantDriver(authentication.getName(), fleetManagerId, driverId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{fleetManagerId}/drivers/{driverId}")
    public ResponseEntity<Void> revokeDriver(Authentication authentication,
                                             @PathVariable long fleetManagerId,
                                             @PathVariable long driverId) {
        service.revokeDriver(authentication.getName(), fleetManagerId, driverId);
        return ResponseEntity.noContent().build();
    }
}
