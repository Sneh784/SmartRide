package com.smartride.backend.controller;

import com.smartride.backend.dto.LoginRequest;
import com.smartride.backend.dto.VendorRegistrationRequest;
import com.smartride.backend.entity.VendorDocument;
import com.smartride.backend.service.VendorDocumentStorage;
import com.smartride.backend.service.VendorWorkflowService;
import jakarta.validation.Valid;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

@RestController
@RequestMapping("/api/vendor")
public class VendorWorkflowController {
    private final VendorWorkflowService service;
    private final VendorDocumentStorage storage;

    public VendorWorkflowController(VendorWorkflowService service, VendorDocumentStorage storage) {
        this.service = service;
        this.storage = storage;
    }

    @PostMapping("/auth/register")
    public ResponseEntity<Map<String, Object>> register(
            @Valid @RequestPart("application") VendorRegistrationRequest request,
            @RequestPart(value = "profileImage", required = false) MultipartFile profileImage,
            @RequestPart("identityProof") MultipartFile identityProof,
            @RequestPart("panCard") MultipartFile panCard,
            @RequestPart(value = "businessDocument", required = false) MultipartFile businessDocument,
            @RequestPart("addressProof") MultipartFile addressProof) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.register(request, profileImage,
                identityProof, panCard, businessDocument, addressProof));
    }

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(service.login(request));
    }

    @GetMapping("/application/status")
    public Map<String, Object> status(Authentication authentication) {
        return service.ownApplication(authentication.getName());
    }

    @GetMapping("/application/details")
    public Map<String, Object> details(Authentication authentication) {
        return service.ownApplication(authentication.getName());
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(Authentication authentication) {
        return service.dashboard(authentication.getName());
    }

    @GetMapping("/notifications")
    public Map<String, Object> notifications(Authentication authentication) {
        return service.notifications(authentication.getName());
    }

    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<Void> markNotificationRead(Authentication authentication, @PathVariable long id) {
        service.markNotificationRead(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/documents/{id}")
    public ResponseEntity<Resource> vendorDocument(Authentication authentication, @PathVariable long id) {
        long userId = service.vendorUserId(authentication.getName());
        return documentResponse(service.getDocument(userId, id, false));
    }

    private ResponseEntity<Resource> documentResponse(VendorDocument document) {
        Path path = storage.resolve(document.getStorageKey());
        if (!Files.isRegularFile(path)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        Resource resource = new FileSystemResource(path);
        String fileName = document.getDocumentType() + storageExtension(document.getContentType());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(document.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(fileName).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }

    private static String storageExtension(String contentType) {
        return switch (contentType) {
            case "application/pdf" -> ".pdf";
            case "image/png" -> ".png";
            default -> ".jpg";
        };
    }
}
