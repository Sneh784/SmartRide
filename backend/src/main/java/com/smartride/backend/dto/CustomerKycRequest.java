package com.smartride.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Locale;
import java.util.Set;

public record CustomerKycRequest(@NotBlank String documentType,
                                @NotBlank @Size(min = 4, max = 32) String documentNumber) {
    public boolean hasSupportedType() {
        return Set.of("PASSPORT", "DRIVING_LICENSE", "NATIONAL_ID")
                .contains(documentType.toUpperCase(Locale.ROOT));
    }
}
