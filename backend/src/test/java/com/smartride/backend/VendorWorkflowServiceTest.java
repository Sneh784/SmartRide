package com.smartride.backend;

import com.smartride.backend.dto.LoginRequest;
import com.smartride.backend.entity.User;
import com.smartride.backend.entity.VendorApplication;
import com.smartride.backend.entity.VendorDocument;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.RoleRepository;
import com.smartride.backend.repository.UserRepository;
import com.smartride.backend.repository.VendorApplicationRepository;
import com.smartride.backend.repository.VendorDocumentRepository;
import com.smartride.backend.security.JwtService;
import com.smartride.backend.service.VendorDocumentStorage;
import com.smartride.backend.service.ApprovalEmailNotificationService;
import com.smartride.backend.service.VendorWorkflowService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VendorWorkflowServiceTest {
    @Mock private VendorApplicationRepository applications;
    @Mock private VendorDocumentRepository documents;
    @Mock private UserRepository users;
    @Mock private RoleRepository roles;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private JdbcTemplate jdbc;
    @Mock private VendorDocumentStorage storage;
    @Mock private ApprovalEmailNotificationService approvalEmails;
    @InjectMocks private VendorWorkflowService service;

    @Test
    void pendingVendorCannotLogIn() {
        User vendor = user("PENDING", false, RoleName.VENDOR);
        when(users.findByEmail("vendor@example.com")).thenReturn(Optional.of(vendor));
        when(passwordEncoder.matches("StrongPass1!", vendor.getPassword())).thenReturn(true);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.login(loginRequest()));

        assertEquals(403, exception.getStatusCode().value());
        assertTrue(exception.getReason().contains("pending Admin approval"));
    }

    @Test
    void approvedActiveVendorCanLogIn() {
        User vendor = user("APPROVED", true, RoleName.VENDOR);
        when(users.findByEmail("vendor@example.com")).thenReturn(Optional.of(vendor));
        when(passwordEncoder.matches("StrongPass1!", vendor.getPassword())).thenReturn(true);
        when(jwtService.generateToken("vendor@example.com")).thenReturn("jwt-token");

        var response = service.login(loginRequest());

        assertEquals("jwt-token", response.token());
        assertEquals("VENDOR", response.role());
    }

    @Test
    void rejectedVendorLoginIncludesRejectionReason() {
        User vendor = user("REJECTED", false, RoleName.VENDOR);
        vendor.setApprovalReason("Missing business registration proof");
        when(users.findByEmail("vendor@example.com")).thenReturn(Optional.of(vendor));
        when(passwordEncoder.matches("StrongPass1!", vendor.getPassword())).thenReturn(true);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.login(loginRequest()));

        assertEquals(403, exception.getStatusCode().value());
        assertTrue(exception.getReason().contains("Missing business registration proof"));
    }

    @Test
    void suspendedVendorCannotLogIn() {
        User vendor = user("SUSPENDED", false, RoleName.VENDOR);
        when(users.findByEmail("vendor@example.com")).thenReturn(Optional.of(vendor));
        when(passwordEncoder.matches("StrongPass1!", vendor.getPassword())).thenReturn(true);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.login(loginRequest()));

        assertEquals(403, exception.getStatusCode().value());
        assertTrue(exception.getReason().contains("currently suspended"));
    }

    @Test
    void approvalActivatesAccountAndRecordsApplicationReview() {
        User admin = user(null, true, RoleName.ADMIN);
        User vendor = user("PENDING", false, RoleName.VENDOR);
        VendorApplication application = new VendorApplication();
        application.setUser(vendor);
        application.setStatus("PENDING");
        when(applications.findByIdForUpdate(7L)).thenReturn(Optional.of(application));
        when(users.findByEmail("admin@example.com")).thenReturn(Optional.of(admin));

        service.review("admin@example.com", 7L, "APPROVED", null);

        assertEquals("APPROVED", application.getStatus());
        assertEquals("APPROVED", vendor.getApprovalStatus());
        assertTrue(vendor.isActive());
        assertEquals(admin, application.getReviewedBy());
        assertTrue(application.getReviewedAt() != null);
        verify(users).save(vendor);
        verify(applications).save(application);
    }

    @Test
    void rejectionRequiresReasonAndDisablesVendorLogin() {
        User admin = user(null, true, RoleName.ADMIN);
        User vendor = user("PENDING", false, RoleName.VENDOR);
        VendorApplication application = new VendorApplication();
        application.setUser(vendor);
        application.setStatus("PENDING");
        when(applications.findByIdForUpdate(7L)).thenReturn(Optional.of(application));
        when(users.findByEmail("admin@example.com")).thenReturn(Optional.of(admin));

        ResponseStatusException missingReason = assertThrows(ResponseStatusException.class,
                () -> service.review("admin@example.com", 7L, "REJECTED", "   "));
        assertEquals(400, missingReason.getStatusCode().value());

        service.review("admin@example.com", 7L, "REJECTED", "Missing business registration proof");

        assertEquals("REJECTED", application.getStatus());
        assertEquals("REJECTED", vendor.getApprovalStatus());
        assertEquals("Missing business registration proof", vendor.getApprovalReason());
        assertEquals("Missing business registration proof", application.getRejectionReason());
        assertTrue(!vendor.isActive());
    }

    @Test
    void onlyApprovedVendorCanBeSuspended() {
        User admin = user(null, true, RoleName.ADMIN);
        User vendor = user("PENDING", false, RoleName.VENDOR);
        VendorApplication application = new VendorApplication();
        application.setUser(vendor);
        application.setStatus("PENDING");
        when(applications.findByIdForUpdate(7L)).thenReturn(Optional.of(application));
        when(users.findByEmail("admin@example.com")).thenReturn(Optional.of(admin));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.review("admin@example.com", 7L, "SUSPENDED", null));

        assertEquals(409, exception.getStatusCode().value());
        assertEquals("PENDING", application.getStatus());
    }

    @Test
    void vendorCannotApproveTheirOwnApplication() {
        User vendor = user("PENDING", false, RoleName.VENDOR);
        VendorApplication application = new VendorApplication();
        application.setUser(vendor);
        application.setStatus("PENDING");
        when(applications.findByIdForUpdate(7L)).thenReturn(Optional.of(application));
        when(users.findByEmail("vendor@example.com")).thenReturn(Optional.of(vendor));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.review("vendor@example.com", 7L, "APPROVED", null));

        assertEquals(403, exception.getStatusCode().value());
        assertEquals("PENDING", application.getStatus());
    }

    @Test
    void approvedVendorCanUploadAnAdditionalKycDocument() {
        User vendor = user("APPROVED", true, RoleName.VENDOR);
        VendorApplication application = new VendorApplication();
        application.setUser(vendor);
        MultipartFile file = org.mockito.Mockito.mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(users.findByEmail("vendor@example.com")).thenReturn(Optional.of(vendor));
        when(applications.findByUserId(vendor.getId())).thenReturn(Optional.of(application));
        when(storage.store(file, false)).thenReturn(
                new VendorDocumentStorage.StoredFile("stored-key.pdf", ".pdf", "application/pdf"));
        TransactionSynchronizationManager.initSynchronization();

        try {
            Map<String, Object> result = service.uploadDocument("vendor@example.com", "pan_card", file);

            var captor = forClass(VendorDocument.class);
            verify(documents).save(captor.capture());
            assertEquals("PAN_CARD", captor.getValue().getDocumentType());
            assertEquals("stored-key.pdf", captor.getValue().getStorageKey());
            assertEquals("PAN_CARD.pdf", result.get("originalName"));
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void vendorCannotUploadUnsupportedKycDocumentTypes() {
        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.uploadDocument("vendor@example.com", "PROFILE_IMAGE", null));

        assertEquals(400, exception.getStatusCode().value());
    }

    private static User user(String status, boolean active, RoleName role) {
        User user = new User();
        user.setId(role == RoleName.ADMIN ? 1L : 2L);
        user.setEmail(role == RoleName.ADMIN ? "admin@example.com" : "vendor@example.com");
        user.setFullName("Test User");
        user.setPassword("encoded-password");
        user.setRole(role);
        user.setApprovalStatus(status);
        user.setActive(active);
        return user;
    }

    private static LoginRequest loginRequest() {
        LoginRequest request = new LoginRequest();
        request.setEmail("vendor@example.com");
        request.setPassword("StrongPass1!");
        return request;
    }
}
