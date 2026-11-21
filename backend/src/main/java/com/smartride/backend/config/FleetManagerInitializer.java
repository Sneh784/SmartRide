package com.smartride.backend.config;

import com.smartride.backend.service.FleetManagerBootstrapService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class FleetManagerInitializer implements CommandLineRunner {
    private final FleetManagerBootstrapService bootstrapService;

    public FleetManagerInitializer(FleetManagerBootstrapService bootstrapService) {
        this.bootstrapService = bootstrapService;
    }

    @Override
    public void run(String... args) {
        bootstrapService.initialize();
    }
}
