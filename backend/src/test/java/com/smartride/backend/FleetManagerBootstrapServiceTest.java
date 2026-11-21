package com.smartride.backend;

import com.smartride.backend.entity.Role;
import com.smartride.backend.entity.User;
import com.smartride.backend.enums.RoleName;
import com.smartride.backend.repository.RoleRepository;
import com.smartride.backend.repository.UserRepository;
import com.smartride.backend.service.FleetManagerBootstrapService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FleetManagerBootstrapServiceTest {
    @Mock private UserRepository users;
    @Mock private RoleRepository roles;
    @Mock private PasswordEncoder passwordEncoder;

    @Test
    void createsActiveFleetManagerWithEncodedPassword() {
        Role role = new Role();
        role.setName(RoleName.FLEET_MANAGER);
        when(users.findByEmail("manager@example.com")).thenReturn(Optional.empty());
        when(roles.findByName(RoleName.FLEET_MANAGER)).thenReturn(Optional.of(role));
        when(passwordEncoder.encode("StrongFleetPass123!")).thenReturn("bcrypt-hash");

        service("manager@example.com", "StrongFleetPass123!", true).initialize();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(users).saveAndFlush(captor.capture());
        User saved = captor.getValue();
        assertEquals(RoleName.FLEET_MANAGER, saved.getRole());
        assertEquals("ACTIVE", saved.getApprovalStatus());
        assertEquals("Fleet Manager", saved.getFullName());
        assertEquals("Fleet", saved.getFirstName());
        assertEquals("Manager", saved.getLastName());
        assertEquals("bcrypt-hash", saved.getPassword());
        assertEquals(role, saved.getRoles().iterator().next());
    }

    @Test
    void synchronizesConfiguredPasswordForAnExistingFleetManager() {
        User existing = new User();
        existing.setRole(RoleName.FLEET_MANAGER);
        existing.setPassword("old-hash");
        when(users.findByEmail("manager@example.com")).thenReturn(Optional.of(existing));
        when(passwordEncoder.matches("NewFleetPass123!", "old-hash")).thenReturn(false);
        when(passwordEncoder.encode("NewFleetPass123!")).thenReturn("new-hash");

        service("manager@example.com", "NewFleetPass123!", true).initialize();

        verify(users).saveAndFlush(existing);
        assertEquals("new-hash", existing.getPassword());
    }

    @Test
    void requiresPasswordWhenInitializationIsEnabled() {
        FleetManagerBootstrapService service = service("manager@example.com", "", true);

        assertThrows(IllegalStateException.class, service::initialize);
        verify(users, never()).findByEmail("manager@example.com");
    }

    private FleetManagerBootstrapService service(String email, String password, boolean enabled) {
        return new FleetManagerBootstrapService(users, roles, passwordEncoder, email, password,
                "Fleet Manager", "", enabled);
    }
}
