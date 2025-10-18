-- Add fixed_price column to repair_reasons table
-- This enables repair reasons to have optional fixed pricing for service-only repairs (e.g., cleaning)
-- that don't consume physical parts from inventory

ALTER TABLE `repair_reasons` 
ADD COLUMN `fixed_price` DECIMAL(10, 2) NULL AFTER `description`;

