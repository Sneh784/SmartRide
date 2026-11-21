package com.smartride.backend.controller;

import com.smartride.backend.repository.VehicleCatalogRepository;
import com.smartride.backend.service.CloudinaryImageStorage;
import com.smartride.backend.service.VendorDocumentStorage;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.ContentDisposition;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.nio.file.Files;
import java.nio.file.Path;
import java.net.URI;
import java.time.LocalDateTime;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class VehicleController {
    private final VehicleCatalogRepository vehicleCatalogRepository;
    private final VendorDocumentStorage vendorDocumentStorage;
    private final CloudinaryImageStorage cloudinaryImages;

    public VehicleController(VehicleCatalogRepository vehicleCatalogRepository,
                             VendorDocumentStorage vendorDocumentStorage,
                             CloudinaryImageStorage cloudinaryImages) {
        this.vehicleCatalogRepository = vehicleCatalogRepository;
        this.vendorDocumentStorage = vendorDocumentStorage;
        this.cloudinaryImages = cloudinaryImages;
    }

    @GetMapping("/vehicles")
    public List<Map<String, Object>> getVehicles(@RequestParam(required = false) LocalDateTime from,
                                                 @RequestParam(required = false) LocalDateTime to) {
        if ((from == null) != (to == null) || (from != null && !to.isAfter(from))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Provide both availability dates and ensure the end is after the start");
        }
        return vehicleCatalogRepository.findAvailableVehicles(from, to);
    }

    @GetMapping("/vehicles/{id}")
    public Map<String, Object> getVehicle(@PathVariable Long id) {
        return vehicleCatalogRepository.findAvailableVehicle(id);
    }

    @GetMapping("/vehicles/{id}/photos/{photoId}")
    public ResponseEntity<?> getVehiclePhoto(@PathVariable long id, @PathVariable long photoId) {
        VehicleCatalogRepository.VehiclePhoto photo =
                vehicleCatalogRepository.findAvailableVehiclePhoto(id, photoId);
        if (photo.secureUrl() != null && photo.secureUrl().startsWith("https://")) {
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(photo.secureUrl()))
                    .build();
        }
        Path path = vendorDocumentStorage.resolve(photo.storageKey());
        if (!Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle photo not found");
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(photo.originalName()).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(new FileSystemResource(path));
    }
}
