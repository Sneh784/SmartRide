package com.smartride.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record BookingStatusRequest(@NotBlank String status) { }
