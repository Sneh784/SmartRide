package com.smartride.backend.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Repository
public class AdminPortalRepository {
    private final JdbcTemplate jdbc;

    public AdminPortalRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Map<String, Object> dashboard() {
        return jdbc.queryForMap("""
                SELECT
                  (SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER') AS customers,
                  (SELECT COUNT(*) FROM users WHERE role = 'VENDOR') AS vendors,
                  (SELECT COUNT(*) FROM users WHERE role = 'DRIVER') AS drivers,
                  (SELECT COUNT(*) FROM users WHERE role = 'FLEET_MANAGER') AS fleet_managers,
                  (SELECT COUNT(*) FROM vehicles) AS vehicles,
                  ((SELECT COUNT(*) FROM users WHERE role IN ('VENDOR','DRIVER','FLEET_MANAGER') AND approval_status = 'PENDING')
                    + (SELECT COUNT(*) FROM vehicles WHERE approval_status = 'PENDING')) AS pending_approvals,
                  (SELECT COUNT(*) FROM bookings) AS bookings,
                  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE UPPER(status) IN ('SUCCESS','SUCCEEDED','COMPLETED')) AS revenue,
                  (SELECT COUNT(*) FROM bookings WHERE UPPER(status) = 'PENDING') AS pending_bookings,
                  (SELECT COUNT(*) FROM bookings WHERE UPPER(status) IN ('ACTIVE','IN_PROGRESS','IN PROGRESS')) AS active_bookings,
                  (SELECT COUNT(*) FROM bookings WHERE UPPER(status) IN ('COMPLETED','RETURNED')) AS completed_bookings,
                  (SELECT COUNT(*) FROM bookings WHERE UPPER(status) IN ('CANCELLED','CANCELED')) AS cancelled_bookings
                """);
    }

    public List<Map<String, Object>> revenue(String period) {
        return jdbc.queryForList("""
                SELECT date_trunc(?, p.created_at) AS period,
                       COALESCE(SUM(p.amount), 0) AS revenue,
                       COUNT(*) AS transactions
                FROM payments p
                WHERE UPPER(p.status) IN ('SUCCESS','SUCCEEDED','COMPLETED')
                GROUP BY date_trunc(?, p.created_at)
                ORDER BY period DESC
                LIMIT 24
                """, period, period);
    }

    public List<Map<String, Object>> recentActivity() {
        return jdbc.queryForList("""
                (SELECT 'New account' AS title, full_name AS description, role AS type,
                        created_at AS occurred_at FROM users ORDER BY created_at DESC LIMIT 5)
                UNION ALL
                (SELECT 'New booking' AS title, CONCAT('Booking #', id) AS description, 'BOOKING' AS type,
                        created_at AS occurred_at FROM bookings ORDER BY created_at DESC LIMIT 5)
                UNION ALL
                (SELECT 'Payment recorded' AS title, CONCAT('Payment #', id) AS description, 'PAYMENT' AS type,
                        created_at AS occurred_at FROM payments ORDER BY created_at DESC LIMIT 5)
                ORDER BY occurred_at DESC NULLS LAST LIMIT 12
                """);
    }

    public List<Map<String, Object>> users(String role, String status, String search) {
        return jdbc.queryForList("""
                SELECT id, full_name AS name, email, phone, role,
                       COALESCE(approval_status, CASE WHEN is_active THEN 'ACTIVE' ELSE 'SUSPENDED' END) AS status,
                       approval_reason AS reason, created_at AS created_at
                FROM users
                WHERE role = ?
                  AND (? = '' OR COALESCE(approval_status, CASE WHEN is_active THEN 'ACTIVE' ELSE 'SUSPENDED' END) = ?)
                  AND (? = '' OR LOWER(full_name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?))
                ORDER BY created_at DESC NULLS LAST, id DESC
                """, role, status, status, search, "%" + search + "%", "%" + search + "%");
    }

    public String userRole(long id) {
        return jdbc.queryForObject("SELECT role FROM users WHERE id = ?", String.class, id);
    }

    public int setUserStatus(long id, String role, String status, String reason) {
        boolean active = "ACTIVE".equals(status) || "APPROVED".equals(status);
        return jdbc.update("""
                UPDATE users SET approval_status = ?, approval_reason = ?, is_active = ? WHERE id = ? AND role = ?
                """, status, reason, active, id, role);
    }

    public void audit(String adminEmail, String action, String entityType, long entityId, String reason) {
        jdbc.update("""
                INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, reason)
                SELECT id, ?, ?, ?, ? FROM users WHERE LOWER(email) = LOWER(?)
                """, action, entityType, entityId, reason, adminEmail);
    }

    public List<Map<String, Object>> vehicles(String status, String search) {
        return jdbc.queryForList("""
                SELECT id, title, brand, model, category, city, location, daily_rate,
                       availability_status, approval_status, approval_reason
                FROM vehicles
                WHERE (? = '' OR COALESCE(approval_status, 'PENDING') = ?)
                  AND (? = '' OR LOWER(title) LIKE LOWER(?) OR LOWER(brand) LIKE LOWER(?) OR LOWER(model) LIKE LOWER(?))
                ORDER BY id DESC
                """, status, status, search, "%" + search + "%", "%" + search + "%", "%" + search + "%");
    }

    public int setVehicleStatus(long id, String status, String reason) {
        String availability = "APPROVED".equals(status) ? "AVAILABLE" : "UNAVAILABLE";
        return jdbc.update("""
                UPDATE vehicles SET approval_status = ?, approval_reason = ?, availability_status = ? WHERE id = ?
                """, status, reason, availability, id);
    }

