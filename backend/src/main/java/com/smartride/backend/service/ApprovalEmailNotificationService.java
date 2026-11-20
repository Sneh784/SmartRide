package com.smartride.backend.service;

import com.smartride.backend.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class ApprovalEmailNotificationService {
    private static final Logger LOGGER = LoggerFactory.getLogger(ApprovalEmailNotificationService.class);
    private final JdbcTemplate jdbc;
    private final EmailService emailService;
    private final ApplicationEventPublisher events;

    public ApprovalEmailNotificationService(JdbcTemplate jdbc, EmailService emailService,
                                            ApplicationEventPublisher events) {
        this.jdbc = jdbc;
        this.emailService = emailService;
        this.events = events;
    }

    @Transactional
    public void queue(User user, String accountType) {
        String type = normalizeType(accountType);
        Long notificationId = jdbc.queryForObject("""
                INSERT INTO approval_email_notifications
                    (user_id, account_type, recipient_email, recipient_name, status)
                VALUES (?, ?, ?, ?, 'PENDING')
                ON CONFLICT (user_id, account_type) DO UPDATE SET
                    recipient_email = EXCLUDED.recipient_email,
                    recipient_name = EXCLUDED.recipient_name,
                    status = 'PENDING',
                    attempt_count = 0,
                    last_attempt_at = NULL,
                    sent_at = NULL,
                    last_error = NULL,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id
                """, Long.class, user.getId(), type, user.getEmail(), user.getFullName());
        events.publishEvent(new ApprovalEmailQueued(notificationId));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Map<String, Object> deliver(long notificationId) {
        Map<String, Object> notification = jdbc.queryForMap("""
                SELECT account_type, recipient_email, recipient_name, status
                FROM approval_email_notifications WHERE id = ? FOR UPDATE
                """, notificationId);
        String status = String.valueOf(notification.get("status"));
        if (!"PENDING".equals(status)) return status(notificationId);

        String type = String.valueOf(notification.get("account_type"));
        jdbc.update("""
                UPDATE approval_email_notifications
                SET status = 'SENDING', attempt_count = attempt_count + 1,
                    last_attempt_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """, notificationId);
        try {
            if ("VENDOR".equals(type)) {
                emailService.sendVendorApprovalEmail(
                        String.valueOf(notification.get("recipient_name")),
                        String.valueOf(notification.get("recipient_email")));
            } else {
                emailService.sendDriverApprovalEmail(
                        String.valueOf(notification.get("recipient_name")),
                        String.valueOf(notification.get("recipient_email")));
            }
            jdbc.update("""
                    UPDATE approval_email_notifications
                    SET status = 'SENT', sent_at = CURRENT_TIMESTAMP, last_error = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """, notificationId);
            LOGGER.info("Approval email accepted by mail provider for notification {} ({})", notificationId, type);
        } catch (MailException | IllegalStateException exception) {
            jdbc.update("""
                    UPDATE approval_email_notifications
                    SET status = 'FAILED', last_error = 'SMTP delivery failed',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """, notificationId);
            LOGGER.warn("Approval email delivery failed for notification {} ({})", notificationId, type);
        }
        return status(notificationId);
    }

    public Map<String, Object> status(long userId, String accountType) {
        String type = normalizeType(accountType);
        try {
            Long id = jdbc.queryForObject("""
                    SELECT id FROM approval_email_notifications WHERE user_id = ? AND account_type = ?
                    """, Long.class, userId, type);
            return status(id);
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            return Map.of("emailStatus", "NOT_SENT");
        }
    }

    @Transactional
    public Map<String, Object> retry(long userId, String accountType) {
        String type = normalizeType(accountType);
        Map<String, Object> notification;
        try {
            notification = jdbc.queryForMap("""
                    SELECT id, status FROM approval_email_notifications
                    WHERE user_id = ? AND account_type = ?
                    """, userId, type);
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Approval email record not found");
        }
        if (!"FAILED".equals(notification.get("status"))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only failed approval emails can be retried");
        }
        long id = ((Number) notification.get("id")).longValue();
        if (jdbc.update("""
                UPDATE approval_email_notifications
                SET status = 'PENDING', last_error = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'FAILED'
                """, id) == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Approval email is already being retried");
        }
        return deliver(id);
    }

    private Map<String, Object> status(long notificationId) {
        Map<String, Object> row = jdbc.queryForMap("""
                SELECT status, attempt_count, last_attempt_at, sent_at
                FROM approval_email_notifications WHERE id = ?
                """, notificationId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("emailStatus", row.get("status"));
        result.put("emailAttemptCount", row.get("attempt_count"));
        result.put("emailLastAttemptAt", row.get("last_attempt_at"));
        result.put("emailSentAt", row.get("sent_at"));
        return result;
    }

    private static String normalizeType(String accountType) {
        String type = accountType.toUpperCase(Locale.ROOT);
        if (!"VENDOR".equals(type) && !"DRIVER".equals(type)) {
            throw new IllegalArgumentException("Unsupported approval email type");
        }
        return type;
    }
}
