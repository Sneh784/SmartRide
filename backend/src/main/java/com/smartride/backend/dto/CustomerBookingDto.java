package com.smartride.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CustomerBookingDto(
        Long id,
        Long vehicleId,
        String vehicleName,
        String bookingType,
        String status,
        String paymentStatus,
        BigDecimal amount,
        LocalDateTime pickupDate,
        LocalDateTime returnDate,
        String pickupLocation,
        String returnLocation,
        LocalDateTime bookingDate,
        boolean paymentOrderOpen,
        boolean reviewed
) {}
