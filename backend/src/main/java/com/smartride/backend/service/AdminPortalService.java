package com.smartride.backend.service;

import com.smartride.backend.dto.AdminChangePasswordRequest;
import com.smartride.backend.dto.AdminProfileUpdateRequest;
import com.smartride.backend.dto.AdminStatusRequest;
import com.smartride.backend.entity.User;
import com.smartride.backend.repository.AdminPortalRepository;
import com.smartride.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class AdminPortalService {
    private static final Set<String> MANAGED_ROLES = Set.of("VENDOR", "DRIVER", "CUSTOMER", "FLEET_MANAGER");
    private static final Set<String> APPROVAL_STATUSES = Set.of("PENDING", "APPROVED", "REJECTED", "SUSPENDED", "ACTIVE");
    private final AdminPortalRepository repository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminPortalService(AdminPortalRepository repository, UserRepository userRepository,
                              PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Map<String, Object> dashboard(String period) {
        String bucket = switch (period.toLowerCase(Locale.ROOT)) {
            case "day", "daily" -> "day";
            case "week", "weekly" -> "week";
            case "year", "yearly" -> "year";
            default -> "month";
        };
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("statistics", repository.dashboard());
        result.put("revenue", repository.revenue(bucket));
        result.put("activities", repository.recentActivity());
        result.put("unreadNotifications", repository.unreadNotifications());
        return result;
    }

    public List<Map<String, Object>> users(String role, String status, String search) {
        String normalizedRole = role.toUpperCase(Locale.ROOT);
        if (!MANAGED_ROLES.contains(normalizedRole)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if ("VENDOR".equals(normalizedRole)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use the vendor application review workflow");
        }
        return repository.users(normalizedRole, empty(status), empty(search));
    }

    @Transactional
    public void setUserStatus(String actor, long userId, String role, AdminStatusRequest request) {
        String normalizedRole = role.toUpperCase(Locale.ROOT);
        if (!MANAGED_ROLES.contains(normalizedRole)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if ("VENDOR".equals(normalizedRole)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use the vendor application review workflow");
        }
        String actualRole;
        try { actualRole = repository.userRole(userId); }
        catch (Exception notFound) { throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"); }
        if (!normalizedRole.equals(actualRole)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found");

        String status = request.status().trim().toUpperCase(Locale.ROOT);
        Set<String> allowed = "CUSTOMER".equals(normalizedRole)
                ? Set.of("ACTIVE", "SUSPENDED") : Set.of("PENDING", "APPROVED", "REJECTED", "SUSPENDED");
        if (!allowed.contains(status)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid account status");
        String reason = request.reason() == null ? null : request.reason().trim();
        if ("REJECTED".equals(status) && (reason == null || reason.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A rejection reason is required");
        }
        if (repository.setUserStatus(userId, normalizedRole, status, reason) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found");
        }
        repository.audit(actor, status, normalizedRole, userId, reason);
    }

    public List<Map<String, Object>> vehicles(String status, String search) {
        return repository.vehicles(empty(status), empty(search));
    }

    @Transactional
    public void setVehicleStatus(String actor, long vehicleId, AdminStatusRequest request) {
        String status = request.status().trim().toUpperCase(Locale.ROOT);
        if (!Set.of("APPROVED", "REJECTED", "SUSPENDED").contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid vehicle status");
        }
        String reason = request.reason() == null ? null : request.reason().trim();
        if ("REJECTED".equals(status) && (reason == null || reason.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A rejection reason is required");
        }
        if (repository.setVehicleStatus(vehicleId, status, reason) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found");
        }
        repository.audit(actor, status, "VEHICLE", vehicleId, reason);
    }

    public List<Map<String, Object>> bookings(String status, String search) {
        return repository.bookings(empty(status), empty(search));
    }

    public List<Map<String, Object>> payments(String status, String search) {
        return repository.payments(empty(status), empty(search));
    }

    public List<Map<String, Object>> kyc(String status) { return repository.kyc(empty(status)); }

    @Transactional
    public void setKycStatus(String actor, long customerId, AdminStatusRequest request) {
        String status = request.status().trim().toUpperCase(Locale.ROOT);
        if (!Set.of("VERIFIED", "REJECTED", "PENDING").contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid verification status");
        }
        String reason = request.reason() == null ? null : request.reason().trim();
        if ("REJECTED".equals(status) && (reason == null || reason.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A rejection reason is required");
        }
        if (repository.setKycStatus(customerId, status, reason) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "KYC submission not found");
        }
        repository.audit(actor, status, "CUSTOMER_KYC", customerId, reason);
    }

    public List<Map<String, Object>> support(String status) { return repository.support(empty(status)); }

    @Transactional
    public void setSupportStatus(String actor, long ticketId, AdminStatusRequest request) {
        String status = request.status().trim().toUpperCase(Locale.ROOT);
        if (!Set.of("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED").contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid ticket status");
        }
        if (repository.setSupportStatus(ticketId, status, actor) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Support ticket not found");
        }
    }

    public List<Map<String, Object>> notifications() { return repository.notifications(); }
    public long unreadNotifications() { return repository.unreadNotifications(); }
    public void markNotificationRead(long id) {
        if (repository.markNotificationRead(id) == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }

    public Map<String, Object> profile(String email) { return repository.adminProfile(email); }

    @Transactional
    public void updateProfile(String email, AdminProfileUpdateRequest request) {
        User user = requireAdmin(email);
        repository.updateAdminName(user.getId(), request.name().trim());
    }

    public List<Map<String, Object>> settings() { return repository.settings(); }

    @Transactional
    public void saveSetting(String email, String key, String value) {
        if (!Set.of("rentalPolicy", "cancellationPolicy", "securityDeposit", "notificationPreferences").contains(key)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown platform setting");
        }
        if (value == null || value.isBlank() || value.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Setting value is required");
        }
        User admin = requireAdmin(email);
        repository.saveSetting(email, admin.getId(), key, value.trim());
    }

    @Transactional
    public void changePassword(String email, AdminChangePasswordRequest request) {
        User admin = requireAdmin(email);
        if (!passwordEncoder.matches(request.currentPassword(), admin.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        if (request.currentPassword().equals(request.newPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must differ from the current password");
        }
        repository.changePassword(admin.getId(), passwordEncoder.encode(request.newPassword()));
    }

    private User requireAdmin(String email) {
        User user = userRepository.findByEmail(email.toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        boolean admin = user.getRole() != null && user.getRole().name().equals("ADMIN");
        if (!admin || !user.isActive()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return user;
    }

    private static String empty(String value) { return value == null ? "" : value.trim(); }
}
