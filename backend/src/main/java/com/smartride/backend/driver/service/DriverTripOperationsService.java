package com.smartride.backend.driver.service;

import com.smartride.backend.driver.dto.DriverTripStatusRequest;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class DriverTripOperationsService {
    private static final Set<String> TRIP_STATUSES = Set.of(
            "PENDING", "ACCEPTED", "DECLINED", "IN_PROGRESS", "COMPLETED");

    private final JdbcTemplate jdbc;
    private final UserRepository users;

    public DriverTripOperationsService(JdbcTemplate jdbc, UserRepository users) {
        this.jdbc = jdbc;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dashboard(String email) {
        User driver = requireDriver(email);
        List<Map<String, Object>> trips = loadTrips(driver.getId(), "");
        long pending = countStatus(trips, "PENDING");
        long upcoming = countStatus(trips, "ACCEPTED");
        long inProgress = countStatus(trips, "IN_PROGRESS");
        long completed = countStatus(trips, "COMPLETED");
        BigDecimal earnings = trips.stream()
                .filter(trip -> "COMPLETED".equals(trip.get("trip_status")))
                .map(trip -> (BigDecimal) trip.get("estimated_earnings"))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("driverName", driver.getFullName());
        result.put("pendingTrips", pending);
        result.put("upcomingTrips", upcoming);
        result.put("activeTrips", inProgress);
        result.put("completedTrips", completed);
        result.put("earnings", earnings.setScale(2, RoundingMode.HALF_UP));
        result.put("trips", trips);
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> trips(String email, String status) {
        User driver = requireDriver(email);
        String normalizedStatus = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        if (!normalizedStatus.isEmpty() && !TRIP_STATUSES.contains(normalizedStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid trip status");
        }
        return loadTrips(driver.getId(), normalizedStatus);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> earnings(String email) {
        User driver = requireDriver(email);
        List<Map<String, Object>> completedTrips = loadTrips(driver.getId(), "COMPLETED");
        BigDecimal total = completedTrips.stream()
                .map(trip -> (BigDecimal) trip.get("estimated_earnings"))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", total);
        result.put("completedTrips", completedTrips.size());
        result.put("items", completedTrips);
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> trip(String email, long assignmentId) {
        User driver = requireDriver(email);
        try {
            return withEarnings(jdbc.queryForMap("""
                    SELECT a.id AS assignment_id, b.id AS booking_id, a.status AS trip_status,
                           b.status AS booking_status, b.booking_type, b.pickup_date, b.return_date,
                           b.pickup_location, b.return_location, b.amount AS booking_amount,
                           v.title AS vehicle_name, v.brand, v.model, v.registration_number,
                           v.with_driver_rate, v.daily_rate,
                           c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
                           a.assigned_at, a.responded_at, a.completed_at
                    FROM driver_trip_assignments a
                    JOIN bookings b ON b.id = a.booking_id
                    JOIN vehicles v ON v.id = b.vehicle_id
                    LEFT JOIN users c ON c.id = b.customer_id
                    WHERE a.driver_id = ? AND a.id = ?
                    """, driver.getId(), assignmentId));
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found");
        }
    }

    @Transactional
    public Map<String, Object> updateTripStatus(String email, long assignmentId, DriverTripStatusRequest request) {
        User driver = requireDriver(email);
        String nextStatus = request.status().trim().toUpperCase(Locale.ROOT);
        if (!Set.of("ACCEPTED", "DECLINED", "IN_PROGRESS", "COMPLETED").contains(nextStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported trip status");
        }

        Map<String, Object> trip;
        try {
            trip = normalize(jdbc.queryForMap("""
                    SELECT a.id AS assignment_id, a.booking_id, a.driver_id, a.fleet_manager_id,
                           a.status AS trip_status, b.customer_id, b.status AS booking_status
                    FROM driver_trip_assignments a
                    JOIN bookings b ON b.id = a.booking_id
                    WHERE a.id = ? AND a.driver_id = ?
                    FOR UPDATE
                    """, assignmentId, driver.getId()));
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found");
        }

        String currentStatus = String.valueOf(trip.get("trip_status")).toUpperCase(Locale.ROOT);
        String bookingStatus = String.valueOf(trip.get("booking_status")).toUpperCase(Locale.ROOT);
        boolean validTransition = switch (currentStatus) {
            case "PENDING" -> Set.of("ACCEPTED", "DECLINED").contains(nextStatus)
                    && "CONFIRMED".equals(bookingStatus);
            case "ACCEPTED" -> "IN_PROGRESS".equals(nextStatus) && "CONFIRMED".equals(bookingStatus);
            case "IN_PROGRESS" -> "COMPLETED".equals(nextStatus)
                    && Set.of("ACTIVE", "IN_PROGRESS").contains(bookingStatus);
            default -> false;
        };
        if (!validTransition) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This trip can no longer be changed to " + nextStatus.toLowerCase(Locale.ROOT));
        }

        long bookingId = ((Number) trip.get("booking_id")).longValue();
        if ("IN_PROGRESS".equals(nextStatus)) {
            int updated = jdbc.update("""
                    UPDATE bookings SET status = 'ACTIVE'
                    WHERE id = ? AND UPPER(status) = 'CONFIRMED'
                    """, bookingId);
            if (updated == 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "The booking is no longer confirmed");
            }
            jdbc.update("""
                    INSERT INTO driver_preferences (user_id, is_available, updated_at)
                    VALUES (?, FALSE, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id) DO UPDATE
                    SET is_available = FALSE, updated_at = CURRENT_TIMESTAMP
                    """, driver.getId());
        } else if ("COMPLETED".equals(nextStatus)) {
            int updated = jdbc.update("""
                    UPDATE bookings SET status = 'COMPLETED'
                    WHERE id = ? AND UPPER(status) IN ('ACTIVE', 'IN_PROGRESS')
                    """, bookingId);
            if (updated == 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "The booking is no longer active");
            }
        }

        jdbc.update("""
                UPDATE driver_trip_assignments
                SET status = ?, updated_at = CURRENT_TIMESTAMP,
                    responded_at = CASE WHEN ? IN ('ACCEPTED', 'DECLINED') THEN CURRENT_TIMESTAMP ELSE responded_at END,
                    completed_at = CASE WHEN ? = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE completed_at END
                WHERE id = ? AND driver_id = ?
                """, nextStatus, nextStatus, nextStatus, assignmentId, driver.getId());

        Object customerId = trip.get("customer_id");
        if ("ACCEPTED".equals(nextStatus) && customerId != null) {
            jdbc.update("""
                    INSERT INTO customer_notifications (customer_id, title, message)
                    VALUES (?, 'Driver accepted your trip', ?)
                    """, customerId, driver.getFullName() + " accepted your trip.");
        } else if ("DECLINED".equals(nextStatus)) {
            jdbc.update("""
                    INSERT INTO fleet_manager_notifications (user_id, notification_type, title, message)
                    VALUES (?, 'DRIVER_TRIP_DECLINED', 'Driver declined a trip', ?)
                    """, trip.get("fleet_manager_id"), "Driver " + driver.getFullName()
                    + " declined booking #" + bookingId + ". Reassign the trip from Trip dispatch.");
        }

        trip.put("trip_status", nextStatus);
        if ("IN_PROGRESS".equals(nextStatus)) trip.put("booking_status", "ACTIVE");
        if ("COMPLETED".equals(nextStatus)) trip.put("booking_status", "COMPLETED");
        return trip;
    }

    private List<Map<String, Object>> loadTrips(long driverId, String status) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT a.id AS assignment_id, b.id AS booking_id, a.status AS trip_status,
                       b.status AS booking_status, b.booking_type, b.pickup_date, b.return_date,
                       b.pickup_location, b.return_location, b.amount AS booking_amount,
                       v.title AS vehicle_name, v.brand, v.model, v.registration_number,
                       v.with_driver_rate, v.daily_rate,
                       c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
                       a.assigned_at, a.responded_at, a.completed_at
                FROM driver_trip_assignments a
                JOIN bookings b ON b.id = a.booking_id
                JOIN vehicles v ON v.id = b.vehicle_id
                LEFT JOIN users c ON c.id = b.customer_id
                WHERE a.driver_id = ? AND (? = '' OR UPPER(a.status) = ?)
                ORDER BY CASE UPPER(a.status)
                           WHEN 'PENDING' THEN 0 WHEN 'IN_PROGRESS' THEN 1
                           WHEN 'ACCEPTED' THEN 2 ELSE 3 END,
                         b.pickup_date, a.id DESC
                LIMIT 500
                """, driverId, status, status);
        return rows.stream().map(DriverTripOperationsService::withEarnings).toList();
    }

    private static Map<String, Object> withEarnings(Map<String, Object> source) {
        Map<String, Object> trip = normalize(source);
        Object rateValue = trip.get("with_driver_rate");
        if (!(rateValue instanceof Number)) rateValue = trip.get("daily_rate");
        BigDecimal dailyRate = rateValue instanceof BigDecimal decimal ? decimal
                : rateValue instanceof Number number ? BigDecimal.valueOf(number.doubleValue()) : BigDecimal.ZERO;
        LocalDateTime pickup = toLocalDateTime(trip.get("pickup_date"));
        LocalDateTime dropoff = toLocalDateTime(trip.get("return_date"));
        long seconds = Duration.between(pickup, dropoff).getSeconds();
        long billableDays = Math.max(1, (seconds + 86_399) / 86_400);
        trip.put("estimated_earnings", dailyRate.multiply(BigDecimal.valueOf(billableDays))
                .setScale(2, RoundingMode.HALF_UP));
        return trip;
    }

    private static LocalDateTime toLocalDateTime(Object value) {
        if (value instanceof LocalDateTime dateTime) return dateTime;
        if (value instanceof Timestamp timestamp) return timestamp.toLocalDateTime();
        return LocalDateTime.parse(String.valueOf(value));
    }

    private User requireDriver(String email) {
        return users.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .filter(user -> user.getRole() == RoleName.DRIVER && user.isActive()
                        && "APPROVED".equalsIgnoreCase(user.getApprovalStatus()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "An active approved driver account is required"));
    }

    private static long countStatus(List<Map<String, Object>> trips, String status) {
        return trips.stream().filter(trip -> status.equals(trip.get("trip_status"))).count();
    }

    private static Map<String, Object> normalize(Map<String, Object> row) {
        Map<String, Object> result = new LinkedHashMap<>();
        row.forEach((key, value) -> result.put(key.toLowerCase(Locale.ROOT), value));
        return result;
    }
}
