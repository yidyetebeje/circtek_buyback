-- Migration: Create SKU Mappings table
-- This script creates the necessary database structure for SKU mapping functionality

-- Create the main SKU mappings table
CREATE TABLE IF NOT EXISTS sku_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL,
    conditions JSONB NOT NULL,
    canonical_key TEXT NOT NULL,
    tenant_id INTEGER NOT NULL, -- Add tenant scoping
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique index to prevent duplicate mappings (scoped by tenant)
CREATE UNIQUE INDEX IF NOT EXISTS ux_sku_mappings_canonical_key_tenant
    ON sku_mappings (canonical_key, tenant_id);

-- Create index for SKU lookups
CREATE INDEX IF NOT EXISTS ix_sku_mappings_sku
    ON sku_mappings (sku);

-- Create index for tenant scoping
CREATE INDEX IF NOT EXISTS ix_sku_mappings_tenant_id
    ON sku_mappings (tenant_id);

-- Create GIN index for JSONB conditions queries (optional, for future advanced queries)
CREATE INDEX IF NOT EXISTS ix_sku_mappings_conditions
    ON sku_mappings USING gin (conditions);

-- Add trigger to automatically update the updated_at field
CREATE OR REPLACE FUNCTION update_sku_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sku_mappings_updated_at
    BEFORE UPDATE ON sku_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_sku_mappings_updated_at();

-- Sample data for testing (optional - remove in production)
-- INSERT INTO sku_mappings (sku, conditions, canonical_key, tenant_id) VALUES
-- ('APPLE-128-A', '{"make": "Apple", "storage": "128GB", "grade": "AGRA"}', 'grade=agra|make=apple|storage=128gb', 1),
-- ('SAMSUNG-256-B', '{"make": "Samsung", "storage": "256GB", "grade": "BGRA"}', 'grade=bgra|make=samsung|storage=256gb', 1);

-- Notes:
-- 1. The canonical_key should be computed by the application layer by:
--    - Converting keys to lowercase
--    - Trimming whitespace from keys and values
--    - Sorting conditions by key alphabetically
--    - Joining as "key=value" pairs with "|" delimiter
-- 2. The conditions JSONB column allows for flexible property storage
-- 3. Tenant scoping ensures multi-tenancy support
-- 4. The unique constraint prevents duplicate rules within a tenant