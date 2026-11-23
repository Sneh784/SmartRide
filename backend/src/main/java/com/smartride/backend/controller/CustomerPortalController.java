package com.smartride.backend.controller;

import com.smartride.backend.dto.CustomerBookingDto;
import com.smartride.backend.dto.CustomerDashboardDto;
import com.smartride.backend.dto.CustomerProfileDto;
import com.smartride.backend.dto.CustomerProfileUpdateRequest;
import com.smartride.backend.dto.CustomerKycRequest;
import com.smartride.backend.dto.CustomerSupportRequest;
import com.smartride.backend.dto.CustomerBookingReviewRequest;
import com.smartride.backend.service.CustomerPortalService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/customer")
public class CustomerPortalController {
    private final CustomerPortalService customerPortalService;

    public CustomerPortalController(CustomerPortalService customerPortalService) {
        this.customerPortalService = customerPortalService;
    }

    @GetMapping("/dashboard")
    public CustomerDashboardDto dashboard(Authentication authentication) {
        return customerPortalService.dashboard(authentication.getName());
    }

    @GetMapping("/bookings")
    public List<CustomerBookingDto> bookings(Authentication authentication) {
        return customerPortalService.bookings(authentication.getName(), "all");
    }

    @GetMapping("/active-rentals")
    public List<CustomerBookingDto> activeRentals(Authentication authentication) {
        return customerPortalService.bookings(authentication.getName(), "active");
    }

    @GetMapping("/booking-history")
    public List<CustomerBookingDto> bookingHistory(Authentication authentication) {
        return customerPortalService.bookings(authentication.getName(), "history");
    }

    @GetMapping("/profile")
    public CustomerProfileDto profile(Authentication authentication) {
        return customerPortalService.profile(authentication.getName());
    }

    @PutMapping("/profile")
    public CustomerProfileDto updateProfile(Authentication authentication,
                                             @Valid @RequestBody CustomerProfileUpdateRequest request) {
        return customerPortalService.updateProfile(authentication.getName(), request);
    }

    @GetMapping("/payments")
    public List<Map<String, Object>> payments(Authentication authentication) {
        return customerPortalService.payments(authentication.getName());
    }

    @GetMapping("/vehicles")
    public List<Map<String, Object>> vehicles(Authentication authentication) {
        return customerPortalService.vehicles(authentication.getName());
    }

    @GetMapping("/vehicles/{vehicleId}")
    public Map<String, Object> vehicle(Authentication authentication, @PathVariable long vehicleId) {
        return customerPortalService.vehicle(authentication.getName(), vehicleId);
    }

    @PostMapping("/bookings/{bookingId}/review")
    public ResponseEntity<Void> reviewBooking(Authentication authentication, @PathVariable long bookingId,
                                                @Valid @RequestBody CustomerBookingReviewRequest request) {
        customerPortalService.submitReview(authentication.getName(), bookingId, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/wishlist")
    public List<Map<String, Object>> wishlist(Authentication authentication) {
        return customerPortalService.wishlist(authentication.getName());
    }

    @PostMapping("/wishlist/{vehicleId}")
    public ResponseEntity<Void> addWishlistItem(Authentication authentication, @PathVariable long vehicleId) {
        customerPortalService.addWishlistItem(authentication.getName(), vehicleId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/wishlist/{vehicleId}")
    public ResponseEntity<Void> removeWishlistItem(Authentication authentication, @PathVariable long vehicleId) {
        return customerPortalService.removeWishlistItem(authentication.getName(), vehicleId)
                ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @GetMapping("/kyc")
    public List<Map<String, Object>> kyc(Authentication authentication) {
        return customerPortalService.kyc(authentication.getName());
    }

    @PostMapping(value = "/kyc", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> submitKyc(Authentication authentication,
                                           @Valid @RequestPart("application") CustomerKycRequest request,
                                           @RequestPart(value = "document", required = false) MultipartFile document) {
        customerPortalService.submitKyc(authentication.getName(), request, document);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/notifications")
    public List<Map<String, Object>> notifications(Authentication authentication) {
        return customerPortalService.notifications(authentication.getName());
    }

    @PostMapping("/notifications/{notificationId}/read")
    public ResponseEntity<Void> markNotificationRead(Authentication authentication,
                                                      @PathVariable long notificationId) {
        return customerPortalService.markNotificationRead(authentication.getName(), notificationId)
                ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @GetMapping("/support")
    public List<Map<String, Object>> supportTickets(Authentication authentication) {
        return customerPortalService.supportTickets(authentication.getName());
    }

    @PostMapping("/support")
    public Map<String, Object> createSupportTicket(Authentication authentication,
                                                    @Valid @RequestBody CustomerSupportRequest request) {
        return Map.of("id", customerPortalService.createSupportTicket(authentication.getName(), request),
                "status", "OPEN", "message", "Support request submitted");
    }
}
