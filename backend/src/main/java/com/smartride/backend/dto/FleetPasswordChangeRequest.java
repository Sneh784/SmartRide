package com.smartride.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FleetPasswordChangeRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 12, max = 100) String newPassword
) { }
