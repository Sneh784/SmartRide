package com.smartride.backend.dto;

public record CustomerProfileDto(Long id, String firstName, String lastName, String fullName,
                                 String email, String phone, String role) {}
