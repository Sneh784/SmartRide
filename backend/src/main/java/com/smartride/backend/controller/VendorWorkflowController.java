package com.smartride.backend.controller;

import com.smartride.backend.dto.LoginRequest;
import com.smartride.backend.dto.VendorBookingRejectionRequest;
import com.smartride.backend.dto.VendorRegistrationRequest;
import com.smartride.backend.dto.VendorVehicleRequest;
import com.smartride.backend.entity.VendorDocument;
import com.smartride.backend.service.VendorDocumentStorage;
import com.smartride.backend.service.VendorOperationsService;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    private final VendorOperationsService operations;
    private final VendorDocumentStorage storage;

    public VendorWorkflowController(VendorWorkflowService service, VendorOperationsService operations,
                                    VendorDocumentStorage storage) {
        this.service = service;
        this.operations = operations;
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
        return operations.dashboard(authentication.getName());
    }

    @GetMapping("/vehicles")
    public java.util.List<Map<String, Object>> vehicles(Authentication authentication,
                                                        @RequestParam(defaultValue = "") String status,
                                                        @RequestParam(defaultValue = "") String search) {
        return operations.vehicles(authentication.getName(), status, search);
    }

    @GetMapping("/vehicles/{id}")
    public Map<String, Object> vehicle(Authentication authentication, @PathVariable long id) {
        return operations.vehicle(authentication.getName(), id);
    }

    @GetMapping("/vehicles/{id}/media")
    public java.util.List<Map<String, Object>> vehicleMedia(Authentication authentication, @PathVariable long id) {
        return operations.vehicleMedia(authentication.getName(), id);
    }

    @PostMapping("/vehicles/{id}/media")
    public java.util.List<Map<String, Object>> uploadVehicleMedia(
            Authentication authentication, @PathVariable long id,
            @RequestPart(value = "photos", required = false) java.util.List<MultipartFile> photos,
            @RequestPart(value = "registrationDocuments", required = false) java.util.List<MultipartFile> registrationDocuments,
            @RequestPart(value = "insuranceDocuments", required = false) java.util.List<MultipartFile> insuranceDocuments,
            @RequestPart(value = "pucDocuments", required = false) java.util.List<MultipartFile> pucDocuments) {
        return operations.uploadVehicleMedia(authentication.getName(), id, photos, registrationDocuments,
                insuranceDocuments, pucDocuments);
    }

    @GetMapping("/vehicles/{id}/media/{mediaId}")
    public ResponseEntity<Resource> vehicleMediaFile(Authentication authentication, @PathVariable long id,
                                                      @PathVariable long mediaId) {
        VendorOperationsService.VehicleMediaFile media =
                operations.vehicleMediaFile(authentication.getName(), id, mediaId);
        Path path = storage.resolve(media.storageKey());
        if (!Files.isRegularFile(path)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle file not found");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(media.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(media.originalName()).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(new FileSystemResource(path));
    }

    @PostMapping("/vehicles")
    public ResponseEntity<Map<String, Object>> createVehicle(Authentication authentication,
                                                              @Valid @RequestBody VendorVehicleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(operations.createVehicle(authentication.getName(), request));
    }

    @PutMapping("/vehicles/{id}")
    public Map<String, Object> updateVehicle(Authentication authentication, @PathVariable long id,
                                              @Valid @RequestBody VendorVehicleRequest request) {
        return operations.updateVehicle(authentication.getName(), id, request);
    }

    @DeleteMapping("/vehicles/{id}")
    public ResponseEntity<Void> deleteVehicle(Authentication authentication, @PathVariable long id) {
        operations.deleteVehicle(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/vehicles/{id}/availability")
    public Map<String, Object> vehicleAvailability(Authentication authentication, @PathVariable long id,
                                                    @RequestBody Map<String, String> request) {
        return operations.setAvailability(authentication.getName(), id, request.get("availability"));
    }

    @GetMapping("/bookings")
    public java.util.List<Map<String, Object>> bookings(Authentication authentication,
                                                        @RequestParam(defaultValue = "") String status) {
        return operations.bookings(authentication.getName(), status);
    }

    @PutMapping("/bookings/{id}/accept")
    public Map<String, Object> acceptBooking(Authentication authentication, @PathVariable long id) {
        return operations.reviewBooking(authentication.getName(), id, "CONFIRMED", null);
    }

    @PutMapping("/bookings/{id}/reject")
    public Map<String, Object> rejectBooking(Authentication authentication, @PathVariable long id,
                                              @Valid @RequestBody VendorBookingRejectionRequest request) {
        return operations.reviewBooking(authentication.getName(), id, "REJECTED", request.reason());
    }

    @GetMapping("/payments")
    public java.util.List<Map<String, Object>> payments(Authentication authentication) {
        return operations.payments(authentication.getName());
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
