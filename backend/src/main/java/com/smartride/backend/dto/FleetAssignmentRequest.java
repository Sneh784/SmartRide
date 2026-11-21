package com.smartride.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record FleetAssignmentRequest(
        @NotNull Long vehicleId,
        @NotNull Long driverId,
        @NotNull LocalDateTime startAt,
        LocalDateTime endAt,
        @NotBlank @Size(max = 200) String location,
        @NotBlank @Size(max = 300) String purpose,
        @Size(max = 2000) String notes
) { }
