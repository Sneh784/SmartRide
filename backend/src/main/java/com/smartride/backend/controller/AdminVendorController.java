package com.smartride.backend.controller;

import com.smartride.backend.entity.VendorDocument;
import com.smartride.backend.service.VendorDocumentStorage;
import com.smartride.backend.service.VendorWorkflowService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/vendors")
public class AdminVendorController {
    private final VendorWorkflowService service;
    private final VendorDocumentStorage storage;

    public AdminVendorController(VendorWorkflowService service, VendorDocumentStorage storage) {
        this.service = service;
        this.storage = storage;
    }

    @GetMapping
    public Map<String, Object> applications(
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return service.adminApplications(status, search, fromDate, toDate, page, size);
    }

    @GetMapping("/pending")
    public Map<String, Object> pending(@RequestParam(defaultValue = "") String search,
                                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
                                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
                                       @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "10") int size) {
        return service.adminApplications("PENDING", search, fromDate, toDate, page, size);
    }

    @GetMapping("/{id}")
    public Map<String, Object> application(@PathVariable long id) {
        return service.adminApplication(id);
    }

    @GetMapping("/documents/{id}")
    public ResponseEntity<Resource> document(@PathVariable long id) {
        return documentResponse(service.getDocument(null, id, true));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<Void> approve(Authentication authentication, @PathVariable long id) {
        service.review(authentication.getName(), id, "APPROVED", null);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<Void> reject(Authentication authentication, @PathVariable long id,
                                       @RequestBody Map<String, String> request) {
        service.review(authentication.getName(), id, "REJECTED", request.get("reason"));
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/suspend")
    public ResponseEntity<Void> suspend(Authentication authentication, @PathVariable long id,
                                        @RequestBody(required = false) Map<String, String> request) {
        service.review(authentication.getName(), id, "SUSPENDED", request == null ? null : request.get("reason"));
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<Resource> documentResponse(VendorDocument document) {
        Path path = storage.resolve(document.getStorageKey());
        if (!Files.isRegularFile(path)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        Resource resource = new FileSystemResource(path);
        String extension = switch (document.getContentType()) {
            case "application/pdf" -> ".pdf";
            case "image/png" -> ".png";
            default -> ".jpg";
        };
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(document.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(document.getDocumentType() + extension).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }
}
