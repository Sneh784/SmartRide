package com.smartride.backend.controller;

import com.smartride.backend.dto.FleetAssignmentRequest;
import com.smartride.backend.dto.FleetIssueRequest;
import com.smartride.backend.dto.FleetMaintenanceRequest;
import com.smartride.backend.dto.FleetPasswordChangeRequest;
import com.smartride.backend.dto.FleetPreferencesRequest;
import com.smartride.backend.dto.FleetProfileRequest;
import com.smartride.backend.dto.FleetStatusRequest;
import com.smartride.backend.service.FleetManagerOperationsService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fleet-manager")
public class FleetManagerController {
    private final FleetManagerOperationsService service;

    public FleetManagerController(FleetManagerOperationsService service) {
        this.service = service;
    }

    @GetMapping("/dashboard/summary")
    public Map<String, Object> dashboard(Authentication authentication) {
        return service.dashboard(authentication.getName());
    }

    @GetMapping("/vehicles")
    public List<Map<String, Object>> vehicles(Authentication authentication,
                                              @RequestParam(defaultValue = "") String status,
                                              @RequestParam(defaultValue = "") String search) {
        return service.vehicles(authentication.getName(), status, search);
    }

    @GetMapping("/vehicles/availability")
    public List<Map<String, Object>> availability(Authentication authentication,
                                                  @RequestParam(defaultValue = "") String status) {
        return service.vehicles(authentication.getName(), status, "");
    }

    @PutMapping("/vehicles/{id}/operational-status")
    public Map<String, Object> vehicleOperationalStatus(Authentication authentication, @PathVariable long id,
                                                         @Valid @RequestBody FleetStatusRequest request) {
        return service.updateVehicleOperationalStatus(authentication.getName(), id, request.status());
    }

    @GetMapping("/drivers")
    public List<Map<String, Object>> drivers(Authentication authentication,
                                             @RequestParam(defaultValue = "") String search) {
        return service.drivers(authentication.getName(), search);
    }

    @GetMapping("/drivers/{id}/assignments")
    public List<Map<String, Object>> driverAssignments(Authentication authentication, @PathVariable long id) {
        return service.driverAssignments(authentication.getName(), id);
    }

    @GetMapping("/assignments")
    public List<Map<String, Object>> assignments(Authentication authentication,
                                                 @RequestParam(defaultValue = "") String status) {
        return service.assignments(authentication.getName(), status, 500);
    }

    @PostMapping("/assignments")
    public ResponseEntity<Map<String, Object>> createAssignment(Authentication authentication,
                                                                 @Valid @RequestBody FleetAssignmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createAssignment(authentication.getName(), request));
    }

    @PutMapping("/assignments/{id}/status")
    public Map<String, Object> assignmentStatus(Authentication authentication, @PathVariable long id,
                                                @Valid @RequestBody FleetStatusRequest request) {
        return service.updateAssignmentStatus(authentication.getName(), id, request.status());
    }

    @PutMapping("/assignments/{id}/cancel")
    public Map<String, Object> cancelAssignment(Authentication authentication, @PathVariable long id) {
        return service.updateAssignmentStatus(authentication.getName(), id, "CANCELLED");
    }

    @GetMapping("/active-rentals")
    public List<Map<String, Object>> activeRentals(Authentication authentication) {
        return service.activeRentals(authentication.getName(), 500);
    }

    @GetMapping("/rentals/{id}")
    public Map<String, Object> rental(Authentication authentication, @PathVariable long id) {
        return service.rentalById(authentication.getName(), id);
    }

    @PostMapping("/rentals/{id}/issues")
    public ResponseEntity<Map<String, Object>> reportRentalIssue(Authentication authentication,
                                                                  @PathVariable long id,
                                                                  @Valid @RequestBody FleetIssueRequest request) {
        Map<String, Object> rental = service.rentalById(authentication.getName(), id);
        if (((Number) rental.get("vehicle_id")).longValue() != request.vehicleId()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createMaintenanceRequest(authentication.getName(), request));
    }

    @GetMapping("/maintenance")
    public List<Map<String, Object>> maintenance(Authentication authentication,
                                                 @RequestParam(defaultValue = "") String status) {
        return service.maintenance(authentication.getName(), status, 500);
    }

    @PostMapping("/maintenance")
    public ResponseEntity<Map<String, Object>> createMaintenance(Authentication authentication,
                                                                  @Valid @RequestBody FleetMaintenanceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createMaintenance(authentication.getName(), request));
    }

    @PutMapping("/maintenance/{id}/status")
    public Map<String, Object> maintenanceStatus(Authentication authentication, @PathVariable long id,
                                                 @Valid @RequestBody FleetStatusRequest request) {
        return service.updateMaintenanceStatus(authentication.getName(), id, request);
    }

    @GetMapping("/maintenance/requests")
    public List<Map<String, Object>> maintenanceRequests(Authentication authentication,
                                                         @RequestParam(defaultValue = "") String status) {
        return service.maintenanceRequests(authentication.getName(), status);
    }

    @PostMapping("/maintenance/requests")
    public ResponseEntity<Map<String, Object>> createMaintenanceRequest(Authentication authentication,
                                                                         @Valid @RequestBody FleetIssueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createMaintenanceRequest(authentication.getName(), request));
    }

    @PutMapping("/maintenance/requests/{id}/status")
    public Map<String, Object> maintenanceRequestStatus(Authentication authentication, @PathVariable long id,
                                                        @Valid @RequestBody FleetStatusRequest request) {
        return service.updateMaintenanceRequest(authentication.getName(), id, request);
    }

    @GetMapping("/utilization")
    public Map<String, Object> utilization(Authentication authentication,
                                           @RequestParam(required = false) LocalDate from,
                                           @RequestParam(required = false) LocalDate to) {
        return service.utilization(authentication.getName(), from, to);
    }

    @GetMapping("/reports/{type}")
    public List<Map<String, Object>> report(Authentication authentication, @PathVariable String type,
                                            @RequestParam(required = false) LocalDate from,
                                            @RequestParam(required = false) LocalDate to) {
        return service.report(authentication.getName(), type, from, to);
    }

    @GetMapping("/notifications")
    public Map<String, Object> notifications(Authentication authentication) {
        return service.notifications(authentication.getName());
    }

    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<Void> markNotificationRead(Authentication authentication, @PathVariable long id) {
        service.markNotificationRead(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/notifications/read-all")
    public ResponseEntity<Void> markAllNotificationsRead(Authentication authentication) {
        service.markAllNotificationsRead(authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/profile")
    public Map<String, Object> profile(Authentication authentication) {
        return service.profile(authentication.getName());
    }

    @PutMapping("/profile")
    public Map<String, Object> updateProfile(Authentication authentication,
                                             @Valid @RequestBody FleetProfileRequest request) {
        return service.updateProfile(authentication.getName(), request);
    }

    @GetMapping("/settings")
    public Map<String, Object> preferences(Authentication authentication) {
        return service.preferences(authentication.getName());
    }

    @PutMapping("/settings")
    public Map<String, Object> updatePreferences(Authentication authentication,
                                                 @RequestBody FleetPreferencesRequest request) {
        return service.updatePreferences(authentication.getName(), request);
    }

    @PutMapping("/settings/password")
    public ResponseEntity<Void> changePassword(Authentication authentication,
                                                @Valid @RequestBody FleetPasswordChangeRequest request) {
        service.changePassword(authentication.getName(), request);
        return ResponseEntity.noContent().build();
    }
}
