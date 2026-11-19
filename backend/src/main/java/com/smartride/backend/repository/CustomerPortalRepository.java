package com.smartride.backend.repository;

import com.smartride.backend.dto.CustomerBookingDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Map;

@Repository
public class CustomerPortalRepository {
    private final JdbcTemplate jdbcTemplate;

    public CustomerPortalRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<CustomerBookingDto> findBookings(long customerId) {
        return jdbcTemplate.query("""
                SELECT b.id, b.booking_type, b.status, b.amount, b.pickup_date, b.return_date,
                       b.pickup_location, b.return_location, b.created_at,
                       COALESCE(v.title, CONCAT_WS(' ', v.brand, v.model), 'Vehicle') AS vehicle_name
                FROM bookings b
                LEFT JOIN vehicles v ON v.id = b.vehicle_id
                WHERE b.customer_id = ?
                ORDER BY b.created_at DESC NULLS LAST, b.id DESC
                """, (rs, rowNum) -> new CustomerBookingDto(
                rs.getLong("id"), rs.getString("vehicle_name"), rs.getString("booking_type"),
                rs.getString("status"), rs.getBigDecimal("amount"),
                localDateTime(rs.getTimestamp("pickup_date")),
                localDateTime(rs.getTimestamp("return_date")),
                rs.getString("pickup_location"), rs.getString("return_location"),
                localDateTime(rs.getTimestamp("created_at"))), customerId);
    }

    public List<Map<String, Object>> findPayments(long customerId) {
        return jdbcTemplate.queryForList("""
                SELECT p.id, p.booking_id AS bookingId, p.amount, p.currency, p.provider,
                       p.payment_id AS paymentReference, p.status, p.created_at AS paymentDate
                FROM payments p
                JOIN bookings b ON b.id = p.booking_id
                WHERE b.customer_id = ?
                ORDER BY p.created_at DESC NULLS LAST, p.id DESC
                """, customerId);
    }

    public List<Map<String, Object>> findVehicles() {
        return jdbcTemplate.queryForList("""
                SELECT id, title, brand, model, category, city, location,
                       daily_rate AS dailyRate, rating, availability_status AS availabilityStatus
                FROM vehicles
                WHERE UPPER(COALESCE(approval_status, 'PENDING')) = 'APPROVED'
                  AND UPPER(COALESCE(availability_status, 'UNAVAILABLE')) = 'AVAILABLE'
                ORDER BY title
                """);
    }

    public List<Map<String, Object>> findWishlist(long customerId) {
        return jdbcTemplate.queryForList("""
                SELECT v.id, v.title, v.brand, v.model, v.category, v.city,
                       v.daily_rate AS dailyRate, v.rating
                FROM customer_wishlist w
                JOIN vehicles v ON v.id = w.vehicle_id
                WHERE w.customer_id = ?
                ORDER BY w.created_at DESC
                """, customerId);
    }

    public void addToWishlist(long customerId, long vehicleId) {
        jdbcTemplate.update("""
                INSERT INTO customer_wishlist (customer_id, vehicle_id)
                VALUES (?, ?)
                ON CONFLICT (customer_id, vehicle_id) DO NOTHING
                """, customerId, vehicleId);
    }

    public boolean removeFromWishlist(long customerId, long vehicleId) {
        return jdbcTemplate.update("DELETE FROM customer_wishlist WHERE customer_id = ? AND vehicle_id = ?",
                customerId, vehicleId) > 0;
    }

    public List<Map<String, Object>> findKyc(long customerId) {
        return jdbcTemplate.queryForList("""
                SELECT document_type AS documentType, document_last_four AS documentLastFour,
                       status, submitted_at AS submittedAt
                FROM customer_kyc WHERE customer_id = ?
                """, customerId);
    }

    public void submitKyc(long customerId, String documentType, String documentNumber) {
        String lastFour = documentNumber.substring(documentNumber.length() - 4);
        jdbcTemplate.update("""
                INSERT INTO customer_kyc (customer_id, document_type, document_last_four, status, submitted_at)
                VALUES (?, ?, ?, 'PENDING', CURRENT_TIMESTAMP)
                ON CONFLICT (customer_id) DO UPDATE SET
                    document_type = EXCLUDED.document_type,
                    document_last_four = EXCLUDED.document_last_four,
                    status = 'PENDING', submitted_at = CURRENT_TIMESTAMP
                """, customerId, documentType, lastFour);
        jdbcTemplate.update("""
                INSERT INTO admin_notifications (title, message, event_type, entity_type, entity_id)
                VALUES ('KYC submission received', ?, 'KYC_SUBMITTED', 'CUSTOMER_KYC', ?)
                """, documentType + " document submitted for review", customerId);
    }

    public List<Map<String, Object>> findNotifications(long customerId) {
        return jdbcTemplate.queryForList("""
                SELECT id, title, message, is_read AS "read", created_at AS createdAt
                FROM customer_notifications WHERE customer_id = ?
                ORDER BY created_at DESC, id DESC
                """, customerId);
    }

    public boolean markNotificationRead(long customerId, long notificationId) {
        return jdbcTemplate.update("""
                UPDATE customer_notifications SET is_read = TRUE WHERE customer_id = ? AND id = ?
                """, customerId, notificationId) > 0;
    }

    public List<Map<String, Object>> findSupportTickets(long customerId) {
        return jdbcTemplate.queryForList("""
                SELECT id, subject, message, status, created_at AS createdAt
                FROM customer_support_tickets WHERE customer_id = ?
                ORDER BY created_at DESC, id DESC
                """, customerId);
    }

    public long createSupportTicket(long customerId, String subject, String message) {
        Long id = jdbcTemplate.queryForObject("""
                INSERT INTO customer_support_tickets (customer_id, subject, message)
                VALUES (?, ?, ?) RETURNING id
                """, Long.class, customerId, subject, message);
        jdbcTemplate.update("""
                INSERT INTO admin_notifications (title, message, event_type, entity_type, entity_id)
                VALUES ('New customer support request', ?, 'CUSTOMER_COMPLAINT', 'SUPPORT_TICKET', ?)
                """, subject, id);
        return id == null ? 0 : id;
    }

    private static java.time.LocalDateTime localDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }
}
