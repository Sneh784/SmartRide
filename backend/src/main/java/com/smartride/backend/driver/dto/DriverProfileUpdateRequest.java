package com.smartride.backend.driver.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record DriverProfileUpdateRequest(
        @NotBlank @Size(max = 255) String fullName,
        @NotBlank @Size(max = 30) @Pattern(regexp = "^\\s*(?:\\+?91[ -]?)?[6-9](?:[ -]?[0-9]){9}\\s*$") String phone,
        @NotBlank @Size(max = 1000) String address,
        @NotBlank @Size(max = 100) String city,
        @NotBlank @Size(max = 100) String state,
        @NotBlank @Pattern(regexp = "^[0-9]{6}$") String pincode
) { }
