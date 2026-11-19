# SmartRide API Documentation

## Base URL

- Frontend: http://localhost:5173
- Backend: http://localhost:8080

## Authentication

### Register

POST /api/v1/auth/register

### Login

POST /api/v1/auth/login

### Refresh Token

POST /api/v1/auth/refresh

## User endpoints

- GET /api/v1/users/me
- GET /api/v1/users/{id}
- PUT /api/v1/users/{id}

## Vehicle endpoints

- GET /api/v1/vehicles
- GET /api/v1/vehicles/{id}
- POST /api/v1/vehicles
- PUT /api/v1/vehicles/{id}
- DELETE /api/v1/vehicles/{id}

## Booking endpoints

- GET /api/v1/bookings
- GET /api/v1/bookings/{id}
- POST /api/v1/bookings
- PATCH /api/v1/bookings/{id}/status

## Payment endpoints

- POST /api/v1/payments/create-order
- POST /api/v1/payments/verify

## Admin endpoints

- GET /api/v1/admin/dashboard
- GET /api/v1/admin/vendors/requests
- PATCH /api/v1/admin/vendors/{id}/approve

This document will be expanded as the application grows.
