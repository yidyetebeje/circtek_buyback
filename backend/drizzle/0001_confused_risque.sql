CREATE TABLE `backmarket_competitors` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`backmarket_seller_id` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backmarket_competitors_pk` PRIMARY KEY(`id`),
	CONSTRAINT `uq_competitor_name` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `backmarket_listing_prices` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`listing_id` varchar(50) NOT NULL,
	`country_code` varchar(5) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`status` boolean DEFAULT true,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `backmarket_listing_prices_pk` PRIMARY KEY(`id`),
	CONSTRAINT `uq_listing_country` UNIQUE(`listing_id`,`country_code`)
);
--> statement-breakpoint
CREATE TABLE `backmarket_price_history` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`listing_id` varchar(50) NOT NULL,
	`competitor_id` bigint,
	`price` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`is_winner` boolean DEFAULT false,
	CONSTRAINT `backmarket_price_history_pk` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backmarket_pricing_parameters` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`sku` varchar(255) NOT NULL,
	`grade` int NOT NULL,
	`country_code` varchar(5) NOT NULL,
	`c_refurb` decimal(10,2) DEFAULT '0.00',
	`c_op` decimal(10,2) DEFAULT '0.00',
	`c_risk` decimal(10,2) DEFAULT '0.00',
	`m_target` decimal(5,4) DEFAULT '0.1500',
	`f_bm` decimal(5,4) DEFAULT '0.1000',
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `backmarket_pricing_parameters_pk` PRIMARY KEY(`id`),
	CONSTRAINT `uq_pricing_sku_grade_country` UNIQUE(`sku`,`grade`,`country_code`)
);
--> statement-breakpoint
CREATE TABLE `buyback_prices` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`sku` varchar(255) NOT NULL,
	`grade_name` varchar(50) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`market_price` decimal(10,2),
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`tenant_id` bigint unsigned NOT NULL,
	CONSTRAINT `buyback_prices_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_buyback_prices_sku_grade` UNIQUE(`sku`,`grade_name`,`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `system_config` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`key` varchar(255) NOT NULL,
	`value` json NOT NULL,
	`description` text,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`updated_by` bigint unsigned,
	CONSTRAINT `system_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_config_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `backmarket_orders` MODIFY COLUMN `status` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `backmarket_listings` ADD `base_price` decimal(10,2);--> statement-breakpoint
ALTER TABLE `buyback_prices` ADD CONSTRAINT `buyback_prices_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `system_config` ADD CONSTRAINT `system_config_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_listing_prices_listing` ON `backmarket_listing_prices` (`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_history_listing` ON `backmarket_price_history` (`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_history_timestamp` ON `backmarket_price_history` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_pricing_sku` ON `backmarket_pricing_parameters` (`sku`);--> statement-breakpoint
CREATE INDEX `idx_buyback_prices_sku` ON `buyback_prices` (`sku`);