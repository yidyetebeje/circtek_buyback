CREATE TABLE `backmarket_listings` (
	`listing_id` varchar(50) NOT NULL,
	`product_id` varchar(50),
	`sku` varchar(255),
	`title` varchar(255),
	`price` decimal(10,2),
	`currency` varchar(3),
	`quantity` int,
	`state` int,
	`grade` int,
	`publication_state` int,
	`synced_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backmarket_listings_pk` PRIMARY KEY(`listing_id`)
);
--> statement-breakpoint
CREATE TABLE `backmarket_orders` (
	`order_id` bigint NOT NULL,
	`creation_date` timestamp NOT NULL,
	`modification_date` timestamp NOT NULL,
	`status` int NOT NULL,
	`currency` varchar(3) NOT NULL,
	`shipping_first_name` varchar(255),
	`shipping_last_name` varchar(255),
	`shipping_address1` varchar(255),
	`shipping_address2` varchar(255),
	`shipping_zipcode` varchar(20),
	`shipping_city` varchar(100),
	`shipping_country` varchar(2),
	`tracking_number` varchar(100),
	`tracking_url` text,
	`lines` json,
	`synced_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backmarket_orders_pk` PRIMARY KEY(`order_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_bm_listings_sku` ON `backmarket_listings` (`sku`);
--> statement-breakpoint
CREATE INDEX `idx_bm_orders_status` ON `backmarket_orders` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_bm_orders_creation_date` ON `backmarket_orders` (`creation_date`);
