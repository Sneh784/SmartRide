CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

INSERT INTO roles (name, description) VALUES
    ('CUSTOMER', 'Customer account'),
    ('VENDOR', 'Vehicle vendor'),
    ('DRIVER', 'Driver account'),
    ('FLEET_MANAGER', 'Fleet manager account'),
    ('ADMIN', 'Administrator account')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    approval_status VARCHAR(30),
    approval_reason VARCHAR(1000),
    phone VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id),
    role_id INT NOT NULL REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS vehicles (
    id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    year INT,
    fuel_type VARCHAR(50),
    transmission VARCHAR(50),
    seating_capacity INT,
    daily_rate NUMERIC(10,2) NOT NULL,
    with_driver_rate NUMERIC(10,2),
    city VARCHAR(100),
    location VARCHAR(200),
    availability_status VARCHAR(50),
    approval_status VARCHAR(30),
    approval_reason VARCHAR(1000),
    rating DECIMAL(3,2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_wishlist (
    customer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id, vehicle_id)
);

CREATE TABLE IF NOT EXISTS customer_kyc (
    customer_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(40) NOT NULL,
    document_last_four VARCHAR(4) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    rejection_reason VARCHAR(1000),
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_notifications (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_support_tickets (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(160) NOT NULL,
    message VARCHAR(3000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS driver_preferences (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS driver_documents (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(40) NOT NULL,
    storage_key VARCHAR(80) NOT NULL UNIQUE,
    original_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS driver_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT REFERENCES users(id),
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT,
    reason VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_notifications (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id BIGINT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS platform_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value VARCHAR(2000) NOT NULL,
    updated_by BIGINT REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT REFERENCES users(id),
    vehicle_id BIGINT REFERENCES vehicles(id),
    booking_type VARCHAR(50),
    pickup_date TIMESTAMP NOT NULL,
    return_date TIMESTAMP NOT NULL,
    pickup_location VARCHAR(200),
    return_location VARCHAR(200),
    status VARCHAR(50) DEFAULT 'PENDING',
    amount NUMERIC(10,2),
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT REFERENCES bookings(id),
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    provider VARCHAR(50),
    payment_id VARCHAR(200),
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS operational_status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE';

CREATE TABLE IF NOT EXISTS fleet_manager_vehicle_access (
    fleet_manager_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    granted_by BIGINT REFERENCES users(id),
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (fleet_manager_id, vehicle_id)
);

CREATE TABLE IF NOT EXISTS fleet_manager_driver_access (
    fleet_manager_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by BIGINT REFERENCES users(id),
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (fleet_manager_id, driver_id)
);

CREATE TABLE IF NOT EXISTS fleet_vehicle_assignments (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    fleet_manager_id BIGINT NOT NULL REFERENCES users(id),
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(id),
    driver_id BIGINT NOT NULL REFERENCES users(id),
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP,
    location VARCHAR(200) NOT NULL,
    purpose VARCHAR(300) NOT NULL,
    notes VARCHAR(2000),
    status VARCHAR(24) NOT NULL DEFAULT 'ASSIGNED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_at IS NULL OR end_at > start_at)
);

CREATE TABLE IF NOT EXISTS fleet_maintenance_records (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    fleet_manager_id BIGINT NOT NULL REFERENCES users(id),
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(id),
    maintenance_type VARCHAR(80) NOT NULL,
    description VARCHAR(2000) NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    service_provider VARCHAR(255),
    estimated_cost NUMERIC(12,2),
    actual_cost NUMERIC(12,2),
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(24) NOT NULL DEFAULT 'SCHEDULED',
    notes VARCHAR(2000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fleet_maintenance_requests (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    fleet_manager_id BIGINT NOT NULL REFERENCES users(id),
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(id),
    reported_by BIGINT NOT NULL REFERENCES users(id),
    description VARCHAR(2000) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(24) NOT NULL DEFAULT 'OPEN',
    notes VARCHAR(2000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fleet_manager_notifications (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(40) NOT NULL,
    title VARCHAR(160) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fleet_manager_preferences (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    compact_tables BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_vehicles_city ON vehicles(city);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_fm_vehicle_access_vehicle ON fleet_manager_vehicle_access(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fm_driver_access_driver ON fleet_manager_driver_access(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_user ON driver_documents(user_id, uploaded_at);
CREATE INDEX IF NOT EXISTS idx_driver_notifications_user_read ON driver_notifications(user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_fleet_assignments_vehicle_dates ON fleet_vehicle_assignments(vehicle_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_fleet_assignments_driver_dates ON fleet_vehicle_assignments(driver_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_fleet_maintenance_vehicle_status ON fleet_maintenance_records(vehicle_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_fleet_notifications_user_read ON fleet_manager_notifications(user_id, is_read, created_at);
