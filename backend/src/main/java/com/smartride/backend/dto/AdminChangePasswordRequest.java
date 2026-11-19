package com.smartride.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminChangePasswordRequest(@NotBlank String currentPassword,
                                         @NotBlank @Size(min = 12, max = 128) String newPassword) {}
