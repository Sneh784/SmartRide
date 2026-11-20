package com.smartride.backend;

import com.smartride.backend.security.JwtService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtServiceTest {
    @Test
    void rejectsMissingOrTooShortSigningSecretWithConfigurationGuidance() {
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> new JwtService("", 86_400_000));

        org.junit.jupiter.api.Assertions.assertEquals(
                "JWT_SECRET must be configured with at least 32 bytes", exception.getMessage());
    }
}
