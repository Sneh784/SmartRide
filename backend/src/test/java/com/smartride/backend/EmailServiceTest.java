package com.smartride.backend;

import com.smartride.backend.service.EmailService;
import jakarta.mail.Message;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailServiceTest {
    @Test
    void driverEmailUsesRegisteredRecipientDynamicNameAndConfiguredLoginLink() throws Exception {
        JavaMailSender sender = mock(JavaMailSender.class);
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        when(sender.createMimeMessage()).thenReturn(message);
        EmailService service = new EmailService(sender, "notifications@example.com", "https://app.example/");

        service.sendDriverApprovalEmail("<Driver>", "driver@example.com");

        verify(sender).send(message);
        assertEquals("Your SmartRide Driver Profile Has Been Approved!", message.getSubject());
        assertEquals("driver@example.com", message.getRecipients(Message.RecipientType.TO)[0].toString());
        String html = content(message);
        assertTrue(html.contains("Dear &lt;Driver&gt;"));
        assertTrue(html.contains("https://app.example/driver/login"));
    }

    private static String content(Part part) throws Exception {
        Object value = part.getContent();
        if (value instanceof Multipart multipart) {
            StringBuilder result = new StringBuilder();
            for (int index = 0; index < multipart.getCount(); index++) {
                result.append(content(multipart.getBodyPart(index)));
            }
            return result.toString();
        }
        if (value instanceof String text) return text;
        try (var input = part.getInputStream()) {
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
