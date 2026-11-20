package com.smartride.backend.controller;

import com.smartride.backend.dto.CreatePaymentOrderRequest;
import com.smartride.backend.dto.VerifyPaymentRequest;
import com.smartride.backend.service.CustomerPaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {
    private final CustomerPaymentService paymentService;

    public PaymentController(CustomerPaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/create-order")
    public Map<String, Object> createOrder(Authentication authentication,
                                           @Valid @RequestBody CreatePaymentOrderRequest request) {
        return paymentService.createOrder(authentication.getName(), request.bookingId());
    }

    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verify(Authentication authentication,
                                                       @Valid @RequestBody VerifyPaymentRequest request) {
        return ResponseEntity.ok(paymentService.verify(authentication.getName(), request.bookingId(),
                request.razorpayOrderId(), request.razorpayPaymentId(), request.razorpaySignature()));
    }
}
