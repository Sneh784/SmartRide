-- Idempotent migration for existing SmartRide databases. Existing records are preserved.
ALTER TABLE IF EXISTS vendor_documents ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255);
ALTER TABLE IF EXISTS vendor_documents ADD COLUMN IF NOT EXISTS secure_url VARCHAR(1000);
ALTER TABLE IF EXISTS vendor_documents ALTER COLUMN storage_key TYPE VARCHAR(255);

ALTER TABLE IF EXISTS vehicle_media ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255);
ALTER TABLE IF EXISTS vehicle_media ADD COLUMN IF NOT EXISTS secure_url VARCHAR(1000);
ALTER TABLE IF EXISTS vehicle_media ALTER COLUMN storage_key TYPE VARCHAR(255);
