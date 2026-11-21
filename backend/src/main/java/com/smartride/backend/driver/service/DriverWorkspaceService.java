package com.smartride.backend.driver.service;

import com.smartride.backend.driver.dto.DriverProfileUpdateRequest;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class DriverWorkspaceService {
    private static final Set<String> ADDITIONAL_DOCUMENT_TYPES =
            Set.of("MEDICAL_CERTIFICATE", "POLICE_CLEARANCE", "OTHER");

    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final DriverDocumentStorage storage;

    public DriverWorkspaceService(JdbcTemplate jdbc, UserRepository users, DriverDocumentStorage storage) {
        this.jdbc = jdbc;
        this.users = users;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> profile(String email) {
        User user = requireDriver(email);
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT application_number, date_of_birth, address, city, state, pincode,
                       license_expiry_date, experience_years, vehicle_categories, submitted_at
                FROM driver_applications WHERE user_id = ?
                """, user.getId());
        Map<String, Object> application = rows.isEmpty() ? Map.of() : rows.get(0);
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("id", user.getId());
        profile.put("fullName", user.getFullName());
        profile.put("email", user.getEmail());
        profile.put("phone", user.getPhone());
        profile.put("approvalStatus", user.getApprovalStatus());
        profile.put("applicationNumber", application.get("application_number"));
        profile.put("dateOfBirth", application.get("date_of_birth"));
        profile.put("address", application.get("address"));
        profile.put("city", application.get("city"));
        profile.put("state", application.get("state"));
        profile.put("pincode", application.get("pincode"));
        profile.put("licenseExpiryDate", application.get("license_expiry_date"));
        profile.put("experienceYears", application.get("experience_years"));
        profile.put("vehicleCategories", application.get("vehicle_categories"));
        profile.put("submittedAt", application.get("submitted_at"));
        return profile;
    }

    @Transactional
    public Map<String, Object> updateProfile(String email, DriverProfileUpdateRequest request) {
        User user = requireDriver(email);
        String fullName = request.fullName().trim().replaceAll("\\s+", " ");
        String[] parts = fullName.split("\\s+", 2);
        String lastName = parts.length > 1 ? parts[1] : "";
        if (parts[0].length() > 100 || lastName.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "First and last names must be 100 characters or fewer");
        }
        user.setFullName(fullName);
        user.setFirstName(parts[0]);
        user.setLastName(lastName);
        user.setPhone(request.phone().trim());
        users.save(user);
        jdbc.update("""
                UPDATE driver_applications
                SET address = ?, city = ?, state = ?, pincode = ?
                WHERE user_id = ?
                """, request.address().trim(), request.city().trim(), request.state().trim(),
                request.pincode().trim(), user.getId());
        return profile(email);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> availability(String email) {
        User user = requireDriver(email);
        return availabilityById(user.getId());
    }

    @Transactional
    public Map<String, Object> updateAvailability(String email, boolean available) {
        User user = requireDriver(email);
        jdbc.queryForObject("SELECT id FROM users WHERE id = ? FOR UPDATE", Long.class, user.getId());
        ensurePreferences(user.getId());
        if (available && hasActiveTrip(user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Availability cannot be enabled while a trip is in progress");
        }
        jdbc.update("""
                UPDATE driver_preferences
                SET is_available = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
                """, available, user.getId());
        return availabilityById(user.getId());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> documents(String email) {
        User user = requireDriver(email);
        List<Map<String, Object>> documents = new ArrayList<>();
        jdbc.queryForList("""
                SELECT 'LICENSE' AS document_type, license_original_name AS original_name,
                       license_content_type AS content_type, submitted_at AS uploaded_at
                FROM driver_applications WHERE user_id = ? AND license_storage_key IS NOT NULL
                UNION ALL
                SELECT 'IDENTITY' AS document_type, identity_original_name AS original_name,
                       identity_content_type AS content_type, submitted_at AS uploaded_at
                FROM driver_applications WHERE user_id = ? AND identity_storage_key IS NOT NULL
                UNION ALL
                SELECT 'PHOTO' AS document_type, profile_photo_original_name AS original_name,
                       profile_photo_content_type AS content_type, submitted_at AS uploaded_at
                FROM driver_applications WHERE user_id = ? AND profile_photo_storage_key IS NOT NULL
                """, user.getId(), user.getId(), user.getId()).forEach(row -> {
            Map<String, Object> item = new LinkedHashMap<>(row);
            item.put("source", "APPLICATION");
            documents.add(item);
        });
        jdbc.queryForList("""
                SELECT id, document_type, original_name, content_type, uploaded_at
                FROM driver_documents WHERE user_id = ?
                ORDER BY uploaded_at DESC, id DESC
                """, user.getId()).forEach(row -> {
            Map<String, Object> item = new LinkedHashMap<>(row);
            item.put("source", "ADDITIONAL");
            documents.add(item);
        });
        return Map.of("items", documents);
    }

    @Transactional(readOnly = true)
    public StoredDocument applicationDocument(String email, String documentType) {
        User user = requireDriver(email);
        String[] columns = switch (documentType.toUpperCase(Locale.ROOT)) {
            case "LICENSE" -> new String[] {"license_storage_key", "license_original_name", "license_content_type"};
            case "IDENTITY" -> new String[] {"identity_storage_key", "identity_original_name", "identity_content_type"};
            case "PHOTO" -> new String[] {"profile_photo_storage_key", "profile_photo_original_name", "profile_photo_content_type"};
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown driver document type");
        };
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT %s AS storage_key, %s AS original_name, %s AS content_type
                FROM driver_applications WHERE user_id = ?
                """.formatted(columns[0], columns[1], columns[2]), user.getId());
        if (rows.isEmpty() || rows.get(0).get("storage_key") == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver document not found");
        }
        return storedDocument(rows.get(0));
    }

    @Transactional(readOnly = true)
    public StoredDocument additionalDocument(String email, long documentId) {
        User user = requireDriver(email);
        try {
            return storedDocument(jdbc.queryForMap("""
                    SELECT storage_key, original_name, content_type
                    FROM driver_documents WHERE id = ? AND user_id = ?
                    """, documentId, user.getId()));
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver document not found");
        }
    }

    @Transactional
    public Map<String, Object> uploadDocument(String email, String documentType, MultipartFile file) {
        User user = requireDriver(email);
        String normalizedType = documentType == null ? "" : documentType.trim().toUpperCase(Locale.ROOT);
        if (!ADDITIONAL_DOCUMENT_TYPES.contains(normalizedType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a valid additional document type");
        }
        DriverDocumentStorage.StoredFile stored = storage.store(file);
        try {
            Long id = jdbc.queryForObject("""
                    INSERT INTO driver_documents (user_id, document_type, storage_key, original_name, content_type)
                    VALUES (?, ?, ?, ?, ?) RETURNING id
                    """, Long.class, user.getId(), normalizedType, stored.key(),
                    stored.originalName(), stored.contentType());
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", id);
            result.put("document_type", normalizedType);
            result.put("original_name", stored.originalName());
            result.put("content_type", stored.contentType());
            result.put("source", "ADDITIONAL");
            return result;
        } catch (RuntimeException exception) {
            storage.delete(stored.key());
            throw exception;
        }
    }

    @Transactional
    public void deleteDocument(String email, long documentId) {
        User user = requireDriver(email);
        Map<String, Object> document;
        try {
            document = jdbc.queryForMap("""
                    SELECT storage_key FROM driver_documents WHERE id = ? AND user_id = ? FOR UPDATE
                    """, documentId, user.getId());
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver document not found");
        }
        if (jdbc.update("DELETE FROM driver_documents WHERE id = ? AND user_id = ?", documentId, user.getId()) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver document not found");
        }
        storage.delete(String.valueOf(document.get("storage_key")));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> notifications(String email) {
        User user = requireDriver(email);
        List<Map<String, Object>> items = jdbc.queryForList("""
                SELECT id, title, message, is_read, created_at
                FROM driver_notifications WHERE user_id = ?
                ORDER BY created_at DESC, id DESC LIMIT 200
                """, user.getId());
        Long unread = jdbc.queryForObject("""
                SELECT COUNT(*) FROM driver_notifications WHERE user_id = ? AND is_read = FALSE
                """, Long.class, user.getId());
        return Map.of("items", items, "unread", unread == null ? 0 : unread);
    }

    @Transactional
    public void markNotificationRead(String email, long id) {
        long driverId = requireDriver(email).getId();
        if (jdbc.update("""
                UPDATE driver_notifications SET is_read = TRUE WHERE user_id = ? AND id = ?
                """, driverId, id) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found");
        }
    }

    @Transactional
    public void markAllNotificationsRead(String email) {
        long driverId = requireDriver(email).getId();
        jdbc.update("UPDATE driver_notifications SET is_read = TRUE WHERE user_id = ?", driverId);
    }

    private Map<String, Object> availabilityById(long userId) {
        return jdbc.queryForMap("""
                SELECT COALESCE(p.is_available, TRUE)
                           AND NOT EXISTS (SELECT 1 FROM driver_trip_assignments a
                                           WHERE a.driver_id = u.id AND a.status = 'IN_PROGRESS') AS available,
                       p.updated_at,
                       EXISTS (SELECT 1 FROM driver_trip_assignments a
                               WHERE a.driver_id = u.id AND a.status = 'IN_PROGRESS') AS trip_in_progress
                FROM users u LEFT JOIN driver_preferences p ON p.user_id = u.id WHERE u.id = ?
                """, userId);
    }

    private void ensurePreferences(long userId) {
        jdbc.update("""
                INSERT INTO driver_preferences (user_id) VALUES (?)
                ON CONFLICT (user_id) DO NOTHING
                """, userId);
    }

    private boolean hasActiveTrip(long userId) {
        Boolean active = jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM driver_trip_assignments
                               WHERE driver_id = ? AND status = 'IN_PROGRESS')
                """, Boolean.class, userId);
        return Boolean.TRUE.equals(active);
    }

    private StoredDocument storedDocument(Map<String, Object> row) {
        String key = String.valueOf(row.get("storage_key"));
        Path path = storage.resolve(key);
        if (!Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver document file not found");
        }
        return new StoredDocument(path, String.valueOf(row.get("original_name")),
                String.valueOf(row.get("content_type")));
    }

    private User requireDriver(String email) {
        return users.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .filter(user -> user.getRole() == RoleName.DRIVER && user.isActive()
                        && "APPROVED".equalsIgnoreCase(user.getApprovalStatus()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "An active approved driver account is required"));
    }

    public record StoredDocument(Path path, String originalName, String contentType) { }
}
