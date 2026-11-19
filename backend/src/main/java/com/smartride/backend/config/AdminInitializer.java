package com.smartride.backend.config;

import com.smartride.backend.service.AdminBootstrapService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(0)
public class AdminInitializer implements CommandLineRunner {
    private final AdminBootstrapService adminBootstrapService;

    public AdminInitializer(AdminBootstrapService adminBootstrapService) {
        this.adminBootstrapService = adminBootstrapService;
    }

    @Override
    public void run(String... args) {
        adminBootstrapService.initialize();
    }
}
