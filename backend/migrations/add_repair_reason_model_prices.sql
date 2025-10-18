-- Migration: Add model-specific pricing for repair reasons
-- This allows different fixed prices for different device models

CREATE TABLE IF NOT EXISTS `repair_reason_model_prices` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `repair_reason_id` BIGINT UNSIGNED NOT NULL,
  `model_name` VARCHAR(255) NOT NULL,
  `fixed_price` DECIMAL(10, 2) NOT NULL,
  `status` BOOLEAN DEFAULT TRUE,
  `tenant_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  CONSTRAINT `fk_repair_reason_model_prices_reason` 
    FOREIGN KEY (`repair_reason_id`) REFERENCES `repair_reasons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_repair_reason_model_prices_tenant` 
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  
  -- Indexes
  INDEX `idx_repair_reason_model_prices_tenant` (`tenant_id`),
  INDEX `idx_repair_reason_model_prices_reason` (`repair_reason_id`),
  
  -- Unique constraint: one price per model per repair reason per tenant
  UNIQUE KEY `uq_repair_reason_model` (`repair_reason_id`, `model_name`, `tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Example data (optional - remove if not needed)
-- INSERT INTO `repair_reason_model_prices` (`repair_reason_id`, `model_name`, `fixed_price`, `tenant_id`)
-- VALUES 
--   (1, 'iPhone 14 Pro', 150.00, 1),
--   (1, 'iPhone 15 Pro Max', 200.00, 1),
--   (2, 'iPhone 13', 100.00, 1);
