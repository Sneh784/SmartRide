package com.smartride.backend.driver.dto;

import jakarta.validation.constraints.NotNull;

public record DriverAvailabilityRequest(@NotNull Boolean available) { }
