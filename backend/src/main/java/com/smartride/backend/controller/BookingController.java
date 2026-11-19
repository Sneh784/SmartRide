package com.smartride.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class BookingController {

    @GetMapping("/bookings")
    public ResponseEntity<List<Map<String, Object>>> getBookings() {
        return ResponseEntity.ok(List.of(
                Map.of("id", 1, "status", "CONFIRMED", "amount", 14400)
        ));
    }

    @GetMapping("/bookings/{id}")
    public ResponseEntity<Map<String, Object>> getBooking(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of(
                "id", id,
                "status", "CONFIRMED",
                "amount", 14400,
                "bookingType", "WITH_DRIVER"
        ));
    }

    @PostMapping("/bookings")
    public ResponseEntity<Map<String, Object>> createBooking(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(Map.of(
                "id", 101,
                "status", "PENDING",
                "message", "Booking created successfully",
                "payload", payload
        ));
    }
}
