package com.smartride.backend.dto;

public record AdminLoginResponse(boolean success, String message, String token, AdminUser user) {
    public record AdminUser(Long id, String name, String email, String role) {}
}
