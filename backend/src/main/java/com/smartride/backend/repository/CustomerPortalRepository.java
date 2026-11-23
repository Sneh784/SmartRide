package com.smartride.backend.repository;

import com.smartride.backend.dto.CustomerBookingDto;
import com.smartride.backend.service.CustomerKycDocumentStorage;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Repository
public class CustomerPortalRepository {
    private final JdbcTemplate jdbcTemplate;

    public CustomerPortalRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<CustomerBookingDto> findBookings(long customerId) {
        return jdbcTemplate.query("""
                SELECT b.id, b.vehicle_id, b.booking_type, b.status, b.payment_status,
                       b.amount, b.pickup_date, b.return_date,
                       b.pickup_location, b.return_location, b.created_at,
                       EXISTS (SELECT 1 FROM payments p
                               WHERE p.booking_id = b.id AND p.status = 'PENDING'
                                 AND p.provider_order_id IS NOT NULL) AS payment_order_open,
                       COALESCE(v.title, CONCAT_WS(' ', v.brand, v.model), 'Vehicle') AS vehicle_name,
                       EXISTS (SELECT 1 FROM customer_reviews r WHERE r.booking_id = b.id) AS reviewed
                FROM bookings b
                LEFT JOIN vehicles v ON v.id = b.vehicle_id
                WHERE b.customer_id = ?
                ORDER BY b.created_at DESC NULLS LAST, b.id DESC
                """, (rs, rowNum) -> new CustomerBookingDto(
                rs.getLong("id"), rs.getLong("vehicle_id"), rs.getString("vehicle_name"),
                rs.getString("booking_type"), rs.getString("status"), rs.getString("payment_status"),
                rs.getBigDecimal("amount"),
                localDateTime(rs.getTimestamp("pickup_date")),
                localDateTime(rs.getTimestamp("return_date")),
                rs.getString("pickup_location"), rs.getString("return_location"),
                localDateTime(rs.getTimestamp("created_at")), rs.getBoolean("payment_order_open"),
                rs.getBoolean("reviewed")), customerId);
    }

    public List<Map<String, Object>> findPayments(long customerId) {
        return normalizedRows(jdbcTemplate.queryForList("""
                SELECT p.id, p.booking_id AS bookingId, p.amount, p.currency, p.provider,
                       p.payment_id AS paymentReference, p.status, p.created_at AS paymentDate
                FROM payments p
                JOIN bookings b ON b.id = p.booking_id
                WHERE b.customer_id = ?
                ORDER BY p.created_at DESC NULLS LAST, p.id DESC
                """, customerId));
    }

    public List<Map<String, Object>> findWishlist(long customerId) {
        return normalizedRows(jdbcTemplate.queryForList("""
                SELECT v.id, v.title, v.brand, v.model, v.category, v.city,
                       v.daily_rate AS dailyRate, v.rating
                FROM customer_wishlist w
                JOIN vehicles v ON v.id = w.vehicle_id
                WHERE w.customer_id = ?
                ORDER BY w.created_at DESC
                """, customerId));
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
        return normalizedRows(jdbcTemplate.queryForList("""
                SELECT document_type AS documentType, document_last_four AS documentLastFour,
                       document_original_name AS documentOriginalName,
                       status, submitted_at AS submittedAt
                FROM customer_kyc WHERE customer_id = ?
                """, customerId));
    }

    public String kycDocumentKey(long customerId) {
        return jdbcTemplate.query("""
                SELECT document_storage_key FROM customer_kyc WHERE customer_id = ?
                """, rs -> rs.next() ? rs.getString(1) : null, customerId);
    }

