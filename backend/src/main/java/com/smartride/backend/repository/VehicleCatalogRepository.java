package com.smartride.backend.repository;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.time.LocalDateTime;

@Repository
public class VehicleCatalogRepository {
    private static final String AVAILABLE_VEHICLE_COLUMNS = """
            id, title, brand, model, category, subcategory, "year" AS modelYear,
            city, location, daily_rate AS dailyRate, daily_rate AS pricePerDay,
            with_driver_rate AS withDriverRate, rating, availability_status AS availabilityStatus,
            operational_status AS operationalStatus,
            seating_capacity AS seatingCapacity, fuel_type AS fuelType, transmission, mileage,
            security_deposit AS securityDeposit, description, features,
            with_driver_available AS withDriverAvailable,
            without_driver_available AS withoutDriverAvailable,
            CASE
              WHEN UPPER(COALESCE(availability_status, 'UNAVAILABLE')) = 'AVAILABLE'
               AND UPPER(COALESCE(operational_status, 'AVAILABLE'))
                   NOT IN ('INACTIVE', 'ASSIGNED', 'ON_RENT', 'UNDER_MAINTENANCE')
               AND NOT EXISTS (
                   SELECT 1 FROM bookings current_booking
                   WHERE current_booking.vehicle_id = vehicles.id
                     AND UPPER(current_booking.status) IN ('PENDING', 'CONFIRMED', 'ACTIVE', 'IN_PROGRESS')
                     AND current_booking.pickup_date <= CURRENT_TIMESTAMP
                     AND current_booking.return_date > CURRENT_TIMESTAMP
               )
               AND NOT EXISTS (
                   SELECT 1 FROM fleet_vehicle_assignments current_assignment
                   WHERE current_assignment.vehicle_id = vehicles.id
                     AND current_assignment.status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')
                     AND current_assignment.start_at <= CURRENT_TIMESTAMP
                     AND (current_assignment.end_at IS NULL OR current_assignment.end_at > CURRENT_TIMESTAMP)
               )
               AND NOT EXISTS (
                   SELECT 1 FROM fleet_maintenance_records current_maintenance
                   WHERE current_maintenance.vehicle_id = vehicles.id
                     AND current_maintenance.status IN ('SCHEDULED', 'IN_PROGRESS')
                     AND current_maintenance.scheduled_at <= CURRENT_TIMESTAMP
                     AND (current_maintenance.completed_at IS NULL
                          OR current_maintenance.completed_at > CURRENT_TIMESTAMP)
               )
              THEN TRUE ELSE FALSE
            END AS isAvailableNow,
            (SELECT '/api/v1/vehicles/' || vehicles.id || '/photos/' || media.id
             FROM vehicle_media media
             WHERE media.vehicle_id = vehicles.id AND media.media_type = 'PHOTO'
             ORDER BY media.id LIMIT 1) AS imageUrl,
            COALESCE(NULLIF(title, ''), CONCAT_WS(' ', brand, model)) AS name
            """;

    private final JdbcTemplate jdbcTemplate;

    public VehicleCatalogRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> findAvailableVehicles() {
        return findAvailableVehicles(null, null);
    }

    public List<Map<String, Object>> findAvailableVehicles(LocalDateTime availableFrom,
                                                            LocalDateTime availableUntil) {
        return normalizedRows(jdbcTemplate.queryForList("""
                SELECT %s
                FROM vehicles
                WHERE UPPER(COALESCE(approval_status, 'PENDING')) = 'APPROVED'
                  AND (CAST(? AS TIMESTAMP) IS NULL OR NOT EXISTS (
                      SELECT 1 FROM bookings b
                      WHERE b.vehicle_id = vehicles.id
                        AND UPPER(b.status) IN ('PENDING', 'CONFIRMED', 'ACTIVE', 'IN_PROGRESS')
                        AND b.return_date > ? AND b.pickup_date < ?
                  ))
                  AND (CAST(? AS TIMESTAMP) IS NULL OR NOT EXISTS (
                      SELECT 1 FROM fleet_vehicle_assignments a
                      WHERE a.vehicle_id = vehicles.id
                        AND a.status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')
                        AND a.start_at < ? AND (a.end_at IS NULL OR a.end_at > ?)
                  ))
                  AND (CAST(? AS TIMESTAMP) IS NULL OR NOT EXISTS (
                      SELECT 1 FROM fleet_maintenance_records m
                      WHERE m.vehicle_id = vehicles.id
                        AND m.status IN ('SCHEDULED', 'IN_PROGRESS')
                        AND m.scheduled_at < ? AND (m.completed_at IS NULL OR m.completed_at > ?)
                  ))
                  AND (CAST(? AS TIMESTAMP) IS NULL OR (
                      UPPER(COALESCE(availability_status, 'UNAVAILABLE')) = 'AVAILABLE'
                      AND UPPER(COALESCE(operational_status, 'AVAILABLE')) <> 'INACTIVE'
                  ))
                ORDER BY rating DESC NULLS LAST, title
                """.formatted(AVAILABLE_VEHICLE_COLUMNS),
                availableFrom, availableFrom, availableUntil,
                availableFrom, availableUntil, availableFrom,
                availableFrom, availableUntil, availableFrom, availableFrom));
    }

    public Map<String, Object> findAvailableVehicle(long vehicleId) {
        try {
            return normalized(jdbcTemplate.queryForMap("""
                    SELECT %s
                    FROM vehicles
                    WHERE id = ?
                      AND UPPER(COALESCE(approval_status, 'PENDING')) = 'APPROVED'
                    """.formatted(AVAILABLE_VEHICLE_COLUMNS), vehicleId));
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found or is no longer available");
        }
    }

    public VehiclePhoto findAvailableVehiclePhoto(long vehicleId, long photoId) {
        try {
            return jdbcTemplate.queryForObject("""
                    SELECT media.storage_key, media.content_type, media.original_name, media.secure_url
                    FROM vehicle_media media
                    JOIN vehicles v ON v.id = media.vehicle_id
                    WHERE v.id = ? AND media.id = ? AND media.media_type = 'PHOTO'
                      AND UPPER(COALESCE(v.approval_status, 'PENDING')) = 'APPROVED'
                    """, (rs, rowNum) -> new VehiclePhoto(
                    rs.getString("storage_key"), rs.getString("content_type"), rs.getString("original_name"),
                    rs.getString("secure_url")),
                    vehicleId, photoId);
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle photo not found");
        }
    }

    public record VehiclePhoto(String storageKey, String contentType, String originalName, String secureUrl) { }

    private static List<Map<String, Object>> normalizedRows(List<Map<String, Object>> rows) {
        return rows.stream().map(VehicleCatalogRepository::normalized).toList();
    }

    private static Map<String, Object> normalized(Map<String, Object> row) {
        Map<String, Object> result = new LinkedHashMap<>();
        row.forEach((key, value) -> result.put(key.toLowerCase(Locale.ROOT), value));
        return result;
    }
}
