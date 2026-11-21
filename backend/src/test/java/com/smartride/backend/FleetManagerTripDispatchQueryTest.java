package com.smartride.backend;

import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.UserRepository;
import com.smartride.backend.service.FleetManagerOperationsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@JdbcTest
class FleetManagerTripDispatchQueryTest {
    @Autowired
    private JdbcTemplate jdbc;

    private FleetManagerOperationsService service;

    @BeforeEach
    void setUp() {
        jdbc.execute("CREATE TABLE users (id BIGINT, full_name VARCHAR(100), email VARCHAR(100), phone VARCHAR(30), role VARCHAR(30), is_active BOOLEAN, approval_status VARCHAR(30))");
        jdbc.execute("CREATE TABLE driver_applications (user_id BIGINT, license_expiry_date DATE)");
        jdbc.execute("CREATE TABLE fleet_manager_driver_access (fleet_manager_id BIGINT, driver_id BIGINT)");
        jdbc.execute("CREATE TABLE fleet_manager_vehicle_access (fleet_manager_id BIGINT, vehicle_id BIGINT)");
        jdbc.execute("CREATE TABLE fleet_vehicle_assignments (id BIGINT, vehicle_id BIGINT, driver_id BIGINT, fleet_manager_id BIGINT, start_at TIMESTAMP, end_at TIMESTAMP, status VARCHAR(30))");
        jdbc.execute("CREATE TABLE driver_trip_assignments (id BIGINT, booking_id BIGINT, driver_id BIGINT, fleet_manager_id BIGINT, status VARCHAR(30), assigned_at TIMESTAMP)");
        jdbc.execute("CREATE TABLE driver_preferences (user_id BIGINT, is_available BOOLEAN)");
        jdbc.execute("CREATE TABLE vehicles (id BIGINT, title VARCHAR(100), registration_number VARCHAR(50))");
        jdbc.execute("CREATE TABLE bookings (id BIGINT, vehicle_id BIGINT, customer_id BIGINT, booking_type VARCHAR(30), status VARCHAR(30), pickup_date TIMESTAMP, return_date TIMESTAMP, pickup_location VARCHAR(200), return_location VARCHAR(200), amount DECIMAL(10,2))");

        jdbc.update("INSERT INTO users VALUES (12, 'Dispatch Driver', 'driver@example.com', '5550100', 'DRIVER', TRUE, 'APPROVED')");
        jdbc.update("INSERT INTO driver_applications VALUES (12, ?)", LocalDate.now().plusYears(2));
        jdbc.update("INSERT INTO fleet_manager_driver_access VALUES (10, 12)");
        jdbc.update("INSERT INTO fleet_manager_vehicle_access VALUES (10, 30)");
        jdbc.update("INSERT INTO vehicles VALUES (30, 'Fleet Sedan', 'ABC123')");
        jdbc.update("""
                INSERT INTO bookings VALUES (20, 30, 50, 'WITH_DRIVER', 'CONFIRMED', ?, ?,
                    'Pune pickup', 'Pune drop-off', 3000)
                """, LocalDateTime.now().plusDays(1), LocalDateTime.now().plusDays(2));
        jdbc.update("INSERT INTO driver_trip_assignments VALUES (90, 20, 12, 10, 'PENDING', CURRENT_TIMESTAMP)");

        UserRepository users = mock(UserRepository.class);
        when(users.findByEmail("manager@example.com")).thenReturn(Optional.of(manager()));
        service = new FleetManagerOperationsService(jdbc, users, mock(PasswordEncoder.class));
    }

    @Test
    void driverAndDispatchQueriesIncludeAssignedTripAndCustomerBooking() {
        var drivers = service.drivers("manager@example.com", "");
        var bookings = service.tripDispatchBookings("manager@example.com");

        assertEquals("ASSIGNED", drivers.get(0).get("availability"));
        assertEquals("Fleet Sedan", drivers.get(0).get("current_vehicle"));
        assertEquals(1, bookings.size());
        assertEquals(20L, bookings.get(0).get("booking_id"));
        assertEquals("Dispatch Driver", bookings.get(0).get("driver_name"));
    }

    private static User manager() {
        User user = new User();
        user.setId(10L);
        user.setEmail("manager@example.com");
        user.setRole(RoleName.FLEET_MANAGER);
        user.setActive(true);
        user.setApprovalStatus("ACTIVE");
        return user;
    }
}
