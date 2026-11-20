package com.smartride.backend.controller;

import com.smartride.backend.service.DriverApplicationService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/drivers")
public class AdminDriverApplicationController {
    private final DriverApplicationService service;

    public AdminDriverApplicationController(DriverApplicationService service) {
        this.service = service;
    }

    @GetMapping
    public List<Map<String, Object>> applications(@RequestParam(defaultValue = "") String status,
                                                   @RequestParam(defaultValue = "") String search) {
        return service.adminApplications(status, search);
    }

    @GetMapping("/{userId}/documents/{documentType}")
    public ResponseEntity<Resource> document(@PathVariable long userId, @PathVariable String documentType) {
        DriverApplicationService.StoredDocument document = service.adminDocument(userId, documentType);
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
