package com.smartride.backend.dto;

public record LoginResponse(String token, String tokenType, String userName, String role, String email) {}
