package com.smartride.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VendorBookingRejectionRequest(
        @NotBlank @Size(max = 1000) String reason
) { }
