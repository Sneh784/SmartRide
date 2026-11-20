package com.smartride.backend.service;

import com.smartride.backend.dto.LoginRequest;
import com.smartride.backend.dto.LoginResponse;
import com.smartride.backend.dto.RegisterRequest;
import com.smartride.backend.entity.Role;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.RoleRepository;
import com.smartride.backend.repository.UserRepository;
import com.smartride.backend.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Locale;
import java.util.Set;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JdbcTemplate jdbcTemplate;

    public AuthService(UserRepository userRepository, RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder, JwtService jwtService, JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public User register(RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("An account with this email already exists");
        }

        Role customerRole = roleRepository.findByName(RoleName.CUSTOMER)
                .orElseThrow(() -> new IllegalStateException("CUSTOMER role not found in database"));

        User user = new User();
        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        user.setFullName((request.getFirstName().trim() + " " + request.getLastName().trim()).trim());
        user.setEmail(email);
        user.setPhone(request.getPhone());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(RoleName.CUSTOMER);
        user.setRoles(Set.of(customerRole));
        User saved = userRepository.save(user);
        jdbcTemplate.update("""
                INSERT INTO admin_notifications (title, message, event_type, entity_type, entity_id)
                VALUES ('New customer registration', ?, 'NEW_CUSTOMER', 'USER', ?)
                """, saved.getFullName() + " created a customer account", saved.getId());
        return saved;
    }

    public LoginResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
        }
        if (user.getRole() == RoleName.DRIVER
                && "PENDING".equalsIgnoreCase(user.getApprovalStatus())) {
            throw new IllegalArgumentException("Your driver application is pending administrator approval");
        }
        if (user.getRole() == RoleName.VENDOR
                && !"APPROVED".equalsIgnoreCase(user.getApprovalStatus())) {
            throw new IllegalArgumentException("Vendor account is not approved");
        }
        if (user.getRole() == RoleName.DRIVER
                && !"APPROVED".equalsIgnoreCase(user.getApprovalStatus())) {
            throw new IllegalArgumentException("Driver account is not approved");
        }
        if (!user.isActive()) throw new IllegalArgumentException("Invalid email or password");
        return new LoginResponse(jwtService.generateToken(user.getEmail()), "Bearer",
                user.getFullName(), user.getRole().name(), user.getEmail());
    }
}
