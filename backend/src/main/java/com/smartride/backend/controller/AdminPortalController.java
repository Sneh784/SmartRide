package com.smartride.backend.controller;

import com.smartride.backend.dto.AdminChangePasswordRequest;
import com.smartride.backend.dto.AdminProfileUpdateRequest;
import com.smartride.backend.dto.AdminStatusRequest;
import com.smartride.backend.service.AdminPortalService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminPortalController {
    private final AdminPortalService service;

    public AdminPortalController(AdminPortalService service) {
        this.service = service;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(@RequestParam(defaultValue = "month") String period) {
        return service.dashboard(period);
    }

    @GetMapping("/users/{role}")
    public List<Map<String, Object>> users(@PathVariable String role,
                                            @RequestParam(defaultValue = "") String status,
                                            @RequestParam(defaultValue = "") String search) {
        return service.users(role, status, search);
    }

    @PatchMapping("/users/{role}/{id}/status")
    public ResponseEntity<Map<String, Object>> setUserStatus(Authentication authentication, @PathVariable String role,
                                                              @PathVariable long id, @Valid @RequestBody AdminStatusRequest request) {
        service.setUserStatus(authentication.getName(), id, role, request);
        if ("DRIVER".equalsIgnoreCase(role) && "APPROVED".equalsIgnoreCase(request.status())) {
            Map<String, Object> response = new java.util.LinkedHashMap<>();
            response.put("status", "APPROVED");
            response.putAll(service.approvalEmailStatus(id, role));
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.ok(Map.of("status", request.status().toUpperCase(java.util.Locale.ROOT)));
    }

    @org.springframework.web.bind.annotation.PostMapping("/users/{role}/{id}/approval-email/retry")
    public ResponseEntity<Map<String, Object>> retryApprovalEmail(Authentication authentication,
                                                                  @PathVariable String role, @PathVariable long id) {
        return ResponseEntity.ok(service.retryApprovalEmail(authentication.getName(), id, role));
    }

    @GetMapping("/vehicles")
    public List<Map<String, Object>> vehicles(@RequestParam(defaultValue = "") String status,
                                               @RequestParam(defaultValue = "") String search) {
        return service.vehicles(status, search);
    }

    @PatchMapping("/vehicles/{id}/status")
    public ResponseEntity<Void> setVehicleStatus(Authentication authentication, @PathVariable long id,
                                                 @Valid @RequestBody AdminStatusRequest request) {
        service.setVehicleStatus(authentication.getName(), id, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/bookings")
    public List<Map<String, Object>> bookings(@RequestParam(defaultValue = "") String status,
                                               @RequestParam(defaultValue = "") String search) {
        return service.bookings(status, search);
    }

    @GetMapping("/payments")
    public List<Map<String, Object>> payments(@RequestParam(defaultValue = "") String status,
                                               @RequestParam(defaultValue = "") String search) {
        return service.payments(status, search);
    }

    @GetMapping("/kyc")
    public List<Map<String, Object>> kyc(@RequestParam(defaultValue = "") String status) {
        return service.kyc(status);
    }

    @PatchMapping("/kyc/{customerId}/status")
    public ResponseEntity<Void> setKycStatus(Authentication authentication, @PathVariable long customerId,
                                             @Valid @RequestBody AdminStatusRequest request) {
        service.setKycStatus(authentication.getName(), customerId, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/support")
    public List<Map<String, Object>> support(@RequestParam(defaultValue = "") String status) {
        return service.support(status);
    }

    @PatchMapping("/support/{id}/status")
    public ResponseEntity<Void> setSupportStatus(Authentication authentication, @PathVariable long id,
                                                 @Valid @RequestBody AdminStatusRequest request) {
        service.setSupportStatus(authentication.getName(), id, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/notifications")
    public Map<String, Object> notifications() {
        return Map.of("unread", service.unreadNotifications(), "items", service.notifications());
    }

    @PatchMapping("/notifications/{id}/read")
    public ResponseEntity<Void> markNotificationRead(@PathVariable long id) {
        service.markNotificationRead(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/reports")
    public Map<String, Object> reports(@RequestParam(defaultValue = "month") String period) {
        return service.dashboard(period);
    }

    @GetMapping("/settings/profile")
    public Map<String, Object> profile(Authentication authentication) {
        return service.profile(authentication.getName());
    }

    @PutMapping("/settings/profile")
    public ResponseEntity<Void> updateProfile(Authentication authentication,
                                              @Valid @RequestBody AdminProfileUpdateRequest request) {
        service.updateProfile(authentication.getName(), request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/settings")
    public List<Map<String, Object>> settings() { return service.settings(); }

    @PutMapping("/settings/{key}")
    public ResponseEntity<Void> saveSetting(Authentication authentication, @PathVariable String key,
                                            @RequestBody Map<String, String> request) {
        service.saveSetting(authentication.getName(), key, request.get("value"));
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/settings/password")
    public ResponseEntity<Void> changePassword(Authentication authentication,
                                               @Valid @RequestBody AdminChangePasswordRequest request) {
        service.changePassword(authentication.getName(), request);
        return ResponseEntity.noContent().build();
    }
}
