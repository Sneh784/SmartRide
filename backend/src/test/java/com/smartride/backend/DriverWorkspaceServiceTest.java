package com.smartride.backend;

import com.smartride.backend.driver.service.DriverDocumentStorage;
import com.smartride.backend.driver.service.DriverWorkspaceService;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DriverWorkspaceServiceTest {
    @Mock private JdbcTemplate jdbc;
    @Mock private UserRepository users;
    @Mock private DriverDocumentStorage storage;

    @Test
    void activeTripPreventsDriverFromGoingAvailable() {
        when(users.findByEmail("driver@example.com")).thenReturn(Optional.of(driver()));
        when(jdbc.queryForObject(contains("FOR UPDATE"), eq(Long.class), eq(12L))).thenReturn(12L);
        when(jdbc.queryForObject(contains("SELECT EXISTS"), eq(Boolean.class), eq(12L))).thenReturn(true);

        DriverWorkspaceService service = new DriverWorkspaceService(jdbc, users, storage);
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.updateAvailability("driver@example.com", true));

        assertEquals(409, error.getStatusCode().value());
        verify(jdbc, never()).update(contains("SET is_available"), any(Object[].class));
    }

    @Test
    void additionalDocumentLookupIsScopedToTheAuthenticatedDriver() {
        when(users.findByEmail("driver@example.com")).thenReturn(Optional.of(driver()));
        when(jdbc.queryForMap(contains("FROM driver_documents WHERE id = ? AND user_id = ?"),
                eq(71L), eq(12L))).thenThrow(new org.springframework.dao.EmptyResultDataAccessException(1));

        DriverWorkspaceService service = new DriverWorkspaceService(jdbc, users, storage);
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.additionalDocument("driver@example.com", 71L));

        assertEquals(404, error.getStatusCode().value());
        verify(storage, never()).resolve(anyString());
    }

    @Test
    void uploadingStoresAnAdditionalDocumentForTheAuthenticatedDriver() {
        when(users.findByEmail("driver@example.com")).thenReturn(Optional.of(driver()));
        MockMultipartFile file = new MockMultipartFile("file", "medical.pdf", "application/pdf",
                "%PDF-1.4 content".getBytes());
        when(storage.store(file)).thenReturn(new DriverDocumentStorage.StoredFile(
                "stored.pdf", "medical.pdf", "application/pdf"));
        when(jdbc.queryForObject(contains("INSERT INTO driver_documents"), eq(Long.class),
                any(Object[].class))).thenReturn(51L);

        DriverWorkspaceService service = new DriverWorkspaceService(jdbc, users, storage);
        var result = service.uploadDocument("driver@example.com", "MEDICAL_CERTIFICATE", file);

        assertEquals(51L, result.get("id"));
        assertEquals("MEDICAL_CERTIFICATE", result.get("document_type"));
        verify(jdbc).queryForObject(contains("INSERT INTO driver_documents"), eq(Long.class), any(Object[].class));
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
