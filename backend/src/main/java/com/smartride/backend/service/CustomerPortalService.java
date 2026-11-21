package com.smartride.backend.service;

import com.smartride.backend.dto.CustomerBookingDto;
import com.smartride.backend.dto.CustomerDashboardDto;
import com.smartride.backend.dto.CustomerProfileDto;
import com.smartride.backend.dto.CustomerProfileUpdateRequest;
import com.smartride.backend.dto.CustomerKycRequest;
import com.smartride.backend.dto.CustomerSupportRequest;
import com.smartride.backend.dto.CustomerBookingReviewRequest;
import com.smartride.backend.entity.User;
import com.smartride.backend.repository.CustomerPortalRepository;
import com.smartride.backend.repository.VehicleCatalogRepository;
import com.smartride.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class CustomerPortalService {
    private static final Logger LOGGER = LoggerFactory.getLogger(CustomerPortalService.class);
    private final UserRepository userRepository;
    private final CustomerPortalRepository portalRepository;
    private final VehicleCatalogRepository vehicleCatalogRepository;
    private final CustomerKycDocumentStorage kycDocumentStorage;

    public CustomerPortalService(UserRepository userRepository, CustomerPortalRepository portalRepository,
                                 VehicleCatalogRepository vehicleCatalogRepository,
                                 CustomerKycDocumentStorage kycDocumentStorage) {
        this.userRepository = userRepository;
        this.portalRepository = portalRepository;
        this.vehicleCatalogRepository = vehicleCatalogRepository;
        this.kycDocumentStorage = kycDocumentStorage;
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
        return vehicleCatalogRepository.findAvailableVehicles();
    }

    public Map<String, Object> vehicle(String email, long vehicleId) {
        requireCustomer(email);
        return vehicleCatalogRepository.findAvailableVehicle(vehicleId);
    }

    @Transactional
    public void submitReview(String email, long bookingId, CustomerBookingReviewRequest request) {
        portalRepository.submitReview(requireCustomer(email).getId(), bookingId,
                request.rating(), request.comment());
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

    @Transactional
    public void submitKyc(String email, CustomerKycRequest request, MultipartFile document) {
        long customerId = requireCustomer(email).getId();
        if (!request.hasSupportedType()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a supported identity document type");
        }
        String oldKey = portalRepository.kycDocumentKey(customerId);
        CustomerKycDocumentStorage.StoredFile stored = document == null || document.isEmpty()
                ? null : kycDocumentStorage.store(document);
        try {
            portalRepository.submitKyc(customerId, request.documentType().trim().toUpperCase(Locale.ROOT),
                    request.documentNumber().trim(), stored);
        } catch (RuntimeException exception) {
            if (stored != null) cleanupKycDocument(stored.key());
            throw exception;
        }
        if (stored != null) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    if (oldKey != null && !oldKey.equals(stored.key())) cleanupKycDocument(oldKey);
                }

                @Override
                public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) cleanupKycDocument(stored.key());
                }
            });
        }
    }

    @Transactional(readOnly = true)
    public KycDocument adminKycDocument(long customerId) {
        Map<String, Object> document = portalRepository.kycDocument(customerId);
        Object key = document.get("storage_key");
        if (key == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "KYC document not found");
        Path path = kycDocumentStorage.resolve(String.valueOf(key));
        if (!Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "KYC document file not found");
        }
        return new KycDocument(path, String.valueOf(document.get("original_name")),
                String.valueOf(document.get("content_type")));
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

    public record KycDocument(Path path, String originalName, String contentType) { }

    private void cleanupKycDocument(String key) {
        try {
            kycDocumentStorage.delete(key);
        } catch (RuntimeException exception) {
            LOGGER.warn("Could not clean up customer KYC document {}", key, exception);
        }
    }
}
