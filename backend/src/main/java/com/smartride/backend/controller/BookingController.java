package com.smartride.backend.controller;

import com.smartride.backend.dto.BookingStatusRequest;
import com.smartride.backend.dto.CreateBookingRequest;
import com.smartride.backend.service.CustomerBookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1")
public class BookingController {
    private final CustomerBookingService bookingService;

    public BookingController(CustomerBookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping("/bookings/{id}")
    public ResponseEntity<?> getBooking(@PathVariable long id, Authentication authentication) {
        return ResponseEntity.ok(bookingService.booking(authentication.getName(), id));
    }

    @PostMapping("/bookings")
    public ResponseEntity<?> createBooking(Authentication authentication,
                                           @Valid @RequestBody CreateBookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bookingService.create(authentication.getName(), request));
    }

    @PatchMapping("/bookings/{id}/status")
    public ResponseEntity<Void> updateStatus(Authentication authentication, @PathVariable long id,
                                              @Valid @RequestBody BookingStatusRequest request) {
        if (!"CANCELLED".equalsIgnoreCase(request.status().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Customers can only cancel eligible bookings");
        }
        bookingService.cancel(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
