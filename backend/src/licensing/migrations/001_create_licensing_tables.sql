-- Migration: Create Licensing System Tables
-- Description: Adds tables for usage-based licensing with prepaid/credit models and 30-day retest windows

-- Step 1: Add account_type to tenants table
ALTER TABLE tenants 
ADD COLUMN account_type ENUM('prepaid', 'credit') NOT NULL DEFAULT 'prepaid'
AFTER description;

-- Step 2: Create license_types table
CREATE TABLE IF NOT EXISTS license_types (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  product_category VARCHAR(100) NOT NULL COMMENT 'e.g., iPhone, MacBook, AirPods, Android',
  test_type VARCHAR(100) NOT NULL COMMENT 'e.g., Diagnostic, Erasure',
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  status BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_license_types_category (product_category, test_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 3: Create license_ledger table
CREATE TABLE IF NOT EXISTS license_ledger (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  license_type_id BIGINT UNSIGNED NOT NULL,
  amount INT NOT NULL COMMENT 'Positive for purchase/refund, negative for usage',
  transaction_type ENUM('purchase', 'usage', 'refund', 'adjustment') NOT NULL,
  reference_type VARCHAR(100) COMMENT 'e.g., order, test_result, manual',
  reference_id BIGINT UNSIGNED COMMENT 'ID of related record',
  device_identifier VARCHAR(255) COMMENT 'IMEI/Serial for usage tracking',
  notes TEXT,
  created_by BIGINT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (license_type_id) REFERENCES license_types(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_license_ledger_tenant (tenant_id, license_type_id),
  INDEX idx_license_ledger_device (device_identifier),
  INDEX idx_license_ledger_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 4: Create device_licenses table (30-day retest window)
CREATE TABLE IF NOT EXISTS device_licenses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_identifier VARCHAR(255) NOT NULL COMMENT 'IMEI or Serial Number',
  license_type_id BIGINT UNSIGNED NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  license_activated_at TIMESTAMP NOT NULL,
  retest_valid_until TIMESTAMP NOT NULL COMMENT 'license_activated_at + 30 days',
  ledger_entry_id BIGINT UNSIGNED COMMENT 'Reference to the ledger entry that created this',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (license_type_id) REFERENCES license_types(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (ledger_entry_id) REFERENCES license_ledger(id) ON DELETE SET NULL,
  INDEX idx_device_licenses_device (device_identifier, license_type_id),
  INDEX idx_device_licenses_tenant (tenant_id),
  INDEX idx_device_licenses_validity (retest_valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 5: Insert default license types
INSERT INTO license_types (name, product_category, test_type, price, description) VALUES
('iPhone Diagnostic License', 'iPhone', 'Diagnostic', 2.50, 'License for iPhone diagnostic testing'),
('iPhone Erasure License', 'iPhone', 'Erasure', 1.50, 'License for iPhone data erasure'),
('MacBook Diagnostic License', 'Macbook', 'Diagnostic', 3.00, 'License for MacBook diagnostic testing'),
('MacBook Erasure License', 'Macbook', 'Erasure', 2.00, 'License for MacBook data erasure'),
('AirPods Diagnostic License', 'Airpods', 'Diagnostic', 1.00, 'License for AirPods diagnostic testing'),
('Android Diagnostic License', 'Android', 'Diagnostic', 2.00, 'License for Android diagnostic testing'),
('Android Erasure License', 'Android', 'Erasure', 1.50, 'License for Android data erasure');

-- Step 6: Grant initial licenses to existing tenants (optional - adjust as needed)
-- This gives each existing tenant 100 diagnostic licenses for each device type
-- Comment out if you don't want to grant initial licenses
INSERT INTO license_ledger (tenant_id, license_type_id, amount, transaction_type, notes)
SELECT 
  t.id as tenant_id,
  lt.id as license_type_id,
  100 as amount,
  'purchase' as transaction_type,
  'Initial license grant for migration' as notes
FROM tenants t
CROSS JOIN license_types lt
WHERE t.status = TRUE AND lt.status = TRUE;
