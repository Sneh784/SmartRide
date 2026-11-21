package com.smartride.backend.driver.dto;

import jakarta.validation.constraints.NotBlank;

public record DriverTripStatusRequest(@NotBlank String status) { }
