CREATE TABLE `backmarket_competitors` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`backmarket_seller_id` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backmarket_competitors_pk` PRIMARY KEY(`id`),
	CONSTRAINT `uq_competitor_name` UNIQUE(`name`)
);

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

CREATE INDEX `idx_history_listing` ON `backmarket_price_history` (`listing_id`);
CREATE INDEX `idx_history_timestamp` ON `backmarket_price_history` (`timestamp`);

ALTER TABLE `backmarket_listings` ADD `base_price` decimal(10,2);