    public List<Map<String, Object>> bookings(String status, String search) {
        return jdbc.queryForList("""
                SELECT b.id, b.status, b.booking_type, b.amount, b.payment_status,
                       b.pickup_date, b.return_date, b.created_at,
                       u.full_name AS customer_name, u.email AS customer_email,
                       v.title AS vehicle_name, v.vendor_id
                FROM bookings b
                LEFT JOIN users u ON u.id = b.customer_id
                LEFT JOIN vehicles v ON v.id = b.vehicle_id
                WHERE (? = '' OR UPPER(b.status) = UPPER(?))
                  AND (? = '' OR CAST(b.id AS VARCHAR) = ? OR LOWER(u.email) LIKE LOWER(?))
                ORDER BY b.created_at DESC NULLS LAST, b.id DESC
                LIMIT 500
                """, status, status, search, search, "%" + search + "%");
    }

    public List<Map<String, Object>> payments(String status, String search) {
        return jdbc.queryForList("""
                SELECT p.id AS transaction_id, p.booking_id, p.amount, p.currency, p.provider,
                       p.payment_id, p.status, p.created_at AS payment_date,
                       u.full_name AS customer_name, u.email AS customer_email
                FROM payments p
                LEFT JOIN bookings b ON b.id = p.booking_id
                LEFT JOIN users u ON u.id = b.customer_id
                WHERE (? = '' OR UPPER(p.status) = UPPER(?))
                  AND (? = '' OR CAST(p.id AS VARCHAR) = ? OR CAST(p.booking_id AS VARCHAR) = ? OR LOWER(u.email) LIKE LOWER(?))
                ORDER BY p.created_at DESC NULLS LAST, p.id DESC
                LIMIT 500
                """, status, status, search, search, search, "%" + search + "%");
    }

    public List<Map<String, Object>> kyc(String status) {
        return jdbc.queryForList("""
                SELECT k.customer_id AS id, k.document_type, k.document_last_four,
                       k.document_original_name,
                       CASE WHEN k.document_storage_key IS NULL THEN FALSE ELSE TRUE END AS has_document,
                       k.status, k.rejection_reason, k.submitted_at,
                       u.full_name AS customer_name, u.email
                FROM customer_kyc k JOIN users u ON u.id = k.customer_id
                WHERE (? = '' OR UPPER(k.status) = UPPER(?))
                ORDER BY k.submitted_at DESC
                """, status, status).stream().map(AdminPortalRepository::normalized).toList();
    }

    public int setKycStatus(long customerId, String status, String reason) {
        return jdbc.update("""
                UPDATE customer_kyc SET status = ?, rejection_reason = ? WHERE customer_id = ?
                """, status, reason, customerId);
    }

    public List<Map<String, Object>> support(String status) {
        return jdbc.queryForList("""
                SELECT t.id, t.subject, t.message, t.status, t.created_at,
                       u.full_name AS customer_name, u.email
                FROM customer_support_tickets t JOIN users u ON u.id = t.customer_id
                WHERE (? = '' OR UPPER(t.status) = UPPER(?))
                ORDER BY t.created_at DESC
                """, status, status);
    }

    public int setSupportStatus(long ticketId, String status, String adminEmail) {
        int changed = jdbc.update("UPDATE customer_support_tickets SET status = ? WHERE id = ?", status, ticketId);
        if (changed > 0) audit(adminEmail, "SET_STATUS_" + status, "SUPPORT_TICKET", ticketId, null);
        return changed;
    }

    public List<Map<String, Object>> notifications() {
        return jdbc.queryForList("""
                SELECT id, title, message, event_type, entity_type, entity_id, is_read, created_at
                FROM admin_notifications ORDER BY created_at DESC, id DESC LIMIT 200
                """);
    }

    public long unreadNotifications() {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM admin_notifications WHERE is_read = FALSE", Long.class);
        return count == null ? 0 : count;
    }

    public int markNotificationRead(long id) {
        return jdbc.update("UPDATE admin_notifications SET is_read = TRUE WHERE id = ?", id);
    }

    public Map<String, Object> adminProfile(String email) {
        return jdbc.queryForMap("""
                SELECT id, full_name AS name, email, role FROM users WHERE LOWER(email) = LOWER(?)
                """, email);
    }

    public List<Map<String, Object>> settings() {
        return jdbc.queryForList("SELECT setting_key, setting_value, updated_at FROM platform_settings ORDER BY setting_key");
    }

    public void saveSetting(String email, long adminId, String key, String value) {
        jdbc.update("""
                INSERT INTO platform_settings (setting_key, setting_value, updated_by, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value,
                    updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP
                """, key, value, adminId);
        audit(email, "UPDATE_SETTING", "SETTING", 0, key);
    }

    public int changePassword(long adminId, String passwordHash) {
        return jdbc.update("UPDATE users SET password_hash = ? WHERE id = ? AND role = 'ADMIN'", passwordHash, adminId);
    }

    public void updateAdminName(long adminId, String name) {
        jdbc.update("UPDATE users SET full_name = ? WHERE id = ? AND role = 'ADMIN'", name, adminId);
    }

    public void addNotification(String title, String message, String eventType, String entityType, Long entityId) {
        jdbc.update("""
                INSERT INTO admin_notifications (title, message, event_type, entity_type, entity_id)
                VALUES (?, ?, ?, ?, ?)
                """, title, message, eventType, entityType, entityId);
    }

    private static Map<String, Object> normalized(Map<String, Object> row) {
        Map<String, Object> result = new LinkedHashMap<>();
        row.forEach((key, value) -> result.put(key.toLowerCase(Locale.ROOT), value));
        return result;
    }
}
