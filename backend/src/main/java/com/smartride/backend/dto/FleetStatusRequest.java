package com.smartride.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record FleetStatusRequest(
        @NotBlank String status,
        @Size(max = 2000) String notes,
        BigDecimal actualCost
) { }
