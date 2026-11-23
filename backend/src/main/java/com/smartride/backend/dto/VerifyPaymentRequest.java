package com.smartride.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

public record VerifyPaymentRequest(
        @NotNull @Positive Long bookingId,
        @NotBlank @Pattern(regexp = "[A-Za-z0-9_]{5,100}") String razorpayOrderId,
        @NotBlank @Pattern(regexp = "[A-Za-z0-9_]{5,100}") String razorpayPaymentId,
        @NotBlank @Pattern(regexp = "[A-Fa-f0-9]{64}") String razorpaySignature
) { }
