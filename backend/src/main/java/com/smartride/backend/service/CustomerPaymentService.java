package com.smartride.backend.service;

import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class CustomerPaymentService {
    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final String keyId;
    private final String keySecret;
    private final RestClient restClient = RestClient.create();

    public CustomerPaymentService(JdbcTemplate jdbc, UserRepository users,
                                  @Value("${razorpay.key-id:}") String keyId,
                                  @Value("${razorpay.key-secret:}") String keySecret) {
        this.jdbc = jdbc;
        this.users = users;
        this.keyId = keyId;
        this.keySecret = keySecret;
    }

    @Transactional
    public Map<String, Object> createOrder(String email, long bookingId) {
        User customer = requireCustomer(email);
        ensureConfigured();
        Map<String, Object> booking = bookingForUpdate(bookingId, customer.getId());
        String status = String.valueOf(booking.get("status")).toUpperCase(Locale.ROOT);
        String paymentStatus = String.valueOf(booking.get("payment_status")).toUpperCase(Locale.ROOT);
        if (!"CONFIRMED".equals(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Payment is available after the vendor confirms your booking");
        }
        if (isPaid(paymentStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This booking is already paid");
        }
        BigDecimal bookingAmount = (BigDecimal) booking.get("amount");
        if (bookingAmount == null || bookingAmount.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This booking has an invalid payment amount");
        }
        long amountPaise;
        try {
            amountPaise = bookingAmount.movePointRight(2).longValueExact();
        } catch (ArithmeticException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This booking has an invalid payment amount");
        }

        String existingOrderId = jdbc.query("""
                SELECT provider_order_id FROM payments
                WHERE booking_id = ? AND provider = 'RAZORPAY' AND status = 'PENDING'
                  AND provider_order_id IS NOT NULL
                ORDER BY id DESC LIMIT 1
                """, rs -> rs.next() ? rs.getString(1) : null, bookingId);
        if (existingOrderId != null) {
            return orderResponse(bookingId, existingOrderId, amountPaise, bookingAmount);
        }

        String receipt = "sr-" + bookingId + "-" + UUID.randomUUID().toString().substring(0, 8);
        Map<String, Object> order;
        try {
            order = restClient.post()
                    .uri("https://api.razorpay.com/v1/orders")
                    .headers(headers -> headers.setBasicAuth(keyId, keySecret))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "amount", amountPaise,
                            "currency", "INR",
                            "receipt", receipt,
                            "notes", Map.of("booking_id", String.valueOf(bookingId))))
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() { });
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Could not create an order with the payment provider. Try again shortly.", exception);
        }
        String orderId = order == null ? null : String.valueOf(order.get("id"));
        if (orderId == null || orderId.isBlank() || "null".equals(orderId)) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Payment provider returned an invalid order");
        }
        jdbc.update("""
                INSERT INTO payments (booking_id, amount, currency, provider, payment_id, status, provider_order_id)
                VALUES (?, ?, 'INR', 'RAZORPAY', NULL, 'PENDING', ?)
                """, bookingId, bookingAmount, orderId);
        return orderResponse(bookingId, orderId, amountPaise, bookingAmount);
    }

    @Transactional
    public Map<String, Object> verify(String email, long bookingId, String orderId,
                                      String paymentId, String signature) {
        User customer = requireCustomer(email);
        ensureConfigured();
        if (!validSignature(orderId, paymentId, signature)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment signature is invalid");
        }
        Map<String, Object> payment;
        try {
            payment = normalized(jdbc.queryForMap("""
                    SELECT p.id, p.status, p.payment_id, p.provider_order_id, b.id AS booking_id,
                           b.customer_id, b.status AS booking_status
                    FROM payments p
                    JOIN bookings b ON b.id = p.booking_id
                    WHERE p.booking_id = ? AND p.provider_order_id = ? AND p.provider = 'RAZORPAY'
                    FOR UPDATE
                    """, bookingId, orderId));
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment order not found");
        }
        if (((Number) payment.get("customer_id")).longValue() != customer.getId()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment order not found");
        }
        if ("SUCCESS".equalsIgnoreCase(String.valueOf(payment.get("status")))) {
            if (paymentId.equals(payment.get("payment_id"))) {
                return Map.of("bookingId", bookingId, "status", "SUCCESS");
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This order has already been paid");
        }
        if (!"CONFIRMED".equalsIgnoreCase(String.valueOf(payment.get("booking_status")))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This booking is no longer payable");
        }

        jdbc.update("""
                UPDATE payments SET payment_id = ?, status = 'SUCCESS'
                WHERE id = ? AND status = 'PENDING'
                """, paymentId, payment.get("id"));
        jdbc.update("UPDATE bookings SET payment_status = 'PAID' WHERE id = ?", bookingId);
        jdbc.update("""
                INSERT INTO customer_notifications (customer_id, title, message)
                VALUES (?, 'Payment successful', ?)
                """, customer.getId(), "Payment received for booking #" + bookingId + ".");
        return Map.of("bookingId", bookingId, "status", "SUCCESS");
    }

    private Map<String, Object> bookingForUpdate(long bookingId, long customerId) {
        try {
            return normalized(jdbc.queryForMap("""
                    SELECT id, customer_id, status, payment_status, amount
                    FROM bookings WHERE id = ? AND customer_id = ?
                    FOR UPDATE
                    """, bookingId, customerId));
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
    }

    private User requireCustomer(String email) {
        return users.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .filter(user -> user.isActive() && user.getRole() == RoleName.CUSTOMER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "An active customer account is required"));
    }

    private void ensureConfigured() {
        if (keyId.isBlank() || keySecret.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Online payments are not configured. Contact SmartRide support.");
        }
    }

    private boolean validSignature(String orderId, String paymentId, String signature) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(keySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] expected = mac.doFinal((orderId + "|" + paymentId).getBytes(StandardCharsets.UTF_8));
            return MessageDigest.isEqual(expected, HexFormat.of().parseHex(signature));
        } catch (java.security.GeneralSecurityException | IllegalArgumentException exception) {
            return false;
        }
    }

    private Map<String, Object> orderResponse(long bookingId, String orderId, long amountPaise,
                                              BigDecimal bookingAmount) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("bookingId", bookingId);
        result.put("orderId", orderId);
        result.put("amount", amountPaise);
        result.put("bookingAmount", bookingAmount);
        result.put("currency", "INR");
        result.put("keyId", keyId);
        return result;
    }

    private static boolean isPaid(String status) {
        return "PAID".equals(status) || "SUCCESS".equals(status) || "COMPLETED".equals(status);
    }

    private static Map<String, Object> normalized(Map<String, Object> row) {
        Map<String, Object> result = new LinkedHashMap<>();
        row.forEach((key, value) -> result.put(key.toLowerCase(Locale.ROOT), value));
        return result;
    }
}
