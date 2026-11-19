package com.smartride.backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.core.annotation.Order;

@Component
@Order(-100)
public class LegacyUserActiveColumnMigration implements CommandLineRunner {
    private final JdbcTemplate jdbcTemplate;

    public LegacyUserActiveColumnMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        Boolean hasLegacyActiveColumn = jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
                        + "WHERE table_schema = current_schema() "
                        + "AND table_name = 'users' AND column_name = 'active')",
                Boolean.class);

        if (Boolean.TRUE.equals(hasLegacyActiveColumn)) {
            jdbcTemplate.execute("UPDATE users SET active = TRUE WHERE active IS NULL");
            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN active SET DEFAULT TRUE");
        }

        Boolean hasLegacyPasswordColumn = jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
                        + "WHERE table_schema = current_schema() "
                        + "AND table_name = 'users' AND column_name = 'password')",
                Boolean.class);

        if (Boolean.TRUE.equals(hasLegacyPasswordColumn)) {
            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN password DROP NOT NULL");
        }
    }
}
