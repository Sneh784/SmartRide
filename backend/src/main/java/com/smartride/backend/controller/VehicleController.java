package com.smartride.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class VehicleController {

    @GetMapping("/vehicles")
    public ResponseEntity<List<Map<String, Object>>> getVehicles() {
        return ResponseEntity.ok(List.of(
                Map.of("id", 1, "name", "Mercedes GLE", "category", "Cars", "pricePerDay", 4800),
                Map.of("id", 2, "name", "Mahindra Bolero", "category", "SUV", "pricePerDay", 2900),
                Map.of("id", 3, "name", "Force Traveller", "category", "Passenger Vehicles", "pricePerDay", 5400)
        ));
    }

    @GetMapping("/vehicles/{id}")
    public ResponseEntity<Map<String, Object>> getVehicle(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of(
                "id", id,
                "name", "Mercedes GLE",
                "category", "Cars",
                "brand", "Mercedes",
                "model", "GLE",
                "dailyRate", 4800,
                "location", "Bengaluru"
        ));
    }
}
