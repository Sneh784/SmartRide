package com.smartride.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminStatusRequest(@NotBlank String status, String reason) {}
