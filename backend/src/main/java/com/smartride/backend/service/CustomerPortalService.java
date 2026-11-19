package com.smartride.backend.service;

import com.smartride.backend.dto.CustomerBookingDto;
import com.smartride.backend.dto.CustomerDashboardDto;
import com.smartride.backend.dto.CustomerProfileDto;
import com.smartride.backend.dto.CustomerProfileUpdateRequest;
import com.smartride.backend.dto.CustomerKycRequest;
import com.smartride.backend.dto.CustomerSupportRequest;
import com.smartride.backend.entity.User;
import com.smartride.backend.repository.CustomerPortalRepository;
import com.smartride.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class CustomerPortalService {
    private final UserRepository userRepository;
    private final CustomerPortalRepository portalRepository;

    public CustomerPortalService(UserRepository userRepository, CustomerPortalRepository portalRepository) {
        this.userRepository = userRepository;
        this.portalRepository = portalRepository;
    }

    public CustomerDashboardDto dashboard(String email) {
        User user = requireCustomer(email);
        List<CustomerBookingDto> bookings = portalRepository.findBookings(user.getId());
        LocalDateTime now = LocalDateTime.now();
        List<CustomerBookingDto> upcoming = bookings.stream()
                .filter(booking -> booking.pickupDate() != null
                        && booking.pickupDate().isAfter(now)
                        && !isStatus(booking, "CANCELLED", "REJECTED", "COMPLETED"))
                .toList();
        long active = bookings.stream().filter(booking -> isActive(booking, now)).count();
        long completed = bookings.stream().filter(booking -> isStatus(booking, "COMPLETED", "RETURNED")).count();

        return new CustomerDashboardDto(user.getFullName(), bookings.size(), upcoming.size(), active, completed,
                bookings.stream().limit(5).toList(), upcoming.stream().limit(5).toList());
    }

    public List<CustomerBookingDto> bookings(String email, String view) {
        List<CustomerBookingDto> bookings = portalRepository.findBookings(requireCustomer(email).getId());
        LocalDateTime now = LocalDateTime.now();
        return switch (view) {
            case "active" -> bookings.stream().filter(booking -> isActive(booking, now)).toList();
            case "history" -> bookings.stream().filter(booking -> isStatus(booking,
                    "COMPLETED", "RETURNED", "CANCELLED", "REJECTED")).toList();
            case "upcoming" -> bookings.stream().filter(booking -> booking.pickupDate() != null
                    && booking.pickupDate().isAfter(now)
                    && !isStatus(booking, "CANCELLED", "REJECTED", "COMPLETED")).toList();
            default -> bookings;
        };
    }

    public CustomerProfileDto profile(String email) {
        return toProfile(requireCustomer(email));
    }

    @Transactional
    public CustomerProfileDto updateProfile(String email, CustomerProfileUpdateRequest request) {
        User user = requireCustomer(email);
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setFullName((user.getFirstName() + " " + user.getLastName()).trim());
        user.setPhone(request.phone() == null || request.phone().isBlank() ? null : request.phone().trim());
        return toProfile(userRepository.save(user));
    }

    public List<Map<String, Object>> payments(String email) {
        return portalRepository.findPayments(requireCustomer(email).getId());
    }

    public List<Map<String, Object>> vehicles(String email) {
        requireCustomer(email);
        return portalRepository.findVehicles();
    }

    public List<Map<String, Object>> wishlist(String email) {
        return portalRepository.findWishlist(requireCustomer(email).getId());
    }

    public void addWishlistItem(String email, long vehicleId) {
        portalRepository.addToWishlist(requireCustomer(email).getId(), vehicleId);
    }

    public boolean removeWishlistItem(String email, long vehicleId) {
        return portalRepository.removeFromWishlist(requireCustomer(email).getId(), vehicleId);
    }

    public List<Map<String, Object>> kyc(String email) {
        return portalRepository.findKyc(requireCustomer(email).getId());
    }

    public void submitKyc(String email, CustomerKycRequest request) {
        portalRepository.submitKyc(requireCustomer(email).getId(),
                request.documentType().trim(), request.documentNumber().trim());
    }

    public List<Map<String, Object>> notifications(String email) {
        return portalRepository.findNotifications(requireCustomer(email).getId());
    }

    public boolean markNotificationRead(String email, long notificationId) {
        return portalRepository.markNotificationRead(requireCustomer(email).getId(), notificationId);
    }

    public List<Map<String, Object>> supportTickets(String email) {
        return portalRepository.findSupportTickets(requireCustomer(email).getId());
    }

    public long createSupportTicket(String email, CustomerSupportRequest request) {
        return portalRepository.createSupportTicket(requireCustomer(email).getId(),
                request.subject().trim(), request.message().trim());
    }

    private User requireCustomer(String email) {
        User user = userRepository.findByEmail(normalize(email))
                .orElseThrow(() -> new IllegalArgumentException("Customer account not found"));
        if (!user.isActive() || user.getRole() == null || !"CUSTOMER".equals(user.getRole().name())) {
            throw new IllegalArgumentException("A customer account is required");
        }
        return user;
    }

    private CustomerProfileDto toProfile(User user) {
        return new CustomerProfileDto(user.getId(), user.getFirstName(), user.getLastName(),
                user.getFullName(), user.getEmail(), user.getPhone(), user.getRole().name());
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean isActive(CustomerBookingDto booking, LocalDateTime now) {
        if (isStatus(booking, "ACTIVE", "IN_PROGRESS", "IN PROGRESS")) return true;
        return booking.pickupDate() != null && booking.returnDate() != null
                && !booking.pickupDate().isAfter(now) && booking.returnDate().isAfter(now)
                && !isStatus(booking, "CANCELLED", "REJECTED", "COMPLETED", "RETURNED");
    }

    private static boolean isStatus(CustomerBookingDto booking, String... statuses) {
        if (booking.status() == null) return false;
        String status = booking.status().trim().toUpperCase(Locale.ROOT);
        for (String candidate : statuses) if (candidate.equals(status)) return true;
        return false;
    }
}
