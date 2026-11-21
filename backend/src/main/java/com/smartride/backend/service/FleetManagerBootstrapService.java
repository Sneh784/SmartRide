package com.smartride.backend.service;

import com.smartride.backend.entity.Role;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.RoleRepository;
import com.smartride.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class FleetManagerBootstrapService {
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;
    private final String name;
    private final String phone;
    private final boolean enabled;

    public FleetManagerBootstrapService(
            UserRepository users,
            RoleRepository roles,
            PasswordEncoder passwordEncoder,
            @Value("${smartride.fleet-manager.email:fleetmanager@smartride.com}") String email,
            @Value("${smartride.fleet-manager.password:}") String password,
            @Value("${smartride.fleet-manager.name:SmartRide Fleet Manager}") String name,
            @Value("${smartride.fleet-manager.phone:}") String phone,
            @Value("${smartride.fleet-manager.initialization-enabled:true}") boolean enabled) {
        this.users = users;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
        this.email = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        this.password = password;
        this.name = name == null ? "" : name.trim().replaceAll("\\s+", " ");
        this.phone = phone == null || phone.isBlank() ? null : phone.trim();
        this.enabled = enabled;
    }

    @Transactional
    public void initialize() {
        if (!enabled) return;
        if (!EMAIL.matcher(email).matches()) {
            throw new IllegalStateException("FLEET_MANAGER_EMAIL must be a valid email address");
        }
        if (password == null || password.isBlank()) {
            throw new IllegalStateException(
                    "FLEET_MANAGER_PASSWORD is required when Fleet Manager initialization is enabled");
        }
        if (password.length() < 12) {
            throw new IllegalStateException("FLEET_MANAGER_PASSWORD must contain at least 12 characters");
        }
        if (name.isBlank()) {
            throw new IllegalStateException("FLEET_MANAGER_NAME must not be blank");
        }

        var existing = users.findByEmail(email);
        if (existing.isPresent()) {
            User existingManager = existing.get();
            if (existingManager.getRole() != RoleName.FLEET_MANAGER) {
                throw new IllegalStateException(
                        "Configured Fleet Manager email is already assigned to a different role");
            }
            if (!passwordEncoder.matches(password, existingManager.getPassword())) {
                existingManager.setPassword(passwordEncoder.encode(password));
                users.saveAndFlush(existingManager);
            }
            return;
        }

        Role fleetRole = roles.findByName(RoleName.FLEET_MANAGER)
                .orElseThrow(() -> new IllegalStateException("FLEET_MANAGER role is not configured"));
        String[] parts = name.split("\\s+", 2);
        User fleetManager = new User();
        fleetManager.setEmail(email);
        fleetManager.setFirstName(parts[0]);
        fleetManager.setLastName(parts.length > 1 ? parts[1] : "");
        fleetManager.setFullName(name);
        fleetManager.setPhone(phone);
        fleetManager.setPassword(passwordEncoder.encode(password));
        fleetManager.setRole(RoleName.FLEET_MANAGER);
        fleetManager.setActive(true);
        fleetManager.setApprovalStatus("ACTIVE");
        fleetManager.setRoles(new HashSet<>(Set.of(fleetRole)));
        users.saveAndFlush(fleetManager);
    }
}
