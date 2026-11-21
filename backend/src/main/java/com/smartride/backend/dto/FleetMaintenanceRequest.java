package com.smartride.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record FleetMaintenanceRequest(
        @NotNull Long vehicleId,
        @NotBlank @Size(max = 80) String maintenanceType,
        @NotBlank @Size(max = 2000) String description,
        @NotNull LocalDateTime scheduledAt,
        @Size(max = 255) String serviceProvider,
        @DecimalMin(value = "0.00") BigDecimal estimatedCost,
        @Size(max = 2000) String notes
) { }
