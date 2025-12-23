-- Add warehouse_id column to orders table
-- This tracks which warehouse an admin-created order originates from
-- NULL for user orders (online orders ship directly to HQ)

ALTER TABLE `orders` 
ADD COLUMN `warehouse_id` BIGINT UNSIGNED NULL AFTER `shop_id`;

ALTER TABLE `orders` 
ADD CONSTRAINT `orders_warehouse_id_fk` 
FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL;

CREATE INDEX `orders_warehouse_id_idx` ON `orders`(`warehouse_id`);
