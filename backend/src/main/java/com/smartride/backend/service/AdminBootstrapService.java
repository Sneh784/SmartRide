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

@Service
public class AdminBootstrapService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;
    private final String name;
    private final boolean enabled;

    public AdminBootstrapService(UserRepository userRepository, RoleRepository roleRepository,
                                 PasswordEncoder passwordEncoder,
                                 @Value("${smartride.admin.email:admin@smartride.com}") String email,
                                 @Value("${smartride.admin.password:}") String password,
                                 @Value("${smartride.admin.name:SmartRide Administrator}") String name,
                                 @Value("${smartride.admin.initialization-enabled:true}") boolean enabled) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.email = email.trim().toLowerCase(Locale.ROOT);
        this.password = password;
        this.name = name.trim();
        this.enabled = enabled;
    }

    @Transactional
    public void initialize() {
        if (!enabled) return;
        if (password == null || password.isBlank()) {
            throw new IllegalStateException("ADMIN_PASSWORD is required when admin initialization is enabled");
        }
        if (password.length() < 12) {
            throw new IllegalStateException("ADMIN_PASSWORD must contain at least 12 characters");
        }
        var existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            User user = existing.get();
            if (user.getRole() != RoleName.ADMIN
                    && user.getRoles().stream().noneMatch(role -> role.getName() == RoleName.ADMIN)) {
                throw new IllegalStateException("Configured admin email is already assigned to a non-admin account");
            }
            return;
        }

        Role adminRole = roleRepository.findByName(RoleName.ADMIN).orElseGet(() -> {
            Role role = new Role();
            role.setName(RoleName.ADMIN);
            return roleRepository.save(role);
        });
        String[] nameParts = name.split("\\s+", 2);
        User admin = new User();
        admin.setEmail(email);
        admin.setFirstName(nameParts[0]);
        admin.setLastName(nameParts.length > 1 ? nameParts[1] : "Administrator");
        admin.setFullName(name);
        admin.setPassword(passwordEncoder.encode(password));
        admin.setRole(RoleName.ADMIN);
        admin.setActive(true);
        admin.setApprovalStatus("ACTIVE");
        admin.setRoles(new HashSet<>(java.util.Set.of(adminRole)));
        userRepository.save(admin);
    }
}
