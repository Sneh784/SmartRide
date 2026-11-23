package com.smartride.backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(-25)
public class DriverSchemaInitializer implements CommandLineRunner {
    private final JdbcTemplate jdbc;

    public DriverSchemaInitializer(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(String... args) {
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS driver_applications (
                    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    application_number VARCHAR(40) NOT NULL UNIQUE,
                    date_of_birth DATE NOT NULL,
                    address VARCHAR(1000) NOT NULL,
                    city VARCHAR(100) NOT NULL,
                    state VARCHAR(100) NOT NULL,
                    pincode VARCHAR(6) NOT NULL,
                    license_number VARCHAR(50) NOT NULL UNIQUE,
                    license_expiry_date DATE NOT NULL,
                    experience_years INTEGER NOT NULL,
                    vehicle_categories VARCHAR(1000) NOT NULL,
                    license_storage_key VARCHAR(80) NOT NULL UNIQUE,
                    license_original_name VARCHAR(255) NOT NULL,
                    license_content_type VARCHAR(100) NOT NULL,
                    identity_storage_key VARCHAR(80) NOT NULL UNIQUE,
                    identity_original_name VARCHAR(255) NOT NULL,
                    identity_content_type VARCHAR(100) NOT NULL,
                    profile_photo_storage_key VARCHAR(80),
                    profile_photo_original_name VARCHAR(255),
                    profile_photo_content_type VARCHAR(100),
                    terms_accepted BOOLEAN NOT NULL,
                    driver_policies_accepted BOOLEAN NOT NULL,
                    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """);
        jdbc.execute("ALTER TABLE driver_applications ADD COLUMN IF NOT EXISTS profile_photo_storage_key VARCHAR(80)");
        jdbc.execute("ALTER TABLE driver_applications ADD COLUMN IF NOT EXISTS profile_photo_original_name VARCHAR(255)");
        jdbc.execute("ALTER TABLE driver_applications ADD COLUMN IF NOT EXISTS profile_photo_content_type VARCHAR(100)");
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_driver_applications_submitted ON driver_applications(submitted_at)");
    }
}
