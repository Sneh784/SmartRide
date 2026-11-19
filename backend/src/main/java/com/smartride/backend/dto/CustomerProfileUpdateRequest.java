package com.smartride.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record CustomerProfileUpdateRequest(@NotBlank String firstName,
                                           @NotBlank String lastName,
                                           String phone) {}
