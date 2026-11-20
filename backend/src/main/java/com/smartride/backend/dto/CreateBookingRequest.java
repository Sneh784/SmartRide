package com.smartride.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record CreateBookingRequest(
        @NotNull @Positive Long vehicleId,
        @NotBlank String bookingType,
        @NotNull LocalDateTime pickupDate,
        @NotNull LocalDateTime returnDate,
        @NotBlank @Size(max = 200) String pickupLocation,
        @NotBlank @Size(max = 200) String returnLocation
) { }
