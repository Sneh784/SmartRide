package com.smartride.backend.repository;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Repository
public class VehicleCatalogRepository {
    private static final String AVAILABLE_VEHICLE_COLUMNS = """
            id, title, brand, model, category, subcategory, "year" AS modelYear,
            city, location, daily_rate AS dailyRate, daily_rate AS pricePerDay,
            with_driver_rate AS withDriverRate, rating, availability_status AS availabilityStatus,
            seating_capacity AS seatingCapacity, fuel_type AS fuelType, transmission, mileage,
            security_deposit AS securityDeposit, description, features,
            COALESCE(NULLIF(title, ''), CONCAT_WS(' ', brand, model)) AS name
            """;

    private final JdbcTemplate jdbcTemplate;

    public VehicleCatalogRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> findAvailableVehicles() {
        return normalizedRows(jdbcTemplate.queryForList("""
                SELECT %s
                FROM vehicles
                WHERE UPPER(COALESCE(approval_status, 'PENDING')) = 'APPROVED'
                  AND UPPER(COALESCE(availability_status, 'UNAVAILABLE')) = 'AVAILABLE'
                ORDER BY rating DESC NULLS LAST, title
                """.formatted(AVAILABLE_VEHICLE_COLUMNS)));
    }

    public Map<String, Object> findAvailableVehicle(long vehicleId) {
        try {
            return normalized(jdbcTemplate.queryForMap("""
                    SELECT %s
                    FROM vehicles
                    WHERE id = ?
                      AND UPPER(COALESCE(approval_status, 'PENDING')) = 'APPROVED'
                      AND UPPER(COALESCE(availability_status, 'UNAVAILABLE')) = 'AVAILABLE'
                    """.formatted(AVAILABLE_VEHICLE_COLUMNS), vehicleId));
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found or is no longer available");
        }
    }

    private static List<Map<String, Object>> normalizedRows(List<Map<String, Object>> rows) {
        return rows.stream().map(VehicleCatalogRepository::normalized).toList();
    }

    private static Map<String, Object> normalized(Map<String, Object> row) {
        Map<String, Object> result = new LinkedHashMap<>();
        row.forEach((key, value) -> result.put(key.toLowerCase(Locale.ROOT), value));
        return result;
    }
}
