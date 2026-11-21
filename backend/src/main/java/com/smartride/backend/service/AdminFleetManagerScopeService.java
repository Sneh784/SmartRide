package com.smartride.backend.service;

import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AdminFleetManagerScopeService {
    private final JdbcTemplate jdbc;
    private final UserRepository users;

    public AdminFleetManagerScopeService(JdbcTemplate jdbc, UserRepository users) {
        this.jdbc = jdbc;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> overview() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("fleetManagers", jdbc.queryForList("""
                SELECT id, full_name AS name, email, phone, is_active AS active
                FROM users WHERE role = 'FLEET_MANAGER'
                ORDER BY full_name, id
                """));
        result.put("vehicles", jdbc.queryForList("""
                SELECT id, title, brand, model, registration_number, vendor_id
                FROM vehicles
                WHERE UPPER(COALESCE(approval_status, 'PENDING')) = 'APPROVED'
                ORDER BY title, id
                """));
        result.put("drivers", jdbc.queryForList("""
                SELECT u.id, u.full_name AS name, u.email, u.phone
                FROM users u
                WHERE u.role = 'DRIVER' AND u.is_active = TRUE
                  AND UPPER(COALESCE(u.approval_status, 'PENDING')) = 'APPROVED'
                ORDER BY u.full_name, u.id
                """));
        result.put("vehicleGrants", jdbc.queryForList("""
                SELECT a.fleet_manager_id, a.vehicle_id, v.title AS vehicle_name,
                       u.full_name AS fleet_manager_name, a.granted_at
                FROM fleet_manager_vehicle_access a
                JOIN vehicles v ON v.id = a.vehicle_id
                JOIN users u ON u.id = a.fleet_manager_id
                ORDER BY u.full_name, v.title
                """));
        result.put("driverGrants", jdbc.queryForList("""
                SELECT a.fleet_manager_id, a.driver_id, d.full_name AS driver_name,
                       u.full_name AS fleet_manager_name, a.granted_at
                FROM fleet_manager_driver_access a
                JOIN users d ON d.id = a.driver_id
                JOIN users u ON u.id = a.fleet_manager_id
                ORDER BY u.full_name, d.full_name
                """));
        return result;
    }

    @Transactional
    public void grantVehicle(String actorEmail, long fleetManagerId, long vehicleId) {
        long adminId = requireAdminId(actorEmail);
        requireFleetManager(fleetManagerId);
        Integer eligible = jdbc.queryForObject("""
                SELECT COUNT(*) FROM vehicles
                WHERE id = ? AND UPPER(COALESCE(approval_status, 'PENDING')) = 'APPROVED'
                """, Integer.class, vehicleId);
        if (eligible == null || eligible == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Approved vehicle not found");
        }
        jdbc.update("""
                INSERT INTO fleet_manager_vehicle_access (fleet_manager_id, vehicle_id, granted_by)
                SELECT ?, ?, ? WHERE NOT EXISTS (
                    SELECT 1 FROM fleet_manager_vehicle_access WHERE fleet_manager_id = ? AND vehicle_id = ?
                )
                """, fleetManagerId, vehicleId, adminId, fleetManagerId, vehicleId);
    }

    @Transactional
    public void revokeVehicle(String actorEmail, long fleetManagerId, long vehicleId) {
        requireAdminId(actorEmail);
        jdbc.update("DELETE FROM fleet_manager_vehicle_access WHERE fleet_manager_id = ? AND vehicle_id = ?",
                fleetManagerId, vehicleId);
    }

    @Transactional
    public void grantDriver(String actorEmail, long fleetManagerId, long driverId) {
        long adminId = requireAdminId(actorEmail);
        requireFleetManager(fleetManagerId);
        Integer eligible = jdbc.queryForObject("""
                SELECT COUNT(*) FROM users
                WHERE id = ? AND role = 'DRIVER' AND is_active = TRUE
                  AND UPPER(COALESCE(approval_status, 'PENDING')) = 'APPROVED'
                """, Integer.class, driverId);
        if (eligible == null || eligible == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Active approved driver not found");
        }
        jdbc.update("""
                INSERT INTO fleet_manager_driver_access (fleet_manager_id, driver_id, granted_by)
                SELECT ?, ?, ? WHERE NOT EXISTS (
                    SELECT 1 FROM fleet_manager_driver_access WHERE fleet_manager_id = ? AND driver_id = ?
                )
                """, fleetManagerId, driverId, adminId, fleetManagerId, driverId);
    }

    @Transactional
    public void revokeDriver(String actorEmail, long fleetManagerId, long driverId) {
        requireAdminId(actorEmail);
        jdbc.update("DELETE FROM fleet_manager_driver_access WHERE fleet_manager_id = ? AND driver_id = ?",
                fleetManagerId, driverId);
    }

    private long requireAdminId(String email) {
        return users.findByEmail(email.toLowerCase(Locale.ROOT))
                .filter(user -> user.getRole() == RoleName.ADMIN && user.isActive())
                .map(user -> user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
    }

    private void requireFleetManager(long id) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE id = ? AND role = 'FLEET_MANAGER' AND is_active = TRUE",
                Integer.class, id);
        if (count == null || count == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fleet Manager not found");
        }
    }
}
