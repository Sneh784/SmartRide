package com.smartride.backend.service;

import com.smartride.backend.dto.VendorVehicleRequest;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

@Service
public class VendorOperationsService {
    private static final Logger LOGGER = LoggerFactory.getLogger(VendorOperationsService.class);
    private static final Map<String, Integer> MEDIA_LIMITS = Map.of(
            "PHOTO", 6, "REGISTRATION", 2, "INSURANCE", 1, "PUC", 1);
    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final VendorDocumentStorage storage;
    private final CloudinaryImageStorage cloudinaryImages;

    public VendorOperationsService(JdbcTemplate jdbc, UserRepository users, VendorDocumentStorage storage,
                                   CloudinaryImageStorage cloudinaryImages) {
        this.jdbc = jdbc;
        this.users = users;
        this.storage = storage;
        this.cloudinaryImages = cloudinaryImages;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dashboard(String email) {
        long vendorId = requireApprovedVendor(email).getId();
        Map<String, Object> result = normalized(jdbc.queryForMap("""
                SELECT
                  (SELECT COUNT(*) FROM vehicles WHERE vendor_id = ?) AS total_vehicles,
                  (SELECT COUNT(*) FROM vehicles WHERE vendor_id = ? AND UPPER(COALESCE(approval_status, 'PENDING')) = 'APPROVED') AS approved_vehicles,
                  (SELECT COUNT(*) FROM vehicles WHERE vendor_id = ? AND UPPER(COALESCE(approval_status, 'PENDING')) = 'PENDING') AS pending_vehicles,
                  (SELECT COUNT(*) FROM vehicles WHERE vendor_id = ? AND UPPER(COALESCE(approval_status, 'PENDING')) = 'REJECTED') AS rejected_vehicles,
                  (SELECT COUNT(*) FROM bookings b JOIN vehicles v ON v.id = b.vehicle_id WHERE v.vendor_id = ?) AS total_bookings,
                  (SELECT COUNT(*) FROM bookings b JOIN vehicles v ON v.id = b.vehicle_id
                    WHERE v.vendor_id = ? AND UPPER(b.status) IN ('ACTIVE', 'IN_PROGRESS')) AS active_rentals,
                  (SELECT COUNT(*) FROM bookings b JOIN vehicles v ON v.id = b.vehicle_id
                    WHERE v.vendor_id = ? AND UPPER(b.status) IN ('COMPLETED', 'RETURNED')) AS completed_rentals,
                  (SELECT COALESCE(SUM(p.amount), 0) FROM payments p
                    JOIN bookings b ON b.id = p.booking_id JOIN vehicles v ON v.id = b.vehicle_id
                    WHERE v.vendor_id = ? AND UPPER(p.status) IN ('SUCCESS', 'SUCCEEDED', 'COMPLETED')) AS gross_paid_amount
                """, vendorId, vendorId, vendorId, vendorId, vendorId, vendorId, vendorId, vendorId));
        result.put("recentVehicles", vehicles(vendorId, "", "", 5));
        result.put("recentBookings", bookings(vendorId, "", 5));
        LocalDateTime firstMonth = LocalDate.now().withDayOfMonth(1).minusMonths(5).atStartOfDay();
        result.put("monthlyEarnings", normalizedRows(jdbc.queryForList("""
                SELECT TO_CHAR(DATE_TRUNC('month', p.created_at), 'YYYY-MM') AS "month",
                       COALESCE(SUM(p.amount), 0) AS amount
                FROM payments p
                JOIN bookings b ON b.id = p.booking_id
                JOIN vehicles v ON v.id = b.vehicle_id
                WHERE v.vendor_id = ?
                  AND UPPER(p.status) IN ('SUCCESS', 'SUCCEEDED', 'COMPLETED')
                  AND p.created_at >= ?
                GROUP BY DATE_TRUNC('month', p.created_at)
                ORDER BY DATE_TRUNC('month', p.created_at)
                """, vendorId, firstMonth)));
        result.put("monthlyBookings", normalizedRows(jdbc.queryForList("""
                SELECT TO_CHAR(DATE_TRUNC('month', b.created_at), 'YYYY-MM') AS "month",
                       COUNT(*) AS count
                FROM bookings b
                JOIN vehicles v ON v.id = b.vehicle_id
                WHERE v.vendor_id = ?
                  AND b.created_at >= ?
                GROUP BY DATE_TRUNC('month', b.created_at)
                ORDER BY DATE_TRUNC('month', b.created_at)
                """, vendorId, firstMonth)));
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> vehicles(String email, String status, String search) {
        return vehicles(requireApprovedVendor(email).getId(), status, search, 100);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> vehicle(String email, long vehicleId) {
        User vendor = requireApprovedVendor(email);
        try {
            return normalized(jdbc.queryForMap("""
                    SELECT id, category, subcategory, title, brand, model, "year", registration_number, color,
                           fuel_type, transmission, seating_capacity, mileage, features, daily_rate, hourly_rate,
                           security_deposit, km_limit_per_day, extra_km_charge, with_driver_rate,
                           city, location, availability_status, approval_status,
                           approval_reason, description, created_at
                    FROM vehicles WHERE id = ? AND vendor_id = ?
                    """, vehicleId, vendor.getId()));
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found");
        }
    }

    @Transactional
    public Map<String, Object> createVehicle(String email, VendorVehicleRequest request) {
        long vendorId = requireApprovedVendor(email).getId();
        String insert = """
                INSERT INTO vehicles (
                    vendor_id, category, subcategory, title, brand, model, "year", registration_number, color,
                    fuel_type, transmission, seating_capacity, mileage, features, daily_rate, hourly_rate,
                    security_deposit, km_limit_per_day, extra_km_charge, with_driver_rate,
                    city, location, availability_status, approval_status, description
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNAVAILABLE', 'PENDING', ?)
                """;
        KeyHolder keyHolder = new GeneratedKeyHolder();
        Object[] values = {
                vendorId, request.category().trim(), blankToNull(request.subcategory()), request.title().trim(),
                request.brand().trim(), request.model().trim(), request.year(),
                blankToNull(request.registrationNumber()), blankToNull(request.color()),
                blankToNull(request.fuelType()), blankToNull(request.transmission()), request.seatingCapacity(),
                request.mileage(), blankToNull(request.features()), request.dailyRate(), request.hourlyRate(),
                request.securityDeposit(), request.kmLimitPerDay(), request.extraKmCharge(),
                request.withDriverRate(), request.city().trim(), request.location().trim(),
                blankToNull(request.description())
        };
        jdbc.update(connection -> {
            var statement = connection.prepareStatement(insert, Statement.RETURN_GENERATED_KEYS);
            for (int index = 0; index < values.length; index++) {
                statement.setObject(index + 1, values[index]);
            }
            return statement;
        }, keyHolder);
        Object key = keyHolder.getKeys() == null ? null : keyHolder.getKeys().entrySet().stream()
                .filter(entry -> "id".equalsIgnoreCase(entry.getKey()))
                .map(Map.Entry::getValue)
                .findFirst().orElse(null);
        if (!(key instanceof Number generatedId)) {
            throw new IllegalStateException("Vehicle insert did not return an ID");
        }
        long id = generatedId.longValue();
        jdbc.update("""
                INSERT INTO vendor_notifications (user_id, title, message)
                VALUES (?, 'Vehicle submitted for review', ?)
                """, vendorId, request.title().trim() + " has been submitted for admin approval.");
        return vehicle(email, id);
    }

    @Transactional
    public Map<String, Object> updateVehicle(String email, long vehicleId, VendorVehicleRequest request) {
        long vendorId = requireApprovedVendor(email).getId();
        int updated = jdbc.update("""
                UPDATE vehicles SET category = ?, subcategory = ?, title = ?, brand = ?, model = ?, "year" = ?,
                    registration_number = ?, color = ?, fuel_type = ?, transmission = ?, seating_capacity = ?,
                    mileage = ?, features = ?, daily_rate = ?, hourly_rate = ?, security_deposit = ?,
                    km_limit_per_day = ?, extra_km_charge = ?, with_driver_rate = ?,
                    city = ?, location = ?, description = ?, approval_status = 'PENDING',
                    approval_reason = NULL, availability_status = 'UNAVAILABLE'
                WHERE id = ? AND vendor_id = ?
                  AND UPPER(COALESCE(approval_status, 'PENDING')) IN ('PENDING', 'REJECTED')
                """, request.category().trim(), blankToNull(request.subcategory()), request.title().trim(),
                request.brand().trim(), request.model().trim(), request.year(),
                blankToNull(request.registrationNumber()), blankToNull(request.color()), blankToNull(request.fuelType()),
                blankToNull(request.transmission()), request.seatingCapacity(), request.mileage(),
                blankToNull(request.features()), request.dailyRate(), request.hourlyRate(), request.securityDeposit(),
                request.kmLimitPerDay(), request.extraKmCharge(), request.withDriverRate(),
                request.city().trim(), request.location().trim(),
                blankToNull(request.description()), vehicleId, vendorId);
        if (updated == 0) {
            if (!ownsVehicle(vendorId, vehicleId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found");
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only pending or rejected vehicles can be edited and resubmitted");
        }
        return vehicle(email, vehicleId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> vehicleMedia(String email, long vehicleId) {
        long vendorId = requireApprovedVendor(email).getId();
        requireOwnedVehicle(vendorId, vehicleId);
        return normalizedRows(jdbc.queryForList("""
                SELECT id, media_type, original_name, content_type, uploaded_at, secure_url, cloudinary_public_id,
                       '/api/vendor/vehicles/' || vehicle_id || '/media/' || id AS download_url
                FROM vehicle_media
                WHERE vehicle_id = ?
                ORDER BY CASE media_type WHEN 'PHOTO' THEN 0 ELSE 1 END, id
                """, vehicleId));
    }

    @Transactional
    public List<Map<String, Object>> uploadVehicleMedia(String email, long vehicleId,
                                                        List<MultipartFile> photos,
                                                        List<MultipartFile> registrationDocuments,
                                                        List<MultipartFile> insuranceDocuments,
                                                        List<MultipartFile> pucDocuments) {
        long vendorId = requireApprovedVendor(email).getId();
        requireOwnedVehicle(vendorId, vehicleId);

        Map<String, List<MultipartFile>> uploads = new LinkedHashMap<>();
        uploads.put("PHOTO", nonEmpty(photos));
        uploads.put("REGISTRATION", nonEmpty(registrationDocuments));
        uploads.put("INSURANCE", nonEmpty(insuranceDocuments));
        uploads.put("PUC", nonEmpty(pucDocuments));
        if (uploads.values().stream().allMatch(List::isEmpty)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select at least one photo or document to upload");
        }

        int existingPhotos = jdbc.queryForObject(
                "SELECT COUNT(*) FROM vehicle_media WHERE vehicle_id = ? AND media_type = 'PHOTO'",
                Integer.class, vehicleId);
        if (uploads.get("PHOTO").isEmpty() && existingPhotos == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one vehicle photo is required");
        }

        List<StagedMedia> staged = new ArrayList<>();
        Map<String, List<String>> oldKeys = new LinkedHashMap<>();
        try {
            for (Map.Entry<String, List<MultipartFile>> entry : uploads.entrySet()) {
                String type = entry.getKey();
                List<MultipartFile> files = entry.getValue();
                if (files.isEmpty()) continue;
                if (files.size() > MEDIA_LIMITS.get(type)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            type + " supports at most " + MEDIA_LIMITS.get(type) + " file(s)");
                }
                oldKeys.put(type, jdbc.queryForList(
                        "SELECT storage_key FROM vehicle_media WHERE vehicle_id = ? AND media_type = ?",
                        String.class, vehicleId, type));
                for (MultipartFile file : files) {
                    try {
                        String folder = "PHOTO".equals(type)
                                ? "smartride/vehicles/photos" : "smartride/vehicles/documents";
                        CloudinaryImageStorage.StoredAsset stored = cloudinaryImages.store(file, folder, "PHOTO".equals(type));
                        staged.add(new StagedMedia(type, stored.originalName(), "cloudinary:" + stored.resourceType() + ":" + stored.publicId(),
                                stored.contentType(), stored.secureUrl(), stored.resourceType()));
                    } catch (IllegalArgumentException exception) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
                    }
                }
            }

            for (Map.Entry<String, List<String>> entry : oldKeys.entrySet()) {
                jdbc.update("DELETE FROM vehicle_media WHERE vehicle_id = ? AND media_type = ?",
                        vehicleId, entry.getKey());
            }
            for (StagedMedia media : staged) {
                jdbc.update("""
                        INSERT INTO vehicle_media (vehicle_id, media_type, storage_key, cloudinary_public_id,
                                                   secure_url, original_name, content_type)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, vehicleId, media.type(), media.storageKey(), media.publicId(), media.secureUrl(), media.originalName(),
                        media.contentType());
            }
        } catch (RuntimeException exception) {
            deleteStoredFiles(staged.stream().map(StagedMedia::storageKey).toList());
            throw exception;
        }

        List<String> previousKeys = oldKeys.values().stream().flatMap(List::stream).toList();
        List<String> newKeys = staged.stream().map(StagedMedia::storageKey).toList();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteStoredFiles(previousKeys);
            }

            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) deleteStoredFiles(newKeys);
            }
        });
        return vehicleMedia(email, vehicleId);
    }

    @Transactional(readOnly = true)
    public VehicleMediaFile vehicleMediaFile(String email, long vehicleId, long mediaId) {
        long vendorId = requireApprovedVendor(email).getId();
        requireOwnedVehicle(vendorId, vehicleId);
        try {
            Map<String, Object> media = normalized(jdbc.queryForMap("""
                    SELECT storage_key, original_name, content_type, cloudinary_public_id, secure_url
                    FROM vehicle_media WHERE id = ? AND vehicle_id = ?
                    """, mediaId, vehicleId));
            return new VehicleMediaFile(String.valueOf(media.get("storage_key")),
                    String.valueOf(media.get("original_name")), String.valueOf(media.get("content_type")),
                    (String) media.get("cloudinary_public_id"), (String) media.get("secure_url"));
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle file not found");
        }
    }

    @Transactional
    public void deleteVehicleMedia(String email, long vehicleId, long mediaId) {
        long vendorId = requireApprovedVendor(email).getId();
        requireOwnedVehicle(vendorId, vehicleId);
        Map<String, Object> row;
        try {
            row = normalized(jdbc.queryForMap("SELECT storage_key, cloudinary_public_id, content_type FROM vehicle_media WHERE id = ? AND vehicle_id = ?",
                    mediaId, vehicleId));
        } catch (org.springframework.dao.EmptyResultDataAccessException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle media not found");
        }
        String key = String.valueOf(row.get("storage_key"));
        if (key.startsWith("cloudinary:image:") || key.startsWith("cloudinary:raw:")) {
            if (row.get("cloudinary_public_id") == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Cloudinary publicId is missing");
            cloudinaryImages.delete(String.valueOf(row.get("cloudinary_public_id")), key.startsWith("cloudinary:image:") ? "image" : "raw");
        } else if (CloudinaryImageStorage.isCloudinaryKey(key)) {
            String publicId = row.get("cloudinary_public_id") == null ? legacyPublicId(key) : String.valueOf(row.get("cloudinary_public_id"));
            cloudinaryImages.delete(publicId, String.valueOf(row.get("content_type")).startsWith("image/") ? "image" : "raw");
        } else {
            storage.delete(key);
        }
        jdbc.update("DELETE FROM vehicle_media WHERE id = ? AND vehicle_id = ?", mediaId, vehicleId);
    }

    @Transactional
    public void deleteVehicle(String email, long vehicleId) {
        long vendorId = requireApprovedVendor(email).getId();
        Integer bookingCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM bookings WHERE vehicle_id = ?", Integer.class, vehicleId);
        if (!ownsVehicle(vendorId, vehicleId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found");
        }
        if (bookingCount != null && bookingCount > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Vehicles with booking history cannot be deleted");
        }
        int deleted = jdbc.update("""
                DELETE FROM vehicles WHERE id = ? AND vendor_id = ?
                  AND UPPER(COALESCE(approval_status, 'PENDING')) IN ('PENDING', 'REJECTED')
                """, vehicleId, vendorId);
        if (deleted == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only pending or rejected vehicles without bookings can be deleted");
        }
    }

    @Transactional
    public Map<String, Object> setAvailability(String email, long vehicleId, String availability) {
        long vendorId = requireApprovedVendor(email).getId();
        String normalized = availability == null ? "" : availability.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("AVAILABLE", "UNAVAILABLE").contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Availability must be AVAILABLE or UNAVAILABLE");
        }
        int updated = jdbc.update("""
                UPDATE vehicles SET availability_status = ?
                WHERE id = ? AND vendor_id = ? AND UPPER(COALESCE(approval_status, 'PENDING')) = 'APPROVED'
                """, normalized, vehicleId, vendorId);
        if (updated == 0) {
            if (!ownsVehicle(vendorId, vehicleId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found");
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only approved vehicles can change availability");
        }
        return vehicle(email, vehicleId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> bookings(String email, String status) {
        return bookings(requireApprovedVendor(email).getId(), status, 100);
    }

    @Transactional
    public Map<String, Object> reviewBooking(String email, long bookingId, String decision, String reason) {
        long vendorId = requireApprovedVendor(email).getId();
        Map<String, Object> booking;
        try {
            booking = normalized(jdbc.queryForMap("""
                    SELECT b.id, b.status, b.pickup_date, b.return_date, b.customer_id,
                           v.id AS vehicle_id, v.title AS vehicle_name,
                           UPPER(COALESCE(v.approval_status, 'PENDING')) AS vehicle_approval
                    FROM bookings b
                    JOIN vehicles v ON v.id = b.vehicle_id
                    WHERE b.id = ? AND v.vendor_id = ?
                    FOR UPDATE OF b, v
                    """, bookingId, vendorId));
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }

        if (!"PENDING".equalsIgnoreCase(String.valueOf(booking.get("status")))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending booking requests can be reviewed");
        }

        String normalizedDecision = decision == null ? "" : decision.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("CONFIRMED", "REJECTED").contains(normalizedDecision)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported booking decision");
        }
        String cleanedReason = blankToNull(reason);
        if ("REJECTED".equals(normalizedDecision) && cleanedReason == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A rejection reason is required");
        }

        if ("CONFIRMED".equals(normalizedDecision)) {
            if (!"APPROVED".equals(booking.get("vehicle_approval"))) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "A booking can only be confirmed for an approved vehicle");
            }
            Integer conflicts = jdbc.queryForObject("""
                    SELECT COUNT(*) FROM bookings
                    WHERE vehicle_id = ? AND id <> ?
                      AND UPPER(status) IN ('CONFIRMED', 'ACTIVE', 'IN_PROGRESS')
                      AND pickup_date < ? AND return_date > ?
                    """, Integer.class, booking.get("vehicle_id"), bookingId,
                    booking.get("return_date"), booking.get("pickup_date"));
            if (conflicts != null && conflicts > 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "This vehicle has another confirmed booking during the requested dates");
            }
        }

        jdbc.update("""
                UPDATE bookings SET status = ?, vendor_rejection_reason = ?
                WHERE id = ?
                """, normalizedDecision, "REJECTED".equals(normalizedDecision) ? cleanedReason : null, bookingId);

        Object customerId = booking.get("customer_id");
        if (customerId != null) {
            String message = "CONFIRMED".equals(normalizedDecision)
                    ? "Your booking for " + booking.get("vehicle_name") + " has been confirmed by the vendor."
                    : "Your booking for " + booking.get("vehicle_name") + " was declined by the vendor. Reason: " + cleanedReason;
            jdbc.update("""
                    INSERT INTO customer_notifications (customer_id, title, message)
                    VALUES (?, ?, ?)
                    """, customerId, "Booking " + normalizedDecision.toLowerCase(Locale.ROOT), message);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("bookingId", bookingId);
        result.put("status", normalizedDecision);
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> payments(String email) {
        long vendorId = requireApprovedVendor(email).getId();
        return normalizedRows(jdbc.queryForList("""
                SELECT p.id, p.booking_id, p.amount, p.currency, p.provider, p.status,
                       p.created_at AS payment_date, v.title AS vehicle_name
                FROM payments p
                JOIN bookings b ON b.id = p.booking_id
                JOIN vehicles v ON v.id = b.vehicle_id
                WHERE v.vendor_id = ?
                ORDER BY p.created_at DESC NULLS LAST, p.id DESC
                LIMIT 100
                """, vendorId));
    }

    private List<Map<String, Object>> vehicles(long vendorId, String status, String search, int limit) {
        String normalizedStatus = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        if (!normalizedStatus.isEmpty()
                && !Set.of("PENDING", "APPROVED", "REJECTED", "AVAILABLE", "UNAVAILABLE").contains(normalizedStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid vehicle filter");
        }
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        StringBuilder sql = new StringBuilder("""
                SELECT id, category, subcategory, title, brand, model, "year", registration_number, color,
                       fuel_type, transmission, seating_capacity, mileage, features, daily_rate, hourly_rate,
                       security_deposit, km_limit_per_day, extra_km_charge, with_driver_rate,
                       city, location, availability_status, approval_status,
                       approval_reason, description, created_at,
                       COALESCE(
                         (SELECT media.secure_url FROM vehicle_media media
                          WHERE media.vehicle_id = vehicles.id AND media.media_type = 'PHOTO'
                            AND media.secure_url IS NOT NULL ORDER BY media.id LIMIT 1),
                         (SELECT '/api/v1/vehicles/' || vehicles.id || '/photos/' || media.id
                          FROM vehicle_media media WHERE media.vehicle_id = vehicles.id AND media.media_type = 'PHOTO'
                          ORDER BY media.id LIMIT 1)
                       ) AS image_url
                FROM vehicles WHERE vendor_id = ?
                """);
        List<Object> args = new ArrayList<>();
        args.add(vendorId);
        if (Set.of("PENDING", "APPROVED", "REJECTED").contains(normalizedStatus)) {
            sql.append(" AND UPPER(COALESCE(approval_status, 'PENDING')) = ?");
            args.add(normalizedStatus);
        } else if (Set.of("AVAILABLE", "UNAVAILABLE").contains(normalizedStatus)) {
            sql.append(" AND UPPER(COALESCE(availability_status, 'UNAVAILABLE')) = ?");
            args.add(normalizedStatus);
        }
        if (!normalizedSearch.isEmpty()) {
            sql.append("""
                     AND (LOWER(title) LIKE ? OR LOWER(COALESCE(brand, '')) LIKE ?
                          OR LOWER(COALESCE(model, '')) LIKE ?)
                    """);
            String pattern = "%" + normalizedSearch + "%";
            args.add(pattern);
            args.add(pattern);
            args.add(pattern);
        }
        sql.append(" ORDER BY created_at DESC NULLS LAST, id DESC LIMIT ?");
        args.add(limit);
        return normalizedRows(jdbc.queryForList(sql.toString(), args.toArray()));
    }

    private List<Map<String, Object>> bookings(long vendorId, String status, int limit) {
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        StringBuilder sql = new StringBuilder("""
                SELECT b.id, b.status, b.amount, b.booking_type, b.pickup_date, b.return_date,
                       b.pickup_location, b.created_at, b.vendor_rejection_reason,
                       v.id AS vehicle_id, v.title AS vehicle_name,
                       c.full_name AS customer_name
                FROM bookings b
                JOIN vehicles v ON v.id = b.vehicle_id
                LEFT JOIN users c ON c.id = b.customer_id
                WHERE v.vendor_id = ?
                """);
        List<Object> args = new ArrayList<>();
        args.add(vendorId);
        if (!normalized.isEmpty()) {
            sql.append(" AND UPPER(b.status) = ?");
            args.add(normalized);
        }
        sql.append(" ORDER BY b.created_at DESC NULLS LAST, b.id DESC LIMIT ?");
        args.add(limit);
        return normalizedRows(jdbc.queryForList(sql.toString(), args.toArray()));
    }

    private boolean ownsVehicle(long vendorId, long vehicleId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM vehicles WHERE id = ? AND vendor_id = ?",
                Integer.class, vehicleId, vendorId);
        return count != null && count > 0;
    }

    private void requireOwnedVehicle(long vendorId, long vehicleId) {
        if (!ownsVehicle(vendorId, vehicleId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found");
        }
    }

    private void requireEditableVehicle(long vendorId, long vehicleId) {
        try {
            String status = jdbc.queryForObject(
                    "SELECT approval_status FROM vehicles WHERE id = ? AND vendor_id = ?",
                    String.class, vehicleId, vendorId);
            if (!Set.of("PENDING", "REJECTED").contains(
                    status == null ? "PENDING" : status.toUpperCase(Locale.ROOT))) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Only pending or rejected vehicles can be edited");
            }
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found");
        }
    }

    private static List<MultipartFile> nonEmpty(List<MultipartFile> files) {
        return files == null ? List.of() : files.stream().filter(file -> file != null && !file.isEmpty()).toList();
    }

    private static String safeOriginalName(MultipartFile file) {
        String original = file.getOriginalFilename();
        String normalized = (original == null ? "upload" : original).replace('\\', '/');
        String name = normalized.substring(normalized.lastIndexOf('/') + 1)
                .replaceAll("[\\p{Cntrl}]", "").trim();
        if (name.isEmpty()) name = "upload";
        return name.length() > 255 ? name.substring(name.length() - 255) : name;
    }

    private static String legacyPublicId(String key) {
        int separator = key.indexOf(':', "cloudinary:".length());
        if (separator < 0 || separator == key.length() - 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Cloudinary publicId is missing");
        return key.substring(separator + 1);
    }

    private void deleteStoredFiles(List<String> keys) {
        for (String key : keys) {
            try {
                if (key.startsWith("cloudinary:image:") || key.startsWith("cloudinary:raw:")) {
                    int marker = key.indexOf(':', 11);
                    String resourceType = key.substring(11, marker);
                    cloudinaryImages.delete(key.substring(marker + 1), resourceType);
                } else if (CloudinaryImageStorage.isCloudinaryKey(key)) {
                    cloudinaryImages.delete(key);
                } else {
                    storage.delete(key);
                }
            } catch (RuntimeException exception) {
                LOGGER.warn("Could not clean up vehicle media file {}", key, exception);
            }
        }
    }

    private static Map<String, Object> normalized(Map<String, Object> row) {
        Map<String, Object> result = new LinkedHashMap<>();
        row.forEach((key, value) -> result.put(key.toLowerCase(Locale.ROOT), value));
        return result;
    }

    private static List<Map<String, Object>> normalizedRows(List<Map<String, Object>> rows) {
        return rows.stream().map(VendorOperationsService::normalized).toList();
    }

    private User requireApprovedVendor(String email) {
        User user = users.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .filter(candidate -> candidate.getRole() == RoleName.VENDOR && candidate.isActive()
                        && "APPROVED".equalsIgnoreCase(candidate.getApprovalStatus()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "An active, approved vendor account is required"));
        return user;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record StagedMedia(String type, String originalName, String storageKey, String contentType,
                               String secureUrl, String resourceType) {
        public String publicId() { return storageKey.substring(storageKey.indexOf(':', 11) + 1); }
    }
    public record VehicleMediaFile(String storageKey, String originalName, String contentType,
                                   String publicId, String secureUrl) { }
}
