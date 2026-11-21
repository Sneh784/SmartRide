package com.smartride.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record FleetIssueRequest(
        @NotNull Long vehicleId,
        @NotBlank @Size(max = 2000) String description,
        @NotBlank String priority
) { }
