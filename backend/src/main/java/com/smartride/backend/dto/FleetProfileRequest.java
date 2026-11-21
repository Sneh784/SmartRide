package com.smartride.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FleetProfileRequest(
        @NotBlank @Size(max = 255) String fullName,
        @Size(max = 30) String phone
) { }
