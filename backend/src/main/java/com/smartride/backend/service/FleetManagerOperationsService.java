package com.smartride.backend.service;

import com.smartride.backend.dto.FleetAssignmentRequest;
import com.smartride.backend.dto.FleetIssueRequest;
import com.smartride.backend.dto.FleetMaintenanceRequest;
import com.smartride.backend.dto.FleetPasswordChangeRequest;
import com.smartride.backend.dto.FleetPreferencesRequest;
import com.smartride.backend.dto.FleetProfileRequest;
import com.smartride.backend.dto.FleetStatusRequest;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class FleetManagerOperationsService {
    private static final Set<String> ACTIVE_ASSIGNMENTS = Set.of("PENDING", "ASSIGNED", "IN_PROGRESS");
    private static final Set<String> MAINTENANCE_TYPES = Set.of(
            "REGULAR_SERVICE", "OIL_CHANGE", "BRAKE_INSPECTION", "TIRE_REPLACEMENT",
            "ENGINE_REPAIR", "ELECTRICAL_REPAIR", "INSURANCE_RENEWAL",
            "FITNESS_CERTIFICATE_RENEWAL", "OTHER");
    private static final Set<String> MAINTENANCE_STATUSES = Set.of("SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED");
    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public FleetManagerOperationsService(JdbcTemplate jdbc, UserRepository users, PasswordEncoder passwordEncoder) {
        this.jdbc = jdbc;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dashboard(String email) {
        long managerId = requireManager(email).getId();
        Map<String, Object> summary = jdbc.queryForMap("""
                SELECT
                  (SELECT COUNT(*) FROM fleet_manager_vehicle_access a JOIN vehicles v ON v.id = a.vehicle_id
                   WHERE a.fleet_manager_id = ? AND v.approval_status = 'APPROVED') AS total_vehicles,
                  (SELECT COUNT(*) FROM fleet_manager_vehicle_access a JOIN vehicles v ON v.id = a.vehicle_id
                   WHERE a.fleet_manager_id = ? AND v.approval_status = 'APPROVED'
                     AND v.availability_status = 'AVAILABLE' AND v.operational_status = 'AVAILABLE'
                     AND NOT EXISTS (SELECT 1 FROM fleet_maintenance_records m
                       WHERE m.vehicle_id = v.id AND m.status IN ('SCHEDULED', 'IN_PROGRESS'))) AS available_vehicles,
                  (SELECT COUNT(DISTINCT a.vehicle_id) FROM fleet_vehicle_assignments a
                   WHERE a.fleet_manager_id = ? AND a.status IN ('PENDING','ASSIGNED','IN_PROGRESS')) AS assigned_vehicles,
                  (SELECT COUNT(DISTINCT b.vehicle_id) FROM bookings b
                   JOIN fleet_manager_vehicle_access a ON a.vehicle_id = b.vehicle_id
                   WHERE a.fleet_manager_id = ? AND UPPER(b.status) IN ('ACTIVE','IN_PROGRESS')) AS vehicles_on_rent,
                  (SELECT COUNT(DISTINCT m.vehicle_id) FROM fleet_maintenance_records m
                   WHERE m.fleet_manager_id = ? AND m.status IN ('SCHEDULED','IN_PROGRESS')) AS vehicles_under_maintenance,
                  (SELECT COUNT(*) FROM fleet_manager_driver_access a JOIN users d ON d.id = a.driver_id
                   WHERE a.fleet_manager_id = ? AND d.is_active = TRUE AND d.approval_status = 'APPROVED'
                     AND NOT EXISTS (SELECT 1 FROM fleet_vehicle_assignments x
                       WHERE x.driver_id = d.id AND x.fleet_manager_id = a.fleet_manager_id
                         AND x.status IN ('PENDING','ASSIGNED','IN_PROGRESS'))) AS available_drivers,
                  (SELECT COUNT(DISTINCT x.driver_id) FROM fleet_vehicle_assignments x
                   WHERE x.fleet_manager_id = ? AND x.status IN ('PENDING','ASSIGNED','IN_PROGRESS')) AS assigned_drivers,
                  (SELECT COUNT(*) FROM fleet_maintenance_requests r
                   WHERE r.fleet_manager_id = ? AND r.status IN ('OPEN','IN_PROGRESS')) AS pending_maintenance_requests
                """, managerId, managerId, managerId, managerId, managerId, managerId, managerId, managerId);
        Map<String, Object> result = new LinkedHashMap<>(summary);
        result.put("recentAssignments", assignments(managerId, "", 5));
        result.put("upcomingMaintenance", maintenance(managerId, "SCHEDULED", 5));
        result.put("activeRentals", activeRentals(managerId, 5));
        result.put("monthlyUtilization", monthlyUtilization(managerId));
        result.put("availabilityBreakdown", availabilityBreakdown(managerId));
        result.put("maintenanceBreakdown", maintenanceBreakdown(managerId));
        result.put("alerts", jdbc.queryForList("""
                SELECT id, notification_type, title, message, created_at
                FROM fleet_manager_notifications WHERE user_id = ? AND is_read = FALSE
                ORDER BY created_at DESC LIMIT 5
                """, managerId));
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> vehicles(String email, String status, String search) {
        long managerId = requireManager(email).getId();
        String normalizedStatus = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        Set<String> statuses = Set.of("AVAILABLE", "ASSIGNED", "ON_RENT", "UNDER_MAINTENANCE", "INACTIVE");
        if (!normalizedStatus.isEmpty() && !statuses.contains(normalizedStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid operational vehicle status");
        }
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        String pattern = "%" + normalizedSearch + "%";
        String sql = """
                SELECT * FROM (
                  SELECT v.id, v.title AS vehicle_name, v.brand, v.model, v.registration_number,
                         v.category, v.vendor_id, vendor.full_name AS vendor_name,
                         v.approval_status, v.availability_status,
                         CASE
                           WHEN EXISTS (SELECT 1 FROM bookings b WHERE b.vehicle_id = v.id
                             AND UPPER(b.status) IN ('ACTIVE','IN_PROGRESS')) THEN 'ON_RENT'
                           WHEN EXISTS (SELECT 1 FROM fleet_maintenance_records m WHERE m.vehicle_id = v.id
                             AND m.status IN ('SCHEDULED','IN_PROGRESS')) THEN 'UNDER_MAINTENANCE'
                           WHEN EXISTS (SELECT 1 FROM fleet_vehicle_assignments a WHERE a.vehicle_id = v.id
                             AND a.status IN ('PENDING','ASSIGNED','IN_PROGRESS')) THEN 'ASSIGNED'
                           WHEN v.approval_status <> 'APPROVED' OR v.availability_status <> 'AVAILABLE'
                             OR v.operational_status = 'INACTIVE' THEN 'INACTIVE'
                           ELSE 'AVAILABLE'
                         END AS operational_status,
                         (SELECT d.full_name FROM fleet_vehicle_assignments a
                            JOIN users d ON d.id = a.driver_id
                          WHERE a.vehicle_id = v.id AND a.fleet_manager_id = ?
                            AND a.status IN ('PENDING','ASSIGNED','IN_PROGRESS')
                          ORDER BY a.start_at DESC LIMIT 1) AS assigned_driver
                  FROM fleet_manager_vehicle_access access
                  JOIN vehicles v ON v.id = access.vehicle_id
                  LEFT JOIN users vendor ON vendor.id = v.vendor_id
                  WHERE access.fleet_manager_id = ?
                ) scoped
                WHERE (? = '' OR operational_status = ?)
                  AND (? = '%%' OR LOWER(COALESCE(vehicle_name,'')) LIKE ?
                    OR LOWER(COALESCE(registration_number,'')) LIKE ?
                    OR LOWER(COALESCE(brand,'')) LIKE ? OR LOWER(COALESCE(model,'')) LIKE ?)
                ORDER BY vehicle_name, id
                LIMIT 500
                """;
        return jdbc.queryForList(sql, managerId, managerId, normalizedStatus, normalizedStatus,
                normalizedSearch.isEmpty() ? "%%" : pattern,
                pattern, pattern, pattern, pattern);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> drivers(String email, String search) {
        long managerId = requireManager(email).getId();
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        String pattern = "%" + normalizedSearch + "%";
        return jdbc.queryForList("""
                SELECT d.id, d.full_name AS name, d.email, d.phone,
                       CASE WHEN EXISTS (
                         SELECT 1 FROM fleet_vehicle_assignments a WHERE a.driver_id = d.id
                           AND a.fleet_manager_id = ? AND a.status IN ('PENDING','ASSIGNED','IN_PROGRESS')
                       ) THEN 'ASSIGNED' ELSE 'AVAILABLE' END AS availability,
                       (SELECT v.title FROM fleet_vehicle_assignments a
                          JOIN vehicles v ON v.id = a.vehicle_id
                        WHERE a.driver_id = d.id AND a.fleet_manager_id = ?
                          AND a.status IN ('PENDING','ASSIGNED','IN_PROGRESS')
                        ORDER BY a.start_at DESC LIMIT 1) AS current_vehicle,
                       (SELECT a.id FROM fleet_vehicle_assignments a
                        WHERE a.driver_id = d.id AND a.fleet_manager_id = ?
                          AND a.status IN ('PENDING','ASSIGNED','IN_PROGRESS')
                        ORDER BY a.start_at DESC LIMIT 1) AS current_assignment,
                       d.approval_status AS account_status,
                       da.license_expiry_date
                FROM fleet_manager_driver_access access
                JOIN users d ON d.id = access.driver_id
                LEFT JOIN driver_applications da ON da.user_id = d.id
                WHERE access.fleet_manager_id = ? AND d.role = 'DRIVER'
                  AND (? = '%%' OR LOWER(d.full_name) LIKE ? OR LOWER(d.email) LIKE ?)
                ORDER BY d.full_name, d.id
                LIMIT 500
                """, managerId, managerId, managerId, managerId,
                normalizedSearch.isEmpty() ? "%%" : pattern, pattern, pattern);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> driverAssignments(String email, long driverId) {
        long managerId = requireManager(email).getId();
        requireDriverAccess(managerId, driverId);
        return jdbc.queryForList("""
                SELECT a.id, a.vehicle_id, v.title AS vehicle_name, v.registration_number,
                       a.start_at, a.end_at, a.location, a.purpose, a.notes, a.status, a.created_at
                FROM fleet_vehicle_assignments a JOIN vehicles v ON v.id = a.vehicle_id
                WHERE a.fleet_manager_id = ? AND a.driver_id = ?
                ORDER BY a.start_at DESC LIMIT 200
                """, managerId, driverId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> assignments(String email, String status, int limit) {
        return assignments(requireManager(email).getId(), status, limit);
    }

    @Transactional
    public Map<String, Object> createAssignment(String email, FleetAssignmentRequest request) {
        long managerId = requireManager(email).getId();
        if (request.endAt() != null && !request.endAt().isAfter(request.startAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assignment end must be after its start");
        }
        requireVehicleAccess(managerId, request.vehicleId());
        requireDriverAccess(managerId, request.driverId());
        jdbc.queryForObject("SELECT id FROM vehicles WHERE id = ? FOR UPDATE", Long.class, request.vehicleId());
        jdbc.queryForObject("SELECT id FROM users WHERE id = ? FOR UPDATE", Long.class, request.driverId());
        ensureVehicleEligible(request.vehicleId());
        ensureAssignmentWindowAvailable(request.vehicleId(), request.driverId(),
                request.startAt(), request.endAt(), null);

        Long id = insertAndReturnId("""
                INSERT INTO fleet_vehicle_assignments
                    (fleet_manager_id, vehicle_id, driver_id, start_at, end_at, location, purpose, notes, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ASSIGNED')
                """, managerId, request.vehicleId(), request.driverId(), request.startAt(),
                request.endAt(), request.location().trim(), request.purpose().trim(), blankToNull(request.notes()));
        jdbc.update("UPDATE vehicles SET operational_status = 'ASSIGNED' WHERE id = ?",
                request.vehicleId());
        notify(managerId, "DRIVER_ASSIGNMENT", "Vehicle assigned",
                "A driver and vehicle assignment has been created.");
        return assignmentById(managerId, id);
    }

    @Transactional
    public Map<String, Object> updateAssignmentStatus(String email, long assignmentId, String status) {
        long managerId = requireManager(email).getId();
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("IN_PROGRESS", "COMPLETED", "CANCELLED").contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid assignment status");
        }
        Map<String, Object> assignment = assignmentById(managerId, assignmentId);
        String current = String.valueOf(assignment.get("status")).toUpperCase(Locale.ROOT);
        if (!ACTIVE_ASSIGNMENTS.contains(current)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This assignment is already closed");
        }
        jdbc.update("""
                UPDATE fleet_vehicle_assignments SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND fleet_manager_id = ?
                """, normalized, assignmentId, managerId);
        if ("COMPLETED".equals(normalized) || "CANCELLED".equals(normalized)) {
            refreshOperationalStatus(((Number) assignment.get("vehicle_id")).longValue());
        }
        notify(managerId, "VEHICLE_ASSIGNMENT", "Assignment updated",
                "Assignment #" + assignmentId + " is now " + normalized.toLowerCase(Locale.ROOT) + ".");
        return assignmentById(managerId, assignmentId);
    }

    @Transactional
    public Map<String, Object> updateVehicleOperationalStatus(String email, long vehicleId, String status) {
        long managerId = requireManager(email).getId();
        requireVehicleAccess(managerId, vehicleId);
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("AVAILABLE", "INACTIVE").contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Operational status can only be manually set to AVAILABLE or INACTIVE");
        }
        if ("AVAILABLE".equals(normalized)) {
            ensureVehicleEligibleForManualAvailability(vehicleId);
        }
        jdbc.update("UPDATE vehicles SET operational_status = ? WHERE id = ?", normalized, vehicleId);
        return vehicles(email, "", "").stream()
                .filter(row -> ((Number) row.get("id")).longValue() == vehicleId)
                .findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found"));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> activeRentals(String email, int limit) {
        return activeRentals(requireManager(email).getId(), limit);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> rentalById(String email, long bookingId) {
        long managerId = requireManager(email).getId();
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT b.id AS booking_id, b.vehicle_id, v.title AS vehicle_name,
                       v.registration_number, b.customer_id, c.full_name AS customer_name,
                       b.pickup_date AS rental_start_date, b.return_date AS expected_return_date,
                       b.pickup_location, b.return_location, b.status AS rental_status,
                       (SELECT d.full_name FROM fleet_vehicle_assignments a JOIN users d ON d.id = a.driver_id
                        WHERE a.vehicle_id = v.id AND a.fleet_manager_id = ?
                          AND a.start_at <= b.return_date AND (a.end_at IS NULL OR a.end_at > b.pickup_date)
                          AND a.status IN ('ASSIGNED','IN_PROGRESS')
                        ORDER BY a.start_at DESC LIMIT 1) AS driver_name,
                       (SELECT a.id FROM fleet_vehicle_assignments a
                        WHERE a.vehicle_id = v.id AND a.fleet_manager_id = ?
                          AND a.start_at <= b.return_date AND (a.end_at IS NULL OR a.end_at > b.pickup_date)
                          AND a.status IN ('ASSIGNED','IN_PROGRESS')
                        ORDER BY a.start_at DESC LIMIT 1) AS assignment_id
                FROM bookings b JOIN vehicles v ON v.id = b.vehicle_id
                JOIN fleet_manager_vehicle_access access ON access.vehicle_id = v.id
                LEFT JOIN users c ON c.id = b.customer_id
                WHERE access.fleet_manager_id = ? AND b.id = ?
                """, managerId, managerId, managerId, bookingId);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Rental not found");
        return rows.get(0);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> maintenance(String email, String status, int limit) {
        return maintenance(requireManager(email).getId(), status, limit);
    }

    @Transactional
    public Map<String, Object> createMaintenance(String email, FleetMaintenanceRequest request) {
        long managerId = requireManager(email).getId();
        String type = normalizeMaintenanceType(request.maintenanceType());
        if (!MAINTENANCE_TYPES.contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid maintenance type");
        }
        requireVehicleAccess(managerId, request.vehicleId());
        ensureNoActiveRental(request.vehicleId());
        Integer open = jdbc.queryForObject("""
                SELECT COUNT(*) FROM fleet_maintenance_records
                WHERE vehicle_id = ? AND status IN ('SCHEDULED','IN_PROGRESS')
                """, Integer.class, request.vehicleId());
        if (open != null && open > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vehicle already has open maintenance");
        }
        Long id = insertAndReturnId("""
                INSERT INTO fleet_maintenance_records
                    (fleet_manager_id, vehicle_id, maintenance_type, description, scheduled_at,
                     service_provider, estimated_cost, notes, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')
                """, managerId, request.vehicleId(), type, request.description().trim(),
                request.scheduledAt(), blankToNull(request.serviceProvider()), request.estimatedCost(),
                blankToNull(request.notes()));
        jdbc.update("UPDATE vehicles SET operational_status = 'UNDER_MAINTENANCE' WHERE id = ?",
                request.vehicleId());
        notify(managerId, "MAINTENANCE_DUE", "Maintenance scheduled",
                "Maintenance #" + id + " has been scheduled.");
        return maintenanceById(managerId, id);
    }

    @Transactional
    public Map<String, Object> updateMaintenanceStatus(String email, long id, FleetStatusRequest request) {
        long managerId = requireManager(email).getId();
        String status = request.status().trim().toUpperCase(Locale.ROOT);
        if (!MAINTENANCE_STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid maintenance status");
        }
        Map<String, Object> record = maintenanceById(managerId, id);
        if ("COMPLETED".equals(status) && request.actualCost() != null
                && request.actualCost().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Actual cost cannot be negative");
        }
        jdbc.update("""
                UPDATE fleet_maintenance_records
                SET status = ?, notes = COALESCE(?, notes), actual_cost = COALESCE(?, actual_cost),
                    completed_at = CASE WHEN ? = 'COMPLETED' THEN CURRENT_TIMESTAMP
                                        WHEN ? = 'CANCELLED' THEN completed_at ELSE NULL END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND fleet_manager_id = ?
                """, status, blankToNull(request.notes()), request.actualCost(), status, status, id, managerId);
        if ("COMPLETED".equals(status) || "CANCELLED".equals(status)) {
            refreshOperationalStatus(((Number) record.get("vehicle_id")).longValue());
        } else {
            jdbc.update("UPDATE vehicles SET operational_status = 'UNDER_MAINTENANCE' WHERE id = ?",
                    record.get("vehicle_id"));
        }
        notify(managerId, "MAINTENANCE_UPDATE", "Maintenance updated",
                "Maintenance #" + id + " is now " + status.toLowerCase(Locale.ROOT) + ".");
        return maintenanceById(managerId, id);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> maintenanceRequests(String email, String status) {
        long managerId = requireManager(email).getId();
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        return jdbc.queryForList("""
                SELECT r.id, r.vehicle_id, v.title AS vehicle_name, v.registration_number,
                       reporter.full_name AS reported_by, r.description, r.priority, r.status,
                       r.notes, r.created_at, r.updated_at
                FROM fleet_maintenance_requests r
                JOIN vehicles v ON v.id = r.vehicle_id
                JOIN users reporter ON reporter.id = r.reported_by
                WHERE r.fleet_manager_id = ? AND (? = '' OR r.status = ?)
                ORDER BY r.created_at DESC LIMIT 300
                """, managerId, normalized, normalized);
    }

    @Transactional
    public Map<String, Object> createMaintenanceRequest(String email, FleetIssueRequest request) {
        long managerId = requireManager(email).getId();
        requireVehicleAccess(managerId, request.vehicleId());
        String priority = request.priority().trim().toUpperCase(Locale.ROOT);
        if (!Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL").contains(priority)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid issue priority");
        }
        Long id = insertAndReturnId("""
                INSERT INTO fleet_maintenance_requests
                    (fleet_manager_id, vehicle_id, reported_by, description, priority)
                VALUES (?, ?, ?, ?, ?)
                """, managerId, request.vehicleId(), managerId,
                request.description().trim(), priority);
        notify(managerId, "VEHICLE_ISSUE", "Vehicle issue reported",
                "Issue #" + id + " was reported for vehicle #" + request.vehicleId() + ".");
        return maintenanceRequestById(managerId, id);
    }

    @Transactional
    public Map<String, Object> updateMaintenanceRequest(String email, long id, FleetStatusRequest request) {
        long managerId = requireManager(email).getId();
        String status = request.status().trim().toUpperCase(Locale.ROOT);
        if (!Set.of("OPEN", "IN_PROGRESS", "RESOLVED", "CANCELLED").contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid maintenance request status");
        }
        maintenanceRequestById(managerId, id);
        jdbc.update("""
                UPDATE fleet_maintenance_requests SET status = ?, notes = COALESCE(?, notes),
                    updated_at = CURRENT_TIMESTAMP WHERE id = ? AND fleet_manager_id = ?
                """, status, blankToNull(request.notes()), id, managerId);
        return maintenanceRequestById(managerId, id);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> utilization(String email, LocalDate from, LocalDate to) {
        long managerId = requireManager(email).getId();
        LocalDate start = from == null ? LocalDate.now().minusDays(29) : from;
        LocalDate end = to == null ? LocalDate.now() : to;
        if (end.isBefore(start) || ChronoUnit.DAYS.between(start, end) > 366) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a date range of at most 367 days");
        }
        LocalDateTime rangeStart = start.atStartOfDay();
        LocalDateTime rangeEnd = end.plusDays(1).atStartOfDay();
        long periodDays = ChronoUnit.DAYS.between(start, end.plusDays(1));
        List<Map<String, Object>> vehicles = jdbc.queryForList("""
                SELECT v.id, v.title AS vehicle_name, v.category
                FROM fleet_manager_vehicle_access a JOIN vehicles v ON v.id = a.vehicle_id
                WHERE a.fleet_manager_id = ? AND v.approval_status = 'APPROVED'
                  AND v.availability_status = 'AVAILABLE'
                  AND COALESCE(v.operational_status, 'AVAILABLE') <> 'INACTIVE'
                ORDER BY v.title
                """, managerId);
        Map<Long, Map<String, Object>> byVehicle = new LinkedHashMap<>();
        for (Map<String, Object> vehicle : vehicles) {
            byVehicle.put(((Number) vehicle.get("id")).longValue(), vehicle);
            vehicle.put("rental_days", 0.0);
            vehicle.put("available_days", (double) periodDays);
        }

        double rentalDays = 0;
        for (Map<String, Object> booking : jdbc.queryForList("""
                SELECT b.vehicle_id, b.pickup_date, b.return_date
                FROM bookings b JOIN fleet_manager_vehicle_access a ON a.vehicle_id = b.vehicle_id
                WHERE a.fleet_manager_id = ?
                  AND UPPER(b.status) IN ('CONFIRMED','ACTIVE','IN_PROGRESS','COMPLETED','RETURNED')
                  AND b.return_date > ? AND b.pickup_date < ?
                """, managerId, rangeStart, rangeEnd)) {
            long vehicleId = ((Number) booking.get("vehicle_id")).longValue();
            Map<String, Object> vehicle = byVehicle.get(vehicleId);
            if (vehicle == null) continue;
            LocalDateTime pickup = toLocalDateTime(booking.get("pickup_date"));
            LocalDateTime returned = toLocalDateTime(booking.get("return_date"));
            LocalDateTime clippedStart = pickup.isAfter(rangeStart) ? pickup : rangeStart;
            LocalDateTime clippedEnd = returned.isBefore(rangeEnd) ? returned : rangeEnd;
            if (clippedEnd.isAfter(clippedStart)) {
                double days = ChronoUnit.SECONDS.between(clippedStart, clippedEnd) / 86400.0;
                vehicle.put("rental_days", (double) vehicle.get("rental_days") + days);
                rentalDays += days;
            }
        }

        double downtimeDays = 0;
        for (Map<String, Object> record : jdbc.queryForList("""
                SELECT vehicle_id, scheduled_at, completed_at, status
                FROM fleet_maintenance_records
                WHERE fleet_manager_id = ? AND status <> 'CANCELLED'
                  AND scheduled_at < ? AND COALESCE(completed_at, scheduled_at + INTERVAL '1 day') > ?
                """, managerId, rangeEnd, rangeStart)) {
            long vehicleId = ((Number) record.get("vehicle_id")).longValue();
            Map<String, Object> vehicle = byVehicle.get(vehicleId);
            if (vehicle == null) continue;
            LocalDateTime scheduled = toLocalDateTime(record.get("scheduled_at"));
            Object completedValue = record.get("completed_at");
            LocalDateTime completed = completedValue == null
                    ? scheduled.plusDays(1) : toLocalDateTime(completedValue);
            LocalDateTime clippedStart = scheduled.isAfter(rangeStart) ? scheduled : rangeStart;
            LocalDateTime clippedEnd = completed.isBefore(rangeEnd) ? completed : rangeEnd;
            if (clippedEnd.isAfter(clippedStart)) {
                double days = ChronoUnit.SECONDS.between(clippedStart, clippedEnd) / 86400.0;
                vehicle.put("available_days", Math.max(0, (double) vehicle.get("available_days") - days));
                downtimeDays += days;
            }
        }
        double availableDays = Math.max(0, vehicles.size() * (double) periodDays - downtimeDays);
        double utilizationPercent = availableDays == 0 ? 0 : rentalDays / availableDays * 100;
        List<Map<String, Object>> categories = aggregateUtilization(vehicles);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("from", start);
        result.put("to", end);
        result.put("total_vehicles", vehicles.size());
        result.put("available_vehicles", countOperational(managerId, "AVAILABLE"));
        result.put("vehicles_on_rent", countOnRent(managerId));
        result.put("vehicles_under_maintenance", countUnderMaintenance(managerId));
        result.put("total_rental_days", round(rentalDays));
        result.put("total_available_days", round(availableDays));
        result.put("utilization_percent", round(utilizationPercent));
        result.put("vehicles", vehicles);
        result.put("categories", categories);
        result.put("calculation", "Rental duration overlapping the selected dates divided by scoped approved, operational vehicle-days, less scheduled maintenance downtime.");
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> report(String email, String type, LocalDate from, LocalDate to) {
        long managerId = requireManager(email).getId();
        String report = type == null ? "" : type.trim().toLowerCase(Locale.ROOT);
        LocalDate start = from == null ? LocalDate.now().minusMonths(1) : from;
        LocalDate end = to == null ? LocalDate.now() : to;
        if (end.isBefore(start) || ChronoUnit.DAYS.between(start, end) > 366) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a date range of at most 367 days");
        }
        LocalDateTime fromTime = start.atStartOfDay();
        LocalDateTime toTime = end.plusDays(1).atStartOfDay();
        return switch (report) {
            case "fleet-summary" -> vehicles(email, "", "");
            case "assignments", "driver-assignments" -> jdbc.queryForList("""
                    SELECT a.id, v.title AS vehicle_name, d.full_name AS driver_name,
                           a.start_at, a.end_at, a.location, a.purpose, a.status
                    FROM fleet_vehicle_assignments a
                    JOIN vehicles v ON v.id = a.vehicle_id JOIN users d ON d.id = a.driver_id
                    WHERE a.fleet_manager_id = ? AND a.start_at >= ? AND a.start_at < ?
                    ORDER BY a.start_at DESC
                    """, managerId, fromTime, toTime);
            case "maintenance", "operational-cost" -> jdbc.queryForList("""
                    SELECT m.id, v.title AS vehicle_name, m.maintenance_type, m.scheduled_at,
                           m.completed_at, m.service_provider, m.estimated_cost, m.actual_cost,
                           m.description, m.status
                    FROM fleet_maintenance_records m JOIN vehicles v ON v.id = m.vehicle_id
                    WHERE m.fleet_manager_id = ? AND m.scheduled_at >= ? AND m.scheduled_at < ?
                    ORDER BY m.scheduled_at DESC
                    """, managerId, fromTime, toTime);
            case "active-rentals" -> activeRentals(managerId, 500);
            case "utilization" -> List.of(utilization(email, start, end));
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown report type");
        };
    }

    @Transactional(readOnly = true)
    public Map<String, Object> notifications(String email) {
        long managerId = requireManager(email).getId();
        List<Map<String, Object>> items = jdbc.queryForList("""
                SELECT id, notification_type, title, message, is_read, created_at
                FROM fleet_manager_notifications WHERE user_id = ?
                ORDER BY created_at DESC LIMIT 200
                """, managerId);
        Long unread = jdbc.queryForObject("""
                SELECT COUNT(*) FROM fleet_manager_notifications WHERE user_id = ? AND is_read = FALSE
                """, Long.class, managerId);
        return Map.of("items", items, "unread", unread == null ? 0 : unread);
    }

    @Transactional
    public void markNotificationRead(String email, long id) {
        long managerId = requireManager(email).getId();
        if (jdbc.update("""
                UPDATE fleet_manager_notifications SET is_read = TRUE WHERE id = ? AND user_id = ?
                """, id, managerId) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found");
        }
    }

    @Transactional
    public void markAllNotificationsRead(String email) {
        long managerId = requireManager(email).getId();
        jdbc.update("UPDATE fleet_manager_notifications SET is_read = TRUE WHERE user_id = ?", managerId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> profile(String email) {
        User user = requireManager(email);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", user.getId());
        result.put("fullName", user.getFullName());
        result.put("email", user.getEmail());
        result.put("phone", user.getPhone());
        result.put("role", user.getRole().name());
        result.put("status", user.getApprovalStatus());
        result.put("active", user.isActive());
        return result;
    }

    @Transactional
    public Map<String, Object> updateProfile(String email, FleetProfileRequest request) {
        User user = requireManager(email);
        String name = request.fullName().trim().replaceAll("\\s+", " ");
        String[] parts = name.split("\\s+", 2);
        user.setFullName(name);
        user.setFirstName(parts[0]);
        user.setLastName(parts.length > 1 ? parts[1] : "");
        user.setPhone(blankToNull(request.phone()));
        users.save(user);
        return profile(email);
    }

    @Transactional
    public void changePassword(String email, FleetPasswordChangeRequest request) {
        User user = requireManager(email);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "New password must be different from the current password");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        users.save(user);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> preferences(String email) {
        long managerId = requireManager(email).getId();
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT email_notifications, compact_tables FROM fleet_manager_preferences WHERE user_id = ?
                """, managerId);
        if (rows.isEmpty()) return Map.of("email_notifications", true, "compact_tables", false);
        return rows.get(0);
    }

    @Transactional
    public Map<String, Object> updatePreferences(String email, FleetPreferencesRequest request) {
        long managerId = requireManager(email).getId();
        int updated = jdbc.update("""
                UPDATE fleet_manager_preferences
                SET email_notifications = ?, compact_tables = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
                """, request.emailNotifications(), request.compactTables(), managerId);
        if (updated == 0) {
            jdbc.update("""
                    INSERT INTO fleet_manager_preferences (user_id, email_notifications, compact_tables)
                    VALUES (?, ?, ?)
                    """, managerId, request.emailNotifications(), request.compactTables());
        }
        return preferences(email);
    }

    private List<Map<String, Object>> assignments(long managerId, String status, int limit) {
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        return jdbc.queryForList("""
                SELECT a.id, a.vehicle_id, v.title AS vehicle_name, v.registration_number,
                       a.driver_id, d.full_name AS driver_name, a.start_at, a.end_at,
                       a.location, a.purpose, a.notes, a.status, a.created_at
                FROM fleet_vehicle_assignments a
                JOIN vehicles v ON v.id = a.vehicle_id JOIN users d ON d.id = a.driver_id
                WHERE a.fleet_manager_id = ? AND (? = '' OR a.status = ?)
                ORDER BY a.start_at DESC LIMIT ?
                """, managerId, normalized, normalized, Math.max(1, Math.min(limit, 500)));
    }

    private List<Map<String, Object>> activeRentals(long managerId, int limit) {
        return jdbc.queryForList("""
                SELECT b.id AS booking_id, b.vehicle_id, v.title AS vehicle_name,
                       v.registration_number, b.customer_id, c.full_name AS customer_name,
                       b.pickup_date AS rental_start_date, b.return_date AS expected_return_date,
                       b.pickup_location, b.return_location, b.status AS rental_status,
                       (SELECT d.full_name FROM fleet_vehicle_assignments a JOIN users d ON d.id = a.driver_id
                        WHERE a.vehicle_id = v.id AND a.fleet_manager_id = ?
                          AND a.start_at <= b.return_date AND (a.end_at IS NULL OR a.end_at > b.pickup_date)
                          AND a.status IN ('ASSIGNED','IN_PROGRESS')
                        ORDER BY a.start_at DESC LIMIT 1) AS driver_name,
                       (SELECT a.id FROM fleet_vehicle_assignments a
                        WHERE a.vehicle_id = v.id AND a.fleet_manager_id = ?
                          AND a.start_at <= b.return_date AND (a.end_at IS NULL OR a.end_at > b.pickup_date)
                          AND a.status IN ('ASSIGNED','IN_PROGRESS')
                        ORDER BY a.start_at DESC LIMIT 1) AS assignment_id
                FROM bookings b JOIN vehicles v ON v.id = b.vehicle_id
                JOIN fleet_manager_vehicle_access access ON access.vehicle_id = v.id
                LEFT JOIN users c ON c.id = b.customer_id
                WHERE access.fleet_manager_id = ? AND UPPER(b.status) IN ('ACTIVE','IN_PROGRESS')
                ORDER BY b.return_date LIMIT ?
                """, managerId, managerId, managerId, Math.max(1, Math.min(limit, 500)));
    }

    private List<Map<String, Object>> maintenance(long managerId, String status, int limit) {
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        return jdbc.queryForList("""
                SELECT m.id, m.vehicle_id, v.title AS vehicle_name, v.registration_number,
                       m.maintenance_type, m.description, m.scheduled_at, m.completed_at,
                       m.service_provider, m.estimated_cost, m.actual_cost, m.priority,
                       m.status, m.notes, m.created_at
                FROM fleet_maintenance_records m JOIN vehicles v ON v.id = m.vehicle_id
                WHERE m.fleet_manager_id = ? AND (? = '' OR m.status = ?)
                ORDER BY m.scheduled_at DESC LIMIT ?
                """, managerId, normalized, normalized, Math.max(1, Math.min(limit, 500)));
    }

    private Map<String, Object> assignmentById(long managerId, long id) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT a.id, a.vehicle_id, v.title AS vehicle_name, v.registration_number,
                       a.driver_id, d.full_name AS driver_name, a.start_at, a.end_at,
                       a.location, a.purpose, a.notes, a.status, a.created_at
                FROM fleet_vehicle_assignments a
                JOIN vehicles v ON v.id = a.vehicle_id JOIN users d ON d.id = a.driver_id
                WHERE a.id = ? AND a.fleet_manager_id = ?
                """, id, managerId);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignment not found");
        return rows.get(0);
    }

    private Map<String, Object> maintenanceById(long managerId, long id) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT m.id, m.vehicle_id, v.title AS vehicle_name, v.registration_number,
                       m.maintenance_type, m.description, m.scheduled_at, m.completed_at,
                       m.service_provider, m.estimated_cost, m.actual_cost, m.priority,
                       m.status, m.notes, m.created_at
                FROM fleet_maintenance_records m JOIN vehicles v ON v.id = m.vehicle_id
                WHERE m.id = ? AND m.fleet_manager_id = ?
                """, id, managerId);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Maintenance record not found");
        return rows.get(0);
    }

    private Map<String, Object> maintenanceRequestById(long managerId, long id) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT r.id, r.vehicle_id, v.title AS vehicle_name, v.registration_number,
                       reporter.full_name AS reported_by, r.description, r.priority, r.status,
                       r.notes, r.created_at, r.updated_at
                FROM fleet_maintenance_requests r JOIN vehicles v ON v.id = r.vehicle_id
                JOIN users reporter ON reporter.id = r.reported_by
                WHERE r.id = ? AND r.fleet_manager_id = ?
                """, id, managerId);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Maintenance request not found");
        return rows.get(0);
    }

    private void ensureVehicleEligible(long vehicleId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT v.approval_status, v.availability_status, v.operational_status
                FROM vehicles v WHERE v.id = ?
                """, vehicleId);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found");
        Map<String, Object> vehicle = rows.get(0);
        if (!"APPROVED".equalsIgnoreCase(String.valueOf(vehicle.get("approval_status")))
                || !"AVAILABLE".equalsIgnoreCase(String.valueOf(vehicle.get("availability_status")))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only approved, vendor-available vehicles can be assigned");
        }
        if (Set.of("INACTIVE", "UNDER_MAINTENANCE")
                .contains(String.valueOf(vehicle.get("operational_status")).toUpperCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vehicle is not operationally available");
        }
        Integer maintenanceCount = jdbc.queryForObject("""
                SELECT COUNT(*) FROM fleet_maintenance_records
                WHERE vehicle_id = ? AND status IN ('SCHEDULED','IN_PROGRESS')
                """, Integer.class, vehicleId);
        if (maintenanceCount != null && maintenanceCount > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vehicle has unresolved maintenance");
        }
    }

    private void ensureVehicleEligibleForManualAvailability(long vehicleId) {
        Integer available = jdbc.queryForObject("""
                SELECT COUNT(*) FROM vehicles WHERE id = ?
                  AND approval_status = 'APPROVED' AND availability_status = 'AVAILABLE'
                """, Integer.class, vehicleId);
        if (available == null || available == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only approved, vendor-available vehicles can be marked available");
        }
        ensureNoActiveRental(vehicleId);
        Integer assignments = jdbc.queryForObject("""
                SELECT COUNT(*) FROM fleet_vehicle_assignments
                WHERE vehicle_id = ? AND status IN ('PENDING','ASSIGNED','IN_PROGRESS')
                """, Integer.class, vehicleId);
        Integer maintenance = jdbc.queryForObject("""
                SELECT COUNT(*) FROM fleet_maintenance_records
                WHERE vehicle_id = ? AND status IN ('SCHEDULED','IN_PROGRESS')
                """, Integer.class, vehicleId);
        if ((assignments != null && assignments > 0) || (maintenance != null && maintenance > 0)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Vehicle has an active assignment or unresolved maintenance");
        }
    }

    private void ensureNoActiveRental(long vehicleId) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM bookings
                WHERE vehicle_id = ? AND UPPER(status) IN ('PENDING','CONFIRMED','ACTIVE','IN_PROGRESS')
                  AND return_date > CURRENT_TIMESTAMP
                """, Integer.class, vehicleId);
        if (count != null && count > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vehicle has a current or future booking");
        }
    }

    private void ensureAssignmentWindowAvailable(long vehicleId, long driverId, LocalDateTime start,
                                                 LocalDateTime end, Long excludedId) {
        List<Object> args = new ArrayList<>();
        String rangeCondition;
        if (end == null) {
            rangeCondition = "(start_at >= ? OR end_at IS NULL OR end_at > ?)";
            args.add(start);
            args.add(start);
        } else {
            rangeCondition = "(start_at < ? AND (end_at IS NULL OR end_at > ?))";
            args.add(end);
            args.add(start);
        }
        String excludedClause = excludedId == null ? "" : " AND id <> ?";
        String sql = "SELECT COUNT(*) FROM fleet_vehicle_assignments WHERE %s AND %s "
                .formatted(rangeCondition, "status IN ('PENDING','ASSIGNED','IN_PROGRESS')");
        Integer vehicleConflicts = jdbc.queryForObject(
                sql + " AND vehicle_id = ?" + excludedClause, Integer.class,
                append(args, vehicleId, excludedId));
        Integer driverConflicts = jdbc.queryForObject(
                sql + " AND driver_id = ?" + excludedClause, Integer.class,
                append(args, driverId, excludedId));
        if ((vehicleConflicts != null && vehicleConflicts > 0)
                || (driverConflicts != null && driverConflicts > 0)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Vehicle or driver already has an overlapping assignment");
        }
        String bookingRange = end == null
                ? "pickup_date >= ? OR return_date IS NULL OR return_date > ?"
                : "pickup_date < ? AND return_date > ?";
        String bookingSql = "SELECT COUNT(*) FROM bookings WHERE vehicle_id = ? "
                + "AND UPPER(status) IN ('PENDING','CONFIRMED','ACTIVE','IN_PROGRESS') AND (" + bookingRange + ")";
        Object[] bookingArgs = end == null
                ? new Object[]{vehicleId, start, start} : new Object[]{vehicleId, end, start};
        Integer bookingConflicts = jdbc.queryForObject(bookingSql, Integer.class, bookingArgs);
        if (bookingConflicts != null && bookingConflicts > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vehicle has a booking in this time range");
        }
    }

    private static Object[] append(List<Object> rangeArgs, long resourceId, Long excludedId) {
        List<Object> args = new ArrayList<>(rangeArgs);
        args.add(resourceId);
        if (excludedId != null) args.add(excludedId);
        return args.toArray();
    }

    private Long insertAndReturnId(String sql, Object... values) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (int index = 0; index < values.length; index++) {
                statement.setObject(index + 1, values[index]);
            }
            return statement;
        }, keyHolder);
        Number key = keyHolder.getKey();
        if (key == null && keyHolder.getKeys() != null) {
            key = keyHolder.getKeys().entrySet().stream()
                    .filter(entry -> "id".equalsIgnoreCase(entry.getKey()))
                    .map(Map.Entry::getValue)
                    .filter(Number.class::isInstance)
                    .map(Number.class::cast)
                    .findFirst().orElse(null);
        }
        if (key == null) throw new IllegalStateException("Fleet operation insert did not return an ID");
        return key.longValue();
    }

    private void requireVehicleAccess(long managerId, long vehicleId) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM fleet_manager_vehicle_access
                WHERE fleet_manager_id = ? AND vehicle_id = ?
                """, Integer.class, managerId, vehicleId);
        if (count == null || count == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found in your authorized fleet");
        }
    }

    private void requireDriverAccess(long managerId, long driverId) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM fleet_manager_driver_access a JOIN users d ON d.id = a.driver_id
                WHERE a.fleet_manager_id = ? AND a.driver_id = ? AND d.role = 'DRIVER'
                  AND d.is_active = TRUE AND UPPER(COALESCE(d.approval_status, 'PENDING')) = 'APPROVED'
                """, Integer.class, managerId, driverId);
        if (count == null || count == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Active approved driver not found in your authorized fleet");
        }
    }

    private User requireManager(String email) {
        return users.findByEmail(email.toLowerCase(Locale.ROOT))
                .filter(user -> user.getRole() == RoleName.FLEET_MANAGER && user.isActive()
                        && "ACTIVE".equalsIgnoreCase(user.getApprovalStatus()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
    }

    private void refreshOperationalStatus(long vehicleId) {
        Integer activeRentals = jdbc.queryForObject("""
                SELECT COUNT(*) FROM bookings WHERE vehicle_id = ?
                  AND UPPER(status) IN ('ACTIVE','IN_PROGRESS')
                """, Integer.class, vehicleId);
        Integer openMaintenance = jdbc.queryForObject("""
                SELECT COUNT(*) FROM fleet_maintenance_records
                WHERE vehicle_id = ? AND status IN ('SCHEDULED','IN_PROGRESS')
                """, Integer.class, vehicleId);
        Integer activeAssignments = jdbc.queryForObject("""
                SELECT COUNT(*) FROM fleet_vehicle_assignments
                WHERE vehicle_id = ? AND status IN ('PENDING','ASSIGNED','IN_PROGRESS')
                """, Integer.class, vehicleId);
        String nextStatus = activeRentals != null && activeRentals > 0 ? "ON_RENT"
                : openMaintenance != null && openMaintenance > 0 ? "UNDER_MAINTENANCE"
                : activeAssignments != null && activeAssignments > 0 ? "ASSIGNED" : "AVAILABLE";
        jdbc.update("""
                UPDATE vehicles SET operational_status =
                    CASE WHEN approval_status = 'APPROVED' AND availability_status = 'AVAILABLE'
                         THEN ? ELSE 'INACTIVE' END
                WHERE id = ?
                """, nextStatus, vehicleId);
    }

    private void notify(long managerId, String type, String title, String message) {
        jdbc.update("""
                INSERT INTO fleet_manager_notifications (user_id, notification_type, title, message)
                VALUES (?, ?, ?, ?)
                """, managerId, type, title, message);
    }

    private List<Map<String, Object>> monthlyUtilization(long managerId) {
        return jdbc.queryForList("""
                SELECT TO_CHAR(DATE_TRUNC('month', b.pickup_date), 'YYYY-MM') AS month,
                       COUNT(*) AS rental_count
                FROM bookings b JOIN fleet_manager_vehicle_access a ON a.vehicle_id = b.vehicle_id
                WHERE a.fleet_manager_id = ? AND b.pickup_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
                  AND UPPER(b.status) IN ('CONFIRMED','ACTIVE','IN_PROGRESS','COMPLETED','RETURNED')
                GROUP BY DATE_TRUNC('month', b.pickup_date)
                ORDER BY DATE_TRUNC('month', b.pickup_date)
                """, managerId);
    }

    private List<Map<String, Object>> availabilityBreakdown(long managerId) {
        return jdbc.queryForList("""
                SELECT status, COUNT(*) AS count FROM (
                  SELECT CASE
                    WHEN EXISTS (SELECT 1 FROM bookings b WHERE b.vehicle_id = v.id
                      AND UPPER(b.status) IN ('ACTIVE','IN_PROGRESS')) THEN 'ON_RENT'
                    WHEN EXISTS (SELECT 1 FROM fleet_maintenance_records m WHERE m.vehicle_id = v.id
                      AND m.status IN ('SCHEDULED','IN_PROGRESS')) THEN 'UNDER_MAINTENANCE'
                    WHEN EXISTS (SELECT 1 FROM fleet_vehicle_assignments a WHERE a.vehicle_id = v.id
                      AND a.status IN ('PENDING','ASSIGNED','IN_PROGRESS')) THEN 'ASSIGNED'
                    WHEN v.approval_status <> 'APPROVED' OR v.availability_status <> 'AVAILABLE'
                      OR v.operational_status = 'INACTIVE' THEN 'INACTIVE'
                    ELSE 'AVAILABLE' END AS status
                  FROM fleet_manager_vehicle_access a JOIN vehicles v ON v.id = a.vehicle_id
                  WHERE a.fleet_manager_id = ?
                ) statuses GROUP BY status ORDER BY status
                """, managerId);
    }

    private List<Map<String, Object>> maintenanceBreakdown(long managerId) {
        return jdbc.queryForList("""
                SELECT status, COUNT(*) AS count FROM fleet_maintenance_records
                WHERE fleet_manager_id = ? GROUP BY status ORDER BY status
                """, managerId);
    }

    private int countOperational(long managerId, String status) {
        return (int) vehiclesForStatus(managerId, status);
    }

    private long vehiclesForStatus(long managerId, String status) {
        return jdbc.queryForObject("""
                SELECT COUNT(*) FROM fleet_manager_vehicle_access a JOIN vehicles v ON v.id = a.vehicle_id
                WHERE a.fleet_manager_id = ? AND v.approval_status = 'APPROVED'
                  AND v.availability_status = 'AVAILABLE' AND v.operational_status = ?
                  AND NOT EXISTS (SELECT 1 FROM fleet_maintenance_records m
                    WHERE m.vehicle_id = v.id AND m.status IN ('SCHEDULED','IN_PROGRESS'))
                  AND NOT EXISTS (SELECT 1 FROM fleet_vehicle_assignments x
                    WHERE x.vehicle_id = v.id AND x.status IN ('PENDING','ASSIGNED','IN_PROGRESS'))
                """, Long.class, managerId, status);
    }

    private int countOnRent(long managerId) {
        Long count = jdbc.queryForObject("""
                SELECT COUNT(DISTINCT b.vehicle_id) FROM bookings b
                JOIN fleet_manager_vehicle_access a ON a.vehicle_id = b.vehicle_id
                WHERE a.fleet_manager_id = ? AND UPPER(b.status) IN ('ACTIVE','IN_PROGRESS')
                """, Long.class, managerId);
        return count == null ? 0 : count.intValue();
    }

    private int countUnderMaintenance(long managerId) {
        Long count = jdbc.queryForObject("""
                SELECT COUNT(DISTINCT vehicle_id) FROM fleet_maintenance_records
                WHERE fleet_manager_id = ? AND status IN ('SCHEDULED','IN_PROGRESS')
                """, Long.class, managerId);
        return count == null ? 0 : count.intValue();
    }

    private static List<Map<String, Object>> aggregateUtilization(List<Map<String, Object>> vehicles) {
        Map<String, double[]> sums = new LinkedHashMap<>();
        for (Map<String, Object> vehicle : vehicles) {
            String category = String.valueOf(vehicle.getOrDefault("category", "Uncategorized"));
            double[] values = sums.computeIfAbsent(category, ignored -> new double[2]);
            values[0] += (double) vehicle.get("rental_days");
            values[1] += (double) vehicle.get("available_days");
        }
        List<Map<String, Object>> result = new ArrayList<>();
        sums.forEach((category, values) -> result.add(Map.of(
                "category", category,
                "rental_days", round(values[0]),
                "available_days", round(values[1]),
                "utilization_percent", round(values[1] == 0 ? 0 : values[0] / values[1] * 100))));
        return result;
    }

    private static LocalDateTime toLocalDateTime(Object value) {
        if (value instanceof LocalDateTime dateTime) return dateTime;
        if (value instanceof java.sql.Timestamp timestamp) return timestamp.toLocalDateTime();
        throw new IllegalStateException("Unexpected database timestamp type");
    }

    private static String normalizeMaintenanceType(String value) {
        return value.trim().replaceAll("[\\s-]+", "_").toUpperCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
