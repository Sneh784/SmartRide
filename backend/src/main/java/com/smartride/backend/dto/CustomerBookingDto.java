package com.smartride.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CustomerBookingDto(
        Long id,
        String vehicleName,
        String bookingType,
        String status,
        BigDecimal amount,
        LocalDateTime pickupDate,
        LocalDateTime returnDate,
        String pickupLocation,
        String returnLocation,
        LocalDateTime bookingDate
) {}
