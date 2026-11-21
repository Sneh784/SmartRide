package com.smartride.backend;

import com.smartride.backend.driver.dto.DriverTripStatusRequest;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.UserRepository;
import com.smartride.backend.driver.service.DriverTripOperationsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DriverTripOperationsServiceTest {
    @Mock private JdbcTemplate jdbc;
    @Mock private UserRepository users;
    @InjectMocks private DriverTripOperationsService service;

    @Test
    void dashboardCalculatesCompletedEarningsFromWithDriverRateAndBookedDays() {
        when(users.findByEmail("driver@example.com")).thenReturn(Optional.of(driver()));
        LocalDateTime pickup = LocalDateTime.of(2026, 11, 22, 10, 0);
        when(jdbc.queryForList(contains("FROM driver_trip_assignments a"), any(Object[].class)))
                .thenReturn(List.of(
                        trip("COMPLETED", pickup, pickup.plusDays(2), new BigDecimal("1200.00")),
                        trip("PENDING", pickup, pickup.plusDays(1), new BigDecimal("900.00"))));

        Map<String, Object> dashboard = service.dashboard("driver@example.com");

        assertEquals(1L, dashboard.get("completedTrips"));
        assertEquals(1L, dashboard.get("pendingTrips"));
        assertEquals(new BigDecimal("2400.00"), dashboard.get("earnings"));
    }

    @Test
    void driverCannotSkipAcceptanceAndStartBeforeCompletingTheTripFlow() {
        when(users.findByEmail("driver@example.com")).thenReturn(Optional.of(driver()));
        when(jdbc.queryForMap(contains("FOR UPDATE"), eq(17L), eq(12L)))
                .thenReturn(Map.of("assignment_id", 17L, "booking_id", 27L,
                        "trip_status", "PENDING", "booking_status", "CONFIRMED",
                        "customer_id", 8L, "fleet_manager_id", 9L));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.updateTripStatus("driver@example.com", 17L,
                        new DriverTripStatusRequest("COMPLETED")));

        assertEquals(409, exception.getStatusCode().value());
        verify(jdbc, org.mockito.Mockito.never()).update(anyString(), any(Object[].class));
    }

    @Test
    void unapprovedDriverCannotReadTrips() {
        User pendingDriver = driver();
        pendingDriver.setApprovalStatus("PENDING");
        when(users.findByEmail("driver@example.com")).thenReturn(Optional.of(pendingDriver));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.trips("driver@example.com", ""));

        assertEquals(403, exception.getStatusCode().value());
        verifyNoInteractions(jdbc);
    }

    private static Map<String, Object> trip(String status, LocalDateTime pickup,
                                            LocalDateTime dropoff, BigDecimal dailyRate) {
        return Map.of(
                "trip_status", status,
                "pickup_date", pickup,
                "return_date", dropoff,
                "with_driver_rate", dailyRate,
                "daily_rate", new BigDecimal("500.00"));
    }

    private static User driver() {
        User user = new User();
        user.setId(12L);
        user.setEmail("driver@example.com");
        user.setFullName("Test Driver");
        user.setRole(RoleName.DRIVER);
        user.setActive(true);
        user.setApprovalStatus("APPROVED");
        return user;
    }
}
