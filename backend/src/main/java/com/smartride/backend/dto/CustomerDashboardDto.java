package com.smartride.backend.dto;

import java.util.List;

public record CustomerDashboardDto(
        String customerName,
        long totalBookings,
        long upcomingBookings,
        long activeRentals,
        long completedBookings,
        List<CustomerBookingDto> recentBookings,
        List<CustomerBookingDto> upcomingRentals
) {}
