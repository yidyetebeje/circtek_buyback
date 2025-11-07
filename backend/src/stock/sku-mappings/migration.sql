-- Migration: Create SKU Mappings table for dynamic mapping rules
-- Description: Creates the necessary table and indexes for SKU mapping functionality

-- Create the SKU mappings table
CREATE TABLE IF NOT EXISTS sku_mappings (
    id VARCHAR(36) PRIMARY KEY,
    sku VARCHAR(255) NOT NULL,
    conditions JSON NOT NULL,
    canonical_key VARCHAR(512) NOT NULL,
    tenant_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint for tenant
    CONSTRAINT fk_sku_mappings_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
        ON DELETE CASCADE
);

-- Create unique index to prevent duplicate mappings per tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_sku_mappings_canonical_tenant 
    ON sku_mappings (canonical_key, tenant_id);

-- Create index for SKU lookups
CREATE INDEX IF NOT EXISTS idx_sku_mappings_sku 
    ON sku_mappings (sku);

-- Create index for tenant scoping
CREATE INDEX IF NOT EXISTS idx_sku_mappings_tenant 
    ON sku_mappings (tenant_id);

-- Create index for created_at for ordering
CREATE INDEX IF NOT EXISTS idx_sku_mappings_created_at 
    ON sku_mappings (created_at DESC);

-- Sample data for testing (optional - remove in production)
-- These demonstrate the expected data format
INSERT IGNORE INTO sku_mappings (id, sku, conditions, canonical_key, tenant_id) VALUES
(
    UUID(),
    'APPLE-128-A', 
    '{"make": "Apple", "storage": "128GB", "grade": "AGRA"}',
    'grade=agra|make=apple|storage=128gb',
    1
),
(
    UUID(),
    'SAMSUNG-256-B', 
    '{"make": "Samsung", "storage": "256GB", "grade": "BGRA", "color": "Black"}',
    'color=black|grade=bgra|make=samsung|storage=256gb',
    1
);

-- Notes:
-- 1. The canonical_key is computed by the application layer by:
--    - Converting keys to lowercase and trimming whitespace
--    - Sorting conditions by key alphabetically  
--    - Joining as "key=value" pairs with "|" delimiter
-- 2. The conditions JSON column allows flexible property storage
-- 3. The unique constraint prevents duplicate rules within a tenant
-- 4. Tenant scoping ensures multi-tenancy support