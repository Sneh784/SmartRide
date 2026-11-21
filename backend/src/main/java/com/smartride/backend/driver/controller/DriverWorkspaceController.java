package com.smartride.backend.driver.controller;

import com.smartride.backend.driver.dto.DriverAvailabilityRequest;
import com.smartride.backend.driver.dto.DriverProfileUpdateRequest;
import com.smartride.backend.driver.service.DriverTripOperationsService;
import com.smartride.backend.driver.service.DriverWorkspaceService;
import jakarta.validation.Valid;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.util.Map;

@RestController
@RequestMapping("/api/driver")
public class DriverWorkspaceController {
    private final DriverWorkspaceService workspace;
    private final DriverTripOperationsService trips;

    public DriverWorkspaceController(DriverWorkspaceService workspace, DriverTripOperationsService trips) {
        this.workspace = workspace;
        this.trips = trips;
    }

    @GetMapping("/profile")
    public Map<String, Object> profile(Authentication authentication) {
        return workspace.profile(authentication.getName());
    }

    @PutMapping("/profile")
    public Map<String, Object> updateProfile(Authentication authentication,
                                             @Valid @RequestBody DriverProfileUpdateRequest request) {
        return workspace.updateProfile(authentication.getName(), request);
    }

    @GetMapping("/availability")
    public Map<String, Object> availability(Authentication authentication) {
        return workspace.availability(authentication.getName());
    }

    @PutMapping("/availability")
    public Map<String, Object> updateAvailability(Authentication authentication,
                                                  @Valid @RequestBody DriverAvailabilityRequest request) {
        return workspace.updateAvailability(authentication.getName(), request.available());
    }

    @GetMapping("/earnings")
    public Map<String, Object> earnings(Authentication authentication) {
        return trips.earnings(authentication.getName());
    }

    @GetMapping("/documents")
    public Map<String, Object> documents(Authentication authentication) {
        return workspace.documents(authentication.getName());
    }

    @GetMapping("/documents/application/{documentType}")
    public ResponseEntity<Resource> applicationDocument(Authentication authentication,
                                                         @PathVariable String documentType) {
        return documentResponse(workspace.applicationDocument(authentication.getName(), documentType));
    }

    @GetMapping("/documents/additional/{documentId}")
    public ResponseEntity<Resource> additionalDocument(Authentication authentication, @PathVariable long documentId) {
        return documentResponse(workspace.additionalDocument(authentication.getName(), documentId));
    }

    @PostMapping("/documents")
    public ResponseEntity<Map<String, Object>> uploadDocument(Authentication authentication,
                                                              @RequestParam String documentType,
                                                              @RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workspace.uploadDocument(authentication.getName(), documentType, file));
    }

    @DeleteMapping("/documents/additional/{documentId}")
    public ResponseEntity<Void> deleteDocument(Authentication authentication, @PathVariable long documentId) {
        workspace.deleteDocument(authentication.getName(), documentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/notifications")
    public Map<String, Object> notifications(Authentication authentication) {
        return workspace.notifications(authentication.getName());
    }

    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<Void> markNotificationRead(Authentication authentication, @PathVariable long id) {
        workspace.markNotificationRead(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/notifications/read-all")
    public ResponseEntity<Void> markAllNotificationsRead(Authentication authentication) {
        workspace.markAllNotificationsRead(authentication.getName());
        return ResponseEntity.noContent().build();
    }

    private static ResponseEntity<Resource> documentResponse(DriverWorkspaceService.StoredDocument document) {
        Path path = document.path();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(document.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(document.originalName()).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(new FileSystemResource(path));
    }
}
