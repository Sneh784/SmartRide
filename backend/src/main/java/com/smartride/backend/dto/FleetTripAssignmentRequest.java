package com.smartride.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record FleetTripAssignmentRequest(
        @NotNull @Positive Long bookingId,
        @NotNull @Positive Long driverId
) { }
