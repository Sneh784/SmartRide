package com.smartride.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CustomerSupportRequest(@NotBlank @Size(max = 160) String subject,
                                     @NotBlank @Size(max = 3000) String message) {}
