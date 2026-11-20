package com.smartride.backend.service;

import com.smartride.backend.dto.CreateBookingRequest;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.Statement;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class CustomerBookingService {
    private final JdbcTemplate jdbc;
    private final UserRepository users;

    public CustomerBookingService(JdbcTemplate jdbc, UserRepository users) {
        this.jdbc = jdbc;
        this.users = users;
    }

    @Transactional
    public Map<String, Object> create(String email, CreateBookingRequest request) {
        User customer = requireCustomer(email);
        String type = request.bookingType().trim().toUpperCase(Locale.ROOT);
        if (!Set.of("WITH_DRIVER", "WITHOUT_DRIVER").contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid booking type");
        }

        LocalDateTime now = LocalDateTime.now();
        if (!request.pickupDate().isAfter(now) || !request.returnDate().isAfter(request.pickupDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Choose a future pickup time and a return time after pickup");
        }
        Duration rentalDuration = Duration.between(request.pickupDate(), request.returnDate());
        if (rentalDuration.compareTo(Duration.ofDays(30)) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bookings cannot exceed 30 days");
        }

        Map<String, Object> vehicle = availableVehicle(request.vehicleId(), true);
        BigDecimal withDriverRate = (BigDecimal) vehicle.get("with_driver_rate");
        BigDecimal dailyRate = type.equals("WITH_DRIVER") && withDriverRate != null
                ? withDriverRate : (BigDecimal) vehicle.get("daily_rate");
        if (dailyRate == null || dailyRate.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This vehicle is not available for online booking");
        }
        Integer conflicts = jdbc.queryForObject("""
                SELECT COUNT(*) FROM bookings
                WHERE vehicle_id = ?
                  AND UPPER(status) IN ('PENDING', 'CONFIRMED', 'ACTIVE', 'IN_PROGRESS')
                  AND pickup_date < ? AND return_date > ?
                """, Integer.class, request.vehicleId(), request.returnDate(), request.pickupDate());
        if (conflicts != null && conflicts > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This vehicle is already requested or reserved for those dates");
        }

        long billableDays = Math.max(1, (rentalDuration.toSeconds() + 86_399) / 86_400);
        BigDecimal amount = dailyRate.multiply(BigDecimal.valueOf(billableDays)).setScale(2);
        String insert = """
                INSERT INTO bookings (
                    customer_id, vehicle_id, booking_type, pickup_date, return_date,
                    pickup_location, return_location, status, amount, payment_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, 'PENDING')
                """;
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement(insert, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, customer.getId());
            statement.setLong(2, request.vehicleId());
            statement.setString(3, type);
            statement.setObject(4, request.pickupDate());
            statement.setObject(5, request.returnDate());
            statement.setString(6, request.pickupLocation().trim());
            statement.setString(7, request.returnLocation().trim());
            statement.setBigDecimal(8, amount);
            return statement;
        }, keyHolder);
        Number generatedId = generatedId(keyHolder);
        long bookingId = generatedId.longValue();

        jdbc.update("""
                INSERT INTO customer_notifications (customer_id, title, message)
                VALUES (?, 'Booking request sent', ?)
                """, customer.getId(), "Your request for " + vehicle.get("title")
                + " is waiting for vendor confirmation.");
        Object vendorId = vehicle.get("vendor_id");
        if (vendorId instanceof Number) {
            jdbc.update("""
                    INSERT INTO vendor_notifications (user_id, title, message)
                    VALUES (?, 'New booking request', ?)
                    """, vendorId, customer.getFullName() + " requested " + vehicle.get("title"));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", bookingId);
        result.put("vehicleId", request.vehicleId());
        result.put("vehicleName", vehicle.get("title"));
        result.put("bookingType", type);
        result.put("pickupDate", request.pickupDate());
        result.put("returnDate", request.returnDate());
        result.put("amount", amount);
        result.put("status", "PENDING");
        result.put("paymentStatus", "PENDING");
        return result;
    }

    @Transactional
    public void cancel(String email, long bookingId) {
        User customer = requireCustomer(email);
        Map<String, Object> booking;
        try {
            booking = normalized(jdbc.queryForMap("""
                    SELECT b.id, b.customer_id, b.status, b.payment_status, v.title AS vehicle_name,
                           v.vendor_id
                    FROM bookings b
                    JOIN vehicles v ON v.id = b.vehicle_id
                    WHERE b.id = ?
                    FOR UPDATE
                    """, bookingId));
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
        if (((Number) booking.get("customer_id")).longValue() != customer.getId()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
        String status = String.valueOf(booking.get("status")).toUpperCase(Locale.ROOT);
        String paymentStatus = String.valueOf(booking.get("payment_status")).toUpperCase(Locale.ROOT);
        if (!Set.of("PENDING", "CONFIRMED").contains(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only pending or confirmed bookings can be cancelled");
        }
        if (Set.of("PAID", "SUCCESS", "SUCCEEDED", "COMPLETED").contains(paymentStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This booking is paid. Submit a refund request through Support so the team can review the cancellation policy.");
        }
        Integer openPaymentOrders = jdbc.queryForObject("""
                SELECT COUNT(*) FROM payments
                WHERE booking_id = ? AND status = 'PENDING' AND provider_order_id IS NOT NULL
                """, Integer.class, bookingId);
        if (openPaymentOrders != null && openPaymentOrders > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A payment order is open for this booking. Contact Support to request cancellation.");
        }

        jdbc.update("UPDATE bookings SET status = 'CANCELLED' WHERE id = ?", bookingId);
        jdbc.update("""
                INSERT INTO customer_notifications (customer_id, title, message)
                VALUES (?, 'Booking cancelled', ?)
                """, customer.getId(), "Your booking for " + booking.get("vehicle_name") + " was cancelled.");
        Object vendorId = booking.get("vendor_id");
        if (vendorId instanceof Number) {
            jdbc.update("""
                    INSERT INTO vendor_notifications (user_id, title, message)
                    VALUES (?, 'Booking cancelled', ?)
                    """, vendorId, "Booking #" + bookingId + " was cancelled by the customer.");
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> availableVehicle(String email, long vehicleId) {
        requireCustomer(email);
        return availableVehicle(vehicleId, false);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> booking(String email, long bookingId) {
        User customer = requireCustomer(email);
        try {
            return normalized(jdbc.queryForMap("""
                    SELECT b.id, b.vehicle_id, v.title AS vehicle_name, b.booking_type, b.status,
                           b.payment_status, b.amount, b.pickup_date, b.return_date,
                           b.pickup_location, b.return_location, b.created_at
                    FROM bookings b
                    JOIN vehicles v ON v.id = b.vehicle_id
                    WHERE b.id = ? AND b.customer_id = ?
                    """, bookingId, customer.getId()));
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
    }

    private Map<String, Object> availableVehicle(long vehicleId, boolean lock) {
        String lockClause = lock ? " FOR UPDATE" : "";
        try {
            return normalized(jdbc.queryForMap("""
                    SELECT id, vendor_id, title, brand, model, category, city, location,
                           daily_rate, with_driver_rate, rating, availability_status
                    FROM vehicles
                    WHERE id = ?
                      AND UPPER(COALESCE(approval_status, 'PENDING')) = 'APPROVED'
                      AND UPPER(COALESCE(availability_status, 'UNAVAILABLE')) = 'AVAILABLE'
                    """ + lockClause, vehicleId));
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Vehicle not found or is no longer available");
        }
    }

    private User requireCustomer(String email) {
        return users.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .filter(user -> user.isActive() && user.getRole() == RoleName.CUSTOMER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "An active customer account is required"));
    }

    private static Number generatedId(KeyHolder keyHolder) {
        if (keyHolder.getKeys() != null) {
            Number generatedId = keyHolder.getKeys().entrySet().stream()
                    .filter(entry -> "id".equalsIgnoreCase(entry.getKey()))
                    .map(Map.Entry::getValue)
                    .filter(Number.class::isInstance)
                    .map(Number.class::cast)
                    .findFirst()
                    .orElse(null);
            if (generatedId != null) return generatedId;
        }
        Number generatedId = keyHolder.getKey();
        if (generatedId != null) return generatedId;
        throw new IllegalStateException("Booking insert did not return an ID");
    }

    private static Map<String, Object> normalized(Map<String, Object> row) {
        Map<String, Object> result = new LinkedHashMap<>();
        row.forEach((key, value) -> result.put(key.toLowerCase(Locale.ROOT), value));
        return result;
    }
}
