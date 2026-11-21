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
        jdbcTemplate.execute("DROP TABLE IF EXISTS vehicle_media");
        jdbcTemplate.execute("DROP TABLE IF EXISTS bookings");
        jdbcTemplate.execute("DROP TABLE IF EXISTS fleet_vehicle_assignments");
        jdbcTemplate.execute("DROP TABLE IF EXISTS fleet_maintenance_records");
        jdbcTemplate.execute("DROP TABLE IF EXISTS vehicles");
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
                    features VARCHAR(500),
                    operational_status VARCHAR(30),
                    with_driver_available BOOLEAN,
                    without_driver_available BOOLEAN
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE vehicle_media (
                    id BIGINT PRIMARY KEY,
                    vehicle_id BIGINT,
                    media_type VARCHAR(30),
                    storage_key VARCHAR(80),
                    original_name VARCHAR(255),
                    content_type VARCHAR(100),
                    secure_url VARCHAR(1000)
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE bookings (
                    vehicle_id BIGINT,
                    status VARCHAR(30),
                    pickup_date TIMESTAMP,
                    return_date TIMESTAMP
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE fleet_vehicle_assignments (
                    vehicle_id BIGINT,
                    status VARCHAR(30),
                    start_at TIMESTAMP,
                    end_at TIMESTAMP
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE fleet_maintenance_records (
                    vehicle_id BIGINT,
                    status VARCHAR(30),
                    scheduled_at TIMESTAMP,
                    completed_at TIMESTAMP
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
        jdbcTemplate.update("""
                INSERT INTO vehicle_media (id, vehicle_id, media_type, storage_key, original_name, content_type)
                VALUES (5, 1, 'PHOTO', 'vehicle-photo.jpg', 'vehicle.jpg', 'image/jpeg')
                """);
    }

    @Test
    void returnsEveryApprovedVendorVehicleAndMarksUnavailableListings() {
        var vehicles = vehicleCatalogRepository.findAvailableVehicles();

        assertEquals(2, vehicles.size());
        assertEquals(1L, vehicles.get(0).get("id"));
        assertEquals("Vendor Sedan", vehicles.get(0).get("title"));
        assertEquals("Pune", vehicles.get(0).get("city"));
        assertEquals(new BigDecimal("2500.00"), vehicles.get(0).get("dailyrate"));
        assertEquals(5, vehicles.get(0).get("seatingcapacity"));
        assertEquals("Bluetooth, AC", vehicles.get(0).get("features"));
        assertEquals(true, vehicles.get(0).get("isavailablenow"));
        assertEquals("/api/v1/vehicles/1/photos/5", vehicles.get(0).get("imageurl"));
        assertEquals("Vendor Sedan", vehicleCatalogRepository.findAvailableVehicle(1).get("name"));
        assertEquals("vehicle-photo.jpg",
                vehicleCatalogRepository.findAvailableVehiclePhoto(1, 5).storageKey());
        assertEquals(3L, vehicles.get(1).get("id"));
        assertEquals(false, vehicles.get(1).get("isavailablenow"));
        assertEquals("Unavailable Vehicle", vehicleCatalogRepository.findAvailableVehicle(3).get("name"));
    }

    @Test
    void excludesVehiclesWithBookingsDuringTheRequestedDates() {
        jdbcTemplate.update("""
                INSERT INTO bookings (vehicle_id, status, pickup_date, return_date)
                VALUES (1, 'CONFIRMED', '2026-07-10 10:00:00', '2026-07-12 10:00:00')
                """);

        var vehicles = vehicleCatalogRepository.findAvailableVehicles(
                java.time.LocalDateTime.parse("2026-07-11T00:00:00"),
                java.time.LocalDateTime.parse("2026-07-13T00:00:00"));

        assertEquals(0, vehicles.size());
    }
}
