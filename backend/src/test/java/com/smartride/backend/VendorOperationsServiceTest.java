package com.smartride.backend;

import com.smartride.backend.dto.VendorVehicleRequest;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.UserRepository;
import com.smartride.backend.service.VendorDocumentStorage;
import com.smartride.backend.service.VendorOperationsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.jdbc.support.KeyHolder;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VendorOperationsServiceTest {
    @Mock private JdbcTemplate jdbc;
    @Mock private UserRepository users;
    @Mock private VendorDocumentStorage storage;
    @InjectMocks private VendorOperationsService service;

    @Test
    void pendingVendorCannotAccessOperationalData() {
        when(users.findByEmail("pending@example.com")).thenReturn(Optional.of(vendor("PENDING", false)));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.vehicles("pending@example.com", "", ""));

        assertEquals(403, exception.getStatusCode().value());
        verifyNoInteractions(jdbc);
    }

    @Test
    void vehicleListingIsScopedToAuthenticatedVendor() {
        when(users.findByEmail("vendor@example.com")).thenReturn(Optional.of(vendor("APPROVED", true)));
        when(jdbc.queryForObject(contains("FROM vendor_profiles"), eq(Long.class), eq(29L))).thenReturn(39L);
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of());

        service.vehicles("vendor@example.com", "", "");

        ArgumentCaptor<Object[]> args = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).queryForList(contains("FROM vehicles WHERE vendor_id = ?"), args.capture());
        assertEquals(39L, args.getValue()[0]);
    }

    @Test
    void newlySubmittedVehicleIsPendingAndUnavailable() {
        when(users.findByEmail("vendor@example.com")).thenReturn(Optional.of(vendor("APPROVED", true)));
        when(jdbc.queryForObject(contains("FROM vendor_profiles"), eq(Long.class), eq(29L))).thenReturn(39L);
        when(jdbc.queryForObject(contains("FROM vehicle_categories"), eq(Long.class), eq("Cars"))).thenReturn(1L);
        when(jdbc.update(any(PreparedStatementCreator.class), any(KeyHolder.class))).thenAnswer(invocation -> {
            KeyHolder keyHolder = invocation.getArgument(1);
            keyHolder.getKeyList().add(Map.of("ID", 41L));
            return 1;
        });
        when(jdbc.update(contains("INSERT INTO vendor_notifications"), any(Object[].class))).thenReturn(1);
        when(jdbc.queryForMap(contains("FROM vehicles WHERE id = ?"), eq(41L), eq(39L)))
                .thenReturn(Map.of("id", 41L, "approval_status", "PENDING", "availability_status", "UNAVAILABLE"));

        Map<String, Object> created = service.createVehicle("vendor@example.com", new VendorVehicleRequest(
                "Cars", null, "Test vehicle", "Example", "Model", 2024, null, null, 4,
                new BigDecimal("1000.00"), null, "Pune", "Central Pune", null));

        assertEquals("PENDING", created.get("approval_status"));
        assertEquals("UNAVAILABLE", created.get("availability_status"));
        verify(jdbc).update(any(PreparedStatementCreator.class), any(KeyHolder.class));
    }

    @Test
    void bookingAcceptanceChecksAvailabilityAndUsesVendorOwnership() {
        when(users.findByEmail("vendor@example.com")).thenReturn(Optional.of(vendor("APPROVED", true)));
        when(jdbc.queryForObject(contains("FROM vendor_profiles"), eq(Long.class), eq(29L))).thenReturn(39L);
        when(jdbc.queryForMap(contains("FOR UPDATE OF b, v"), eq(7L), eq(39L)))
                .thenReturn(Map.of("status", "PENDING", "pickup_date", Timestamp.valueOf(LocalDateTime.now().plusDays(1)),
                        "return_date", Timestamp.valueOf(LocalDateTime.now().plusDays(2)), "customer_id", 9L,
                        "vehicle_id", 41L, "vehicle_name", "Test vehicle", "vehicle_approval", "APPROVED"));
        when(jdbc.queryForObject(contains("SELECT COUNT(*) FROM bookings"), eq(Integer.class), any(Object[].class)))
                .thenReturn(0);
        when(jdbc.update(contains("UPDATE bookings SET status = ?"), any(Object[].class))).thenReturn(1);
        when(jdbc.update(contains("INSERT INTO customer_notifications"), any(Object[].class))).thenReturn(1);

        Map<String, Object> result = service.reviewBooking("vendor@example.com", 7L, "CONFIRMED", null);

        assertEquals("CONFIRMED", result.get("status"));
        verify(jdbc).queryForMap(contains("WHERE b.id = ? AND v.vendor_id = ?"), eq(7L), eq(39L));
    }

    @Test
    void bookingAcceptanceRejectsOverlappingConfirmedRental() {
        when(users.findByEmail("vendor@example.com")).thenReturn(Optional.of(vendor("APPROVED", true)));
        when(jdbc.queryForObject(contains("FROM vendor_profiles"), eq(Long.class), eq(29L))).thenReturn(39L);
        when(jdbc.queryForMap(contains("FOR UPDATE OF b, v"), eq(7L), eq(39L)))
                .thenReturn(Map.of("status", "PENDING", "pickup_date", Timestamp.valueOf(LocalDateTime.now().plusDays(1)),
                        "return_date", Timestamp.valueOf(LocalDateTime.now().plusDays(2)), "customer_id", 9L,
                        "vehicle_id", 41L, "vehicle_name", "Test vehicle", "vehicle_approval", "APPROVED"));
        when(jdbc.queryForObject(contains("SELECT COUNT(*) FROM bookings"), eq(Integer.class), any(Object[].class)))
                .thenReturn(1);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.reviewBooking("vendor@example.com", 7L, "CONFIRMED", null));

        assertEquals(409, exception.getStatusCode().value());
    }

    private static User vendor(String status, boolean active) {
        User user = new User();
        user.setId(29L);
        user.setEmail("vendor@example.com");
        user.setRole(RoleName.VENDOR);
        user.setApprovalStatus(status);
        user.setActive(active);
        return user;
    }
}
