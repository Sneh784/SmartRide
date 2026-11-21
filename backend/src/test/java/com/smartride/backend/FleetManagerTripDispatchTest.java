package com.smartride.backend;

import com.smartride.backend.dto.FleetTripAssignmentRequest;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.UserRepository;
import com.smartride.backend.service.FleetManagerOperationsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Timestamp;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FleetManagerTripDispatchTest {
    @Mock private JdbcTemplate jdbc;
    @Mock private UserRepository users;
    @Mock private PasswordEncoder passwordEncoder;
    @InjectMocks private FleetManagerOperationsService service;

    @Test
    void dispatchAssignsOnlyAConfirmedDriverBookingToAnAuthorizedDriver() {
        when(users.findByEmail("manager@example.com")).thenReturn(Optional.of(manager()));
        when(jdbc.queryForMap(contains("FROM bookings b"), eq(10L), eq(20L)))
                .thenReturn(Map.of("booking_id", 20L, "vehicle_id", 30L, "customer_id", 40L,
                        "booking_type", "WITH_DRIVER", "status", "CONFIRMED",
                        "pickup_date", Timestamp.valueOf(LocalDateTime.now().plusDays(1)),
                        "return_date", Timestamp.valueOf(LocalDateTime.now().plusDays(2))));
        when(jdbc.queryForObject(contains("FROM fleet_manager_vehicle_access"), eq(Integer.class),
                any(Object[].class))).thenReturn(1);
        when(jdbc.queryForObject(contains("FROM fleet_manager_driver_access"), eq(Integer.class),
                any(Object[].class))).thenReturn(1);
        when(jdbc.queryForObject(contains("SELECT id FROM users WHERE id = ? FOR UPDATE"), eq(Long.class),
                any(Object[].class))).thenReturn(12L);
        when(jdbc.queryForObject(contains("FROM driver_preferences"), eq(Boolean.class),
                any(Object[].class))).thenReturn(true);
        when(jdbc.queryForObject(contains("FROM fleet_vehicle_assignments"), eq(Integer.class),
                any(Object[].class))).thenReturn(0);
        when(jdbc.queryForObject(contains("FROM driver_trip_assignments a"), eq(Integer.class),
                any(Object[].class))).thenReturn(0);
        when(jdbc.queryForList(contains("SELECT id, status FROM driver_trip_assignments"),
                any(Object[].class))).thenReturn(List.of());
        lenient().doAnswer(invocation -> {
            KeyHolder keyHolder = invocation.getArgument(1);
            keyHolder.getKeyList().add(Map.of("ID", 90L));
            return 1;
        }).when(jdbc).update(any(PreparedStatementCreator.class), any(KeyHolder.class));
        when(jdbc.queryForList(contains("FROM bookings b"), any(Object[].class)))
                .thenReturn(List.of(Map.of("booking_id", 20L, "driver_id", 12L, "driver_name", "Fleet Driver",
                        "trip_status", "PENDING", "booking_status", "CONFIRMED")));

        Map<String, Object> assigned = service.assignBookingDriver("manager@example.com",
                new FleetTripAssignmentRequest(20L, 12L));

        assertEquals(20L, assigned.get("booking_id"));
        assertEquals("PENDING", assigned.get("trip_status"));
        verify(jdbc).update(contains("INSERT INTO customer_notifications"), any(Object[].class));
    }

    @Test
    void dispatchRejectsBookingsOutsideTheManagerVehicleScope() {
        when(users.findByEmail("manager@example.com")).thenReturn(Optional.of(manager()));
        when(jdbc.queryForMap(contains("FROM bookings b"), eq(10L), eq(20L)))
                .thenThrow(new org.springframework.dao.EmptyResultDataAccessException(1));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.assignBookingDriver("manager@example.com",
                        new FleetTripAssignmentRequest(20L, 12L)));

        assertEquals(404, exception.getStatusCode().value());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void dispatchRejectsAnOfflineDriver() {
        when(users.findByEmail("manager@example.com")).thenReturn(Optional.of(manager()));
        when(jdbc.queryForMap(contains("FROM bookings b"), eq(10L), eq(20L)))
                .thenReturn(Map.of("booking_id", 20L, "vehicle_id", 30L, "customer_id", 40L,
                        "booking_type", "WITH_DRIVER", "status", "CONFIRMED",
                        "pickup_date", Timestamp.valueOf(LocalDateTime.now().plusDays(1)),
                        "return_date", Timestamp.valueOf(LocalDateTime.now().plusDays(2))));
        when(jdbc.queryForObject(contains("FROM fleet_manager_vehicle_access"), eq(Integer.class),
                any(Object[].class))).thenReturn(1);
        when(jdbc.queryForObject(contains("FROM fleet_manager_driver_access"), eq(Integer.class),
                any(Object[].class))).thenReturn(1);
        when(jdbc.queryForObject(contains("SELECT id FROM users WHERE id = ? FOR UPDATE"), eq(Long.class),
                any(Object[].class))).thenReturn(12L);
        when(jdbc.queryForObject(contains("FROM driver_preferences"), eq(Boolean.class),
                any(Object[].class))).thenReturn(false);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.assignBookingDriver("manager@example.com",
                        new FleetTripAssignmentRequest(20L, 12L)));

        assertEquals(409, exception.getStatusCode().value());
        verify(jdbc, never()).update(any(PreparedStatementCreator.class), any(KeyHolder.class));
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
