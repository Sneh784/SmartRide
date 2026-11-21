package com.smartride.backend;

import com.smartride.backend.repository.VehicleCatalogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

@JdbcTest
@Import(VehicleCatalogRepository.class)
class VehicleCatalogRepositoryTest {
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private VehicleCatalogRepository vehicleCatalogRepository;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("""
                CREATE TABLE vehicles (
                    id BIGINT PRIMARY KEY,
                    title VARCHAR(100),
                    brand VARCHAR(100),
                    model VARCHAR(100),
                    category VARCHAR(100),
                    subcategory VARCHAR(100),
                    "year" INT,
                    city VARCHAR(100),
                    location VARCHAR(200),
                    daily_rate DECIMAL(10, 2),
                    with_driver_rate DECIMAL(10, 2),
                    rating DECIMAL(3, 2),
                    availability_status VARCHAR(30),
                    approval_status VARCHAR(30),
                    seating_capacity INT,
                    fuel_type VARCHAR(30),
                    transmission VARCHAR(30),
                    mileage INT,
                    security_deposit DECIMAL(10, 2),
                    description VARCHAR(500),
                    features VARCHAR(500)
                )
                """);
        jdbcTemplate.update("""
                INSERT INTO vehicles (
                    id, title, brand, model, category, "year", city, location, daily_rate,
                    with_driver_rate, rating, availability_status, approval_status,
                    seating_capacity, fuel_type, transmission, mileage, security_deposit,
                    description, features
                ) VALUES (1, 'Vendor Sedan', 'Brand', 'Model', 'Sedan', 2024, 'Pune', 'Baner',
                          2500, 500, 4.8, 'AVAILABLE', 'APPROVED', 5, 'Petrol', 'Automatic',
                          18000, 5000, 'Clean sedan', 'Bluetooth, AC')
                """);
        jdbcTemplate.update("""
                INSERT INTO vehicles (id, title, daily_rate, availability_status, approval_status)
                VALUES (2, 'Pending Vehicle', 3000, 'AVAILABLE', 'PENDING'),
                       (3, 'Unavailable Vehicle', 3500, 'UNAVAILABLE', 'APPROVED')
                """);
    }

    @Test
    void returnsOnlyApprovedAvailableVendorVehiclesWithListingDetails() {
        var vehicles = vehicleCatalogRepository.findAvailableVehicles();

        assertEquals(1, vehicles.size());
        assertEquals(1L, vehicles.get(0).get("id"));
        assertEquals("Vendor Sedan", vehicles.get(0).get("title"));
        assertEquals("Pune", vehicles.get(0).get("city"));
        assertEquals(new BigDecimal("2500.00"), vehicles.get(0).get("dailyrate"));
        assertEquals(5, vehicles.get(0).get("seatingcapacity"));
        assertEquals("Bluetooth, AC", vehicles.get(0).get("features"));
        assertEquals("Vendor Sedan", vehicleCatalogRepository.findAvailableVehicle(1).get("name"));
    }
}
