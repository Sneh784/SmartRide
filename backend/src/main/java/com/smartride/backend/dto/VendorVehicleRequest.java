package com.smartride.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record VendorVehicleRequest(
        @NotBlank @Size(max = 100) String category,
        @Size(max = 100) String subcategory,
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 100) String brand,
        @NotBlank @Size(max = 100) String model,
        @NotNull @Min(1900) @Max(2100) Integer year,
        @Size(max = 50) String registrationNumber,
        @Size(max = 50) String color,
        @Size(max = 50) String fuelType,
        @Size(max = 50) String transmission,
        @NotNull @Min(1) @Max(100) Integer seatingCapacity,
        @DecimalMin(value = "0.00") BigDecimal mileage,
        @Size(max = 2000) String features,
        @NotNull @DecimalMin(value = "0.01") BigDecimal dailyRate,
        @DecimalMin(value = "0.00") BigDecimal hourlyRate,
        @DecimalMin(value = "0.00") BigDecimal securityDeposit,
        @Min(1) @Max(10000) Integer kmLimitPerDay,
        @DecimalMin(value = "0.00") BigDecimal extraKmCharge,
        @DecimalMin(value = "0.00") BigDecimal withDriverRate,
        @NotBlank @Size(max = 100) String city,
        @NotBlank @Size(max = 200) String location,
        @Size(max = 5000) String description
) {
    public VendorVehicleRequest(String category, String subcategory, String title, String brand, String model,
                                Integer year, String fuelType, String transmission, Integer seatingCapacity,
                                BigDecimal dailyRate, BigDecimal withDriverRate, String city, String location,
                                String description) {
        this(category, subcategory, title, brand, model, year, null, null, fuelType, transmission, seatingCapacity,
                null, null, dailyRate, null, null, null, null, withDriverRate, city, location, description);
    }
}
