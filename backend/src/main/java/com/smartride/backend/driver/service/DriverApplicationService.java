package com.smartride.backend.driver.service;

import com.smartride.backend.driver.dto.DriverRegistrationRequest;
import com.smartride.backend.entity.Role;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.RoleRepository;
import com.smartride.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class DriverApplicationService {
    private static final Set<String> VEHICLE_CATEGORIES = Set.of(
            "Two-Wheelers", "Cars", "Commercial Vehicles", "Passenger Vehicles",
            "Construction Equipment", "Agricultural Machinery", "Watercraft",
            "Adventure Vehicles", "Emergency Vehicles");

    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbc;
    private final DriverDocumentStorage storage;

    public DriverApplicationService(UserRepository users, RoleRepository roles, PasswordEncoder passwordEncoder,
                                    JdbcTemplate jdbc, DriverDocumentStorage storage) {
        this.users = users;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
        this.jdbc = jdbc;
        this.storage = storage;
    }

    @Transactional
    public Map<String, Object> register(DriverRegistrationRequest request,
                                        MultipartFile drivingLicense, MultipartFile identityProof,
                                        MultipartFile profilePhoto) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        String fullName = request.getFullName().trim().replaceAll("\\s+", " ");
        String licenseNumber = request.getLicenseNumber().trim().replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
        List<String> categories = request.getVehicleCategories().stream()
                .map(String::trim).distinct().toList();

        if (!request.isTermsAccepted() || !request.isDriverPoliciesAccepted()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Accept the Terms and Driver Policies before submitting your application");
        }
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match");
        }
        if (request.getDateOfBirth().isAfter(LocalDate.now().minusYears(18))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Driver applicants must be at least 18 years old");
        }
        if (!request.getLicenseExpiryDate().isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Driving license must not be expired");
        }
        if (categories.isEmpty() || !VEHICLE_CATEGORIES.containsAll(categories)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select valid vehicle categories");
        }
        if (users.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        Integer duplicateLicense = jdbc.queryForObject(
                "SELECT COUNT(*) FROM driver_applications WHERE license_number = ?", Integer.class, licenseNumber);
        if (duplicateLicense != null && duplicateLicense > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This driving license is already registered");
        }

        Role driverRole = roles.findByName(RoleName.DRIVER)
                .orElseThrow(() -> new IllegalStateException("DRIVER role is not configured"));
        String[] nameParts = splitName(fullName);
        User user = new User();
        user.setFullName(fullName);
        user.setFirstName(nameParts[0]);
        user.setLastName(nameParts[1]);
        user.setEmail(email);
        user.setPhone(request.getMobileNumber().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(RoleName.DRIVER);
        user.setRoles(Set.of(driverRole));
        user.setActive(false);
        user.setApprovalStatus("PENDING");
        User savedUser = users.saveAndFlush(user);

        List<String> storedKeys = new ArrayList<>();
        try {
            DriverDocumentStorage.StoredFile licenseFile = storage.store(drivingLicense);
            storedKeys.add(licenseFile.key());
            DriverDocumentStorage.StoredFile identityFile = storage.store(identityProof);
            storedKeys.add(identityFile.key());
            DriverDocumentStorage.StoredFile profilePhotoFile = null;
            if (profilePhoto != null && !profilePhoto.isEmpty()) {
                profilePhotoFile = storage.storeImage(profilePhoto);
                storedKeys.add(profilePhotoFile.key());
            }

            String applicationNumber = "SRD-" + UUID.randomUUID().toString()
                    .substring(0, 12).toUpperCase(Locale.ROOT);
            jdbc.update("""
                    INSERT INTO driver_applications (
                        user_id, application_number, date_of_birth, address, city, state, pincode,
                        license_number, license_expiry_date, experience_years, vehicle_categories,
                        license_storage_key, license_original_name, license_content_type,
                        identity_storage_key, identity_original_name, identity_content_type,
                        profile_photo_storage_key, profile_photo_original_name, profile_photo_content_type,
                        terms_accepted, driver_policies_accepted, submitted_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, savedUser.getId(), applicationNumber, request.getDateOfBirth(),
                    request.getAddress().trim(), request.getCity().trim(), request.getState().trim(),
                    request.getPincode().trim(), licenseNumber, request.getLicenseExpiryDate(),
                    request.getDrivingExperienceYears(), String.join(", ", categories),
                    licenseFile.key(), licenseFile.originalName(), licenseFile.contentType(),
                    identityFile.key(), identityFile.originalName(), identityFile.contentType(),
                    profilePhotoFile == null ? null : profilePhotoFile.key(),
                    profilePhotoFile == null ? null : profilePhotoFile.originalName(),
                    profilePhotoFile == null ? null : profilePhotoFile.contentType(),
                    request.isTermsAccepted(), request.isDriverPoliciesAccepted(),
                    LocalDateTime.now());
            jdbc.update("""
                    INSERT INTO admin_notifications (title, message, event_type, entity_type, entity_id)
                    VALUES (?, ?, 'DRIVER_APPLICATION', 'DRIVER_APPLICATION', ?)
                    """, "New driver application", fullName + " submitted a driver application",
                    savedUser.getId());

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("applicationNumber", applicationNumber);
            result.put("fullName", fullName);
            result.put("email", email);
            result.put("status", "PENDING");
            result.put("submittedAt", LocalDateTime.now());
            return result;
        } catch (RuntimeException exception) {
            storedKeys.forEach(storage::delete);
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> adminApplications(String status, String search) {
        String normalizedStatus = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        if (!normalizedStatus.isEmpty()
                && !Set.of("PENDING", "APPROVED", "REJECTED", "SUSPENDED").contains(normalizedStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid driver application status");
        }
        String normalizedSearch = search == null ? "" : search.trim();
        String searchPattern = "%" + normalizedSearch.toLowerCase(Locale.ROOT) + "%";
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT u.id, d.application_number, u.full_name AS name, u.email, u.phone,
                       d.date_of_birth, d.address, d.city, d.state, d.pincode,
                       d.license_number, d.license_expiry_date, d.experience_years,
                       d.vehicle_categories, d.license_original_name, d.identity_original_name,
                       d.profile_photo_original_name, d.submitted_at,
                       COALESCE(u.approval_status, 'PENDING') AS status,
                       u.approval_reason
                FROM driver_applications d
                JOIN users u ON u.id = d.user_id
                WHERE u.role = 'DRIVER'
                  AND (? = '' OR UPPER(COALESCE(u.approval_status, 'PENDING')) = ?)
                  AND (? = '' OR LOWER(u.full_name) LIKE ? OR LOWER(u.email) LIKE ?
                       OR LOWER(d.license_number) LIKE ? OR LOWER(d.application_number) LIKE ?)
                ORDER BY d.submitted_at DESC, u.id DESC
                LIMIT 500
                """, normalizedStatus, normalizedStatus, normalizedSearch,
                searchPattern, searchPattern, searchPattern, searchPattern);
        return rows.stream().map(row -> {
            Map<String, Object> normalized = new LinkedHashMap<>();
            row.forEach((key, value) -> normalized.put(key.toLowerCase(Locale.ROOT), value));
            return normalized;
        }).toList();
    }

    @Transactional(readOnly = true)
    public StoredDocument adminDocument(long userId, String documentType) {
        String[] columns = switch (documentType.toUpperCase(Locale.ROOT)) {
            case "LICENSE" -> new String[] {"license_storage_key", "license_original_name", "license_content_type"};
            case "IDENTITY" -> new String[] {"identity_storage_key", "identity_original_name", "identity_content_type"};
            case "PHOTO" -> new String[] {"profile_photo_storage_key", "profile_photo_original_name", "profile_photo_content_type"};
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown driver document type");
        };
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT d.%s AS storage_key, d.%s AS original_name, d.%s AS content_type
                FROM driver_applications d
                JOIN users u ON u.id = d.user_id
                WHERE d.user_id = ? AND u.role = 'DRIVER'
                """.formatted(columns[0], columns[1], columns[2]), userId);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver document not found");

        Map<String, Object> row = new LinkedHashMap<>();
        rows.get(0).forEach((key, value) -> row.put(key.toLowerCase(Locale.ROOT), value));
        Object keyValue = row.get("storage_key");
        if (keyValue == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver document not found");
        String storageKey = String.valueOf(keyValue);
        Path path = storage.resolve(storageKey);
        if (!Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver document file not found");
        }
        return new StoredDocument(path, String.valueOf(row.get("original_name")),
                String.valueOf(row.get("content_type")));
    }

    private static String[] splitName(String fullName) {
        String[] nameParts = fullName.split("\\s+", 2);
        return new String[] {nameParts[0], nameParts.length > 1 ? nameParts[1] : "Driver"};
    }

    public record StoredDocument(Path path, String originalName, String contentType) { }
}