    public Map<String, Object> kycDocument(long customerId) {
        try {
            return normalized(jdbcTemplate.queryForMap("""
                    SELECT document_storage_key AS storage_key,
                           document_original_name AS original_name,
                           document_content_type AS content_type
                    FROM customer_kyc WHERE customer_id = ?
                    """, customerId));
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "KYC document not found");
        }
    }

    public void submitKyc(long customerId, String documentType, String documentNumber,
                          CustomerKycDocumentStorage.StoredFile document) {
        String lastFour = documentNumber.substring(documentNumber.length() - 4);
        jdbcTemplate.queryForObject("SELECT id FROM users WHERE id = ? FOR UPDATE", Long.class, customerId);
        int updated = jdbcTemplate.update("""
                UPDATE customer_kyc SET
                    document_type = ?, document_last_four = ?, status = 'PENDING',
                    rejection_reason = NULL, submitted_at = CURRENT_TIMESTAMP,
                    document_storage_key = COALESCE(?, document_storage_key),
                    document_original_name = COALESCE(?, document_original_name),
                    document_content_type = COALESCE(?, document_content_type)
                WHERE customer_id = ?
                """, documentType, lastFour,
                document == null ? null : document.key(),
                document == null ? null : document.originalName(),
                document == null ? null : document.contentType(), customerId);
        if (updated == 0) {
            jdbcTemplate.update("""
                    INSERT INTO customer_kyc (
                        customer_id, document_type, document_last_four, status,
                        document_storage_key, document_original_name, document_content_type, submitted_at
                    )
                    VALUES (?, ?, ?, 'PENDING', ?, ?, ?, CURRENT_TIMESTAMP)
                    """, customerId, documentType, lastFour,
                    document == null ? null : document.key(),
                    document == null ? null : document.originalName(),
                    document == null ? null : document.contentType());
        }
        jdbcTemplate.update("""
                INSERT INTO admin_notifications (title, message, event_type, entity_type, entity_id)
                VALUES ('KYC submission received', ?, 'KYC_SUBMITTED', 'CUSTOMER_KYC', ?)
                """, documentType + " document submitted for review", customerId);
    }

    public List<Map<String, Object>> findNotifications(long customerId) {
        return normalizedRows(jdbcTemplate.queryForList("""
                SELECT id, title, message, is_read AS "read", created_at AS createdAt
                FROM customer_notifications WHERE customer_id = ?
                ORDER BY created_at DESC, id DESC
                """, customerId));
    }

    public boolean markNotificationRead(long customerId, long notificationId) {
        return jdbcTemplate.update("""
                UPDATE customer_notifications SET is_read = TRUE WHERE customer_id = ? AND id = ?
                """, customerId, notificationId) > 0;
    }

    public List<Map<String, Object>> findSupportTickets(long customerId) {
        return normalizedRows(jdbcTemplate.queryForList("""
                SELECT id, subject, message, status, created_at AS createdAt
                FROM customer_support_tickets WHERE customer_id = ?
                ORDER BY created_at DESC, id DESC
                """, customerId));
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

    public void submitReview(long customerId, long bookingId, int rating, String comment) {
        Map<String, Object> booking;
        try {
            booking = normalized(jdbcTemplate.queryForMap("""
                    SELECT id, vehicle_id, status FROM bookings
                    WHERE id = ? AND customer_id = ?
                    """, bookingId, customerId));
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
        String status = String.valueOf(booking.get("status")).toUpperCase(Locale.ROOT);
        if (!List.of("COMPLETED", "RETURNED").contains(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "You can review a booking after the vehicle has been returned");
        }
        try {
            jdbcTemplate.update("""
                    INSERT INTO customer_reviews (booking_id, customer_id, vehicle_id, rating, comment)
                    VALUES (?, ?, ?, ?, ?)
                    """, bookingId, customerId, booking.get("vehicle_id"), rating,
                    comment == null || comment.isBlank() ? null : comment.trim());
        } catch (org.springframework.dao.DuplicateKeyException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You have already reviewed this booking");
        }
        jdbcTemplate.update("""
                UPDATE vehicles SET rating = (
                    SELECT ROUND(AVG(rating), 2) FROM customer_reviews WHERE vehicle_id = ?
                ) WHERE id = ?
                """, booking.get("vehicle_id"), booking.get("vehicle_id"));
    }

    private static java.time.LocalDateTime localDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    private static List<Map<String, Object>> normalizedRows(List<Map<String, Object>> rows) {
        return rows.stream().map(CustomerPortalRepository::normalized).toList();
    }

    private static Map<String, Object> normalized(Map<String, Object> row) {
        Map<String, Object> result = new LinkedHashMap<>();
        row.forEach((key, value) -> result.put(key.toLowerCase(Locale.ROOT), value));
        return result;
    }
}
