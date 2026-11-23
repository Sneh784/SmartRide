package com.smartride.backend.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;

@Service
public class EmailService {
    private static final Map<String, String> SUBJECTS = Map.of(
            "VENDOR", "Your SmartRide Vendor Profile Has Been Approved!",
            "DRIVER", "Your SmartRide Driver Profile Has Been Approved!");
    private static final Map<String, String> TEMPLATES = Map.of(
            "VENDOR", "templates/vendor-approval.html",
            "DRIVER", "templates/driver-approval.html");
    private final JavaMailSender mailSender;
    private final String sender;
    private final String frontendUrl;

    public EmailService(JavaMailSender mailSender,
                        @Value("${spring.mail.username:}") String sender,
                        @Value("${smartride.frontend.url:http://localhost:5173}") String frontendUrl) {
        this.mailSender = mailSender;
        this.sender = sender;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    public void sendVendorApprovalEmail(String name, String email) {
        sendApprovalEmail("VENDOR", name, email);
    }

    public void sendDriverApprovalEmail(String name, String email) {
        sendApprovalEmail("DRIVER", name, email);
    }

    private void sendApprovalEmail(String accountType, String name, String email) {
        String normalizedType = accountType.toUpperCase(Locale.ROOT);
        String templatePath = TEMPLATES.get(normalizedType);
        String subject = SUBJECTS.get(normalizedType);
        if (templatePath == null || subject == null) {
            throw new IllegalArgumentException("Unsupported approval email type");
        }

        String loginUrl = frontendUrl + (normalizedType.equals("VENDOR") ? "/vendor/login" : "/driver/login");
        String html = readTemplate(templatePath)
                .replace("{{name}}", HtmlUtils.htmlEscape(name))
                .replace("{{loginUrl}}", HtmlUtils.htmlEscape(loginUrl));
        MimeMessage message = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            if (sender != null && !sender.isBlank()) helper.setFrom(sender);
            helper.setTo(email);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (jakarta.mail.MessagingException exception) {
            throw new IllegalStateException("Could not prepare approval email", exception);
        }
    }

    private static String readTemplate(String path) {
        try (var input = new ClassPathResource(path).getInputStream()) {
            return StreamUtils.copyToString(input, StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not load approval email template", exception);
        }
    }
}
