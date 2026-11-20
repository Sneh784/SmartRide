package com.smartride.backend;

import com.smartride.backend.service.ApprovalEmailNotificationService;
import com.smartride.backend.service.EmailService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailSendException;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApprovalEmailNotificationServiceTest {
    @Mock private JdbcTemplate jdbc;
    @Mock private EmailService emailService;
    @Mock private ApplicationEventPublisher events;

    @Test
    void recordsProviderAcceptedEmailAsSent() {
        when(jdbc.queryForMap(contains("FOR UPDATE"), eq(17L))).thenReturn(notification("VENDOR", "PENDING"));
        when(jdbc.queryForMap(contains("SELECT status, attempt_count"), eq(17L)))
                .thenReturn(Map.of("status", "SENT", "attempt_count", 1, "last_attempt_at", "now", "sent_at", "now"));

        var result = service().deliver(17L);

        verify(emailService).sendVendorApprovalEmail("Vendor Name", "vendor@example.com");
        verify(jdbc).update(contains("SET status = 'SENT'"), eq(17L));
        assertEquals("SENT", result.get("emailStatus"));
    }

    @Test
    void recordsMailFailureWithoutThrowingOrChangingApproval() {
        when(jdbc.queryForMap(contains("FOR UPDATE"), eq(18L))).thenReturn(notification("DRIVER", "PENDING"));
        when(jdbc.queryForMap(contains("SELECT status, attempt_count"), eq(18L)))
                .thenReturn(Map.of("status", "FAILED", "attempt_count", 1, "last_attempt_at", "now", "sent_at", ""));
        doThrow(new MailSendException("SMTP authentication failed"))
                .when(emailService).sendDriverApprovalEmail("Driver Name", "driver@example.com");

        var result = service().deliver(18L);

        verify(jdbc).update(contains("SET status = 'FAILED'"), eq(18L));
        assertEquals("FAILED", result.get("emailStatus"));
    }

    private ApprovalEmailNotificationService service() {
        return new ApprovalEmailNotificationService(jdbc, emailService, events);
    }

    private static Map<String, Object> notification(String type, String status) {
        return Map.of("account_type", type, "recipient_email", type.toLowerCase() + "@example.com",
                "recipient_name", type.equals("VENDOR") ? "Vendor Name" : "Driver Name", "status", status);
    }
}
