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

## Driver applications

### Submit an application

`POST /api/driver/auth/register` is public and accepts `multipart/form-data`:

- `application`: JSON with personal details, date of birth, address, license number and expiry, driving experience, selected vehicle categories, password, and policy acceptance.
- `drivingLicense`: required PDF, PNG, or JPG, up to 5 MB.
- `identityProof`: required PDF, PNG, or JPG, up to 5 MB.
- `profilePhoto`: optional PNG, JPG, or JPEG, up to 5 MB.

Applications create inactive driver accounts with `PENDING` approval status. They cannot sign in until an administrator approves them.

## Vendor applications

`POST /api/vendor/auth/register` is public and accepts `multipart/form-data`:

- `application`: JSON with personal and business contact details, password, city/state/pincode, and accepted terms/policies.
- `identityProof`, `panCard`, and `addressProof`: required PDF, PNG, or JPG files.
- `profileImage`: optional PNG or JPG image.
- `businessDocument`: optional business registration PDF, PNG, or JPG.

Each file is limited to 5 MB and stored privately. Applications remain pending until an administrator approves them. Configure `SMARTRIDE_VENDOR_UPLOAD_DIR` to choose a private upload location.

### Admin review

- `GET /api/admin/drivers?status=PENDING&search=...` lists applications and review details.
- `GET /api/admin/drivers/{userId}/documents/{documentType}` downloads a private document (`documentType` is `LICENSE`, `IDENTITY`, or `PHOTO` when uploaded). Admin authentication is required.
- `PATCH /api/admin/users/DRIVER/{userId}/status` accepts a JSON body such as `{"status":"APPROVED"}`, `{"status":"REJECTED","reason":"..."}`, or `{"status":"SUSPENDED"}`.

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

## Customer booking journey

Customer endpoints require an authenticated customer account.

- `GET /api/v1/customer/vehicles` lists approved, available vehicles.
- `GET /api/v1/customer/vehicles/{vehicleId}` returns one available vehicle.
- `POST /api/v1/bookings` creates a pending booking. The server validates availability and calculates the amount. Example body:
  `{"vehicleId":12,"bookingType":"WITHOUT_DRIVER","pickupDate":"2026-12-01T10:00:00","returnDate":"2026-12-03T10:00:00","pickupLocation":"Central Station","returnLocation":"Central Station"}`
- `GET /api/v1/customer/bookings`, `/active-rentals`, and `/booking-history` return the customer's own bookings.
- `PATCH /api/v1/bookings/{bookingId}/status` accepts `{"status":"CANCELLED"}` for eligible unpaid bookings.
- Payment is enabled only after vendor confirmation. `POST /api/v1/payments/create-order` accepts `{"bookingId":123}`; `POST /api/v1/payments/verify` accepts `bookingId`, `razorpayOrderId`, `razorpayPaymentId`, and `razorpaySignature`. Configure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to enable provider checkout.
- `POST /api/v1/customer/bookings/{bookingId}/review` accepts `{"rating":5,"comment":"Great trip"}` after the booking is completed or returned.
- `POST /api/v1/customer/support` accepts `{"subject":"Refund review","message":"Please review my refund request for booking #123."}`. Refunds are not automatic; support reviews these requests.

### Customer identity verification

- `GET /api/v1/customer/kyc` returns status and masked document details; private storage keys and full document numbers are not returned.
- `POST /api/v1/customer/kyc` accepts `multipart/form-data`: an `application` JSON part containing `documentType` (`PASSPORT`, `DRIVING_LICENSE`, or `NATIONAL_ID`) and `documentNumber` (4–32 characters), plus an optional `document` PDF/PNG/JPG file up to 5 MB.
- `GET /api/admin/kyc` lists submissions. `GET /api/admin/customers/{customerId}/kyc/document` downloads an attached document. Both require administrator authentication.

## Vendor workspace

Vendor endpoints require an authenticated vendor account. `POST /api/vendor/documents` accepts `multipart/form-data` with a `documentType` part (`IDENTITY_PROOF`, `PAN_CARD`, `ADDRESS_PROOF`, or `BUSINESS_REGISTRATION`) and a `document` PDF, PNG, or JPG file up to 5 MB. `GET /api/vendor/application/status` lists the vendor's uploaded documents, and `GET /api/vendor/documents/{id}` downloads one of the vendor's own private documents.

## Admin endpoints

- GET /api/v1/admin/dashboard
- GET /api/v1/admin/vendors/requests
- PATCH /api/v1/admin/vendors/{id}/approve

This document will be expanded as the application grows.
