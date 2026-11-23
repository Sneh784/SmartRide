package com.smartride.backend.controller;

import com.smartride.backend.repository.VehicleCatalogRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class VehicleController {
    private final VehicleCatalogRepository vehicleCatalogRepository;

    public VehicleController(VehicleCatalogRepository vehicleCatalogRepository) {
        this.vehicleCatalogRepository = vehicleCatalogRepository;
    }

    @GetMapping("/vehicles")
    public List<Map<String, Object>> getVehicles() {
        return vehicleCatalogRepository.findAvailableVehicles();
    }

    @GetMapping("/vehicles/{id}")
    public Map<String, Object> getVehicle(@PathVariable Long id) {
        return vehicleCatalogRepository.findAvailableVehicle(id);
    }
}
