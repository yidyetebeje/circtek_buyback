-- Add shipment-related fields to shop_locations table
-- These fields are required for Sendcloud and other shipping provider integrations

ALTER TABLE shop_locations
ADD COLUMN house_number VARCHAR(50) NULL AFTER address,
ADD COLUMN email VARCHAR(255) NULL AFTER country,
ADD COLUMN company_name VARCHAR(255) NULL AFTER email;
