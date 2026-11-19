package com.smartride.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CustomerKycRequest(@NotBlank String documentType,
                                @NotBlank @Size(min = 4, max = 32) String documentNumber) {}
