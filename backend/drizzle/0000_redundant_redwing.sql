CREATE TABLE `brands` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`icon` varchar(255),
	`description` text,
	`meta_title` varchar(255),
	`sef_url` varchar(255) NOT NULL,
	`meta_canonical_url` varchar(255),
	`meta_description` text,
	`meta_keywords` varchar(255),
	`order_no` int DEFAULT 0,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `brands_id` PRIMARY KEY(`id`),
	CONSTRAINT `brands_sef_url_tenant_id_unique` UNIQUE(`sef_url`,`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `device_categories` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`icon` varchar(255),
	`description` text,
	`meta_title` varchar(255),
	`sef_url` varchar(255) NOT NULL,
	`order_no` int DEFAULT 0,
	`meta_canonical_url` varchar(255),
	`meta_description` text,
	`meta_keywords` varchar(255),
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `device_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `device_categories_sef_url_tenant_id_unique` UNIQUE(`sef_url`,`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `device_model_question_set_assignments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`model_id` bigint unsigned NOT NULL,
	`question_set_id` bigint unsigned NOT NULL,
	`assignment_order` int NOT NULL DEFAULT 0,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `device_model_question_set_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_model_question_set` UNIQUE(`model_id`,`question_set_id`)
);
--> statement-breakpoint
CREATE TABLE `device_questions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`question_set_id` bigint unsigned NOT NULL,
	`key` varchar(100),
	`title` varchar(255) NOT NULL,
	`input_type` enum('SINGLE_SELECT_RADIO','SINGLE_SELECT_DROPDOWN','MULTI_SELECT_CHECKBOX','TEXT_INPUT','NUMBER_INPUT') NOT NULL,
	`tooltip` text,
	`category` varchar(100),
	`is_required` tinyint NOT NULL DEFAULT 1,
	`order_no` int NOT NULL,
	`metadata` json,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `device_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `featured_devices` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`model_id` bigint unsigned NOT NULL,
	`shop_id` bigint unsigned NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`is_published` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `featured_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `featured_devices_model_shop_tenant_unique` UNIQUE(`model_id`,`shop_id`,`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `languages` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`code` varchar(10) NOT NULL,
	`name` varchar(50) NOT NULL,
	`is_default` tinyint DEFAULT 0,
	`is_active` tinyint DEFAULT 1,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `languages_id` PRIMARY KEY(`id`),
	CONSTRAINT `languages_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `model_series` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`icon_image` varchar(255),
	`image` varchar(255),
	`description` text,
	`meta_title` varchar(255),
	`sef_url` varchar(255) NOT NULL,
	`meta_canonical_url` varchar(255),
	`meta_description` text,
	`meta_keywords` varchar(255),
	`order_no` int DEFAULT 0,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `model_series_id` PRIMARY KEY(`id`),
	CONSTRAINT `model_series_sef_url_tenant_id_unique` UNIQUE(`sef_url`,`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `model_test_price_drops` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`model_id` bigint unsigned NOT NULL,
	`test_name` varchar(255) NOT NULL,
	`price_drop` float NOT NULL DEFAULT 0,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `model_test_price_drops_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_model_test_name` UNIQUE(`model_id`,`test_name`)
);
--> statement-breakpoint
CREATE TABLE `models` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`sef_url` varchar(255) NOT NULL,
	`base_price` float,
	`searchable_words` text,
	`tooltip_of_model` varchar(255),
	`model_image` varchar(255),
	`category_id` bigint unsigned NOT NULL,
	`brand_id` bigint unsigned NOT NULL,
	`model_series_id` bigint unsigned,
	`tenant_id` bigint unsigned NOT NULL,
	`meta_canonical_url` varchar(255),
	`meta_description` text,
	`meta_keywords` varchar(255),
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `models_id` PRIMARY KEY(`id`),
	CONSTRAINT `models_sef_url_tenant_id_unique` UNIQUE(`sef_url`,`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `question_option_translations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`option_id` bigint unsigned NOT NULL,
	`language_id` bigint unsigned NOT NULL,
	`title` varchar(255) NOT NULL,
	CONSTRAINT `question_option_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `question_option_translations_option_id_language_id_unique` UNIQUE(`option_id`,`language_id`)
);
--> statement-breakpoint
CREATE TABLE `question_options` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`question_id` bigint unsigned NOT NULL,
	`key` varchar(100),
	`title` varchar(255) NOT NULL,
	`price_modifier` float DEFAULT 0,
	`icon` varchar(255),
	`is_default` tinyint NOT NULL DEFAULT 0,
	`order_no` int NOT NULL,
	`metadata` json,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `question_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_set_translations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`question_set_id` bigint unsigned NOT NULL,
	`language_id` bigint unsigned NOT NULL,
	`display_name` varchar(255) NOT NULL,
	`description` text,
	CONSTRAINT `question_set_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `question_set_translations_question_set_id_language_id_unique` UNIQUE(`question_set_id`,`language_id`)
);
--> statement-breakpoint
CREATE TABLE `question_sets` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`internal_name` varchar(255) NOT NULL,
	`display_name` varchar(255) NOT NULL,
	`description` text,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `question_sets_id` PRIMARY KEY(`id`),
	CONSTRAINT `question_sets_internal_name_tenant_id_unique` UNIQUE(`internal_name`,`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `question_translations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`question_id` bigint unsigned NOT NULL,
	`language_id` bigint unsigned NOT NULL,
	`title` varchar(255) NOT NULL,
	`tooltip` text,
	`category` varchar(100),
	CONSTRAINT `question_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `question_translations_question_id_language_id_unique` UNIQUE(`question_id`,`language_id`)
);
--> statement-breakpoint
CREATE TABLE `api_key_usage_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`api_key_id` bigint unsigned NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`endpoint` varchar(255) NOT NULL,
	`method` varchar(10) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` text,
	`request_size` int,
	`response_status` int,
	`response_time_ms` int,
	`error_message` text,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `api_key_usage_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`key_hash` varchar(255) NOT NULL,
	`key_prefix` varchar(20) NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`created_by` bigint unsigned NOT NULL,
	`rate_limit` int DEFAULT 1000,
	`expires_at` timestamp,
	`last_used_at` timestamp,
	`last_used_ip` varchar(45),
	`usage_count` bigint unsigned DEFAULT 0,
	`is_active` boolean DEFAULT true,
	`revoked_at` timestamp,
	`revoked_by` bigint unsigned,
	`revoked_reason` text,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_key_hash_unique` UNIQUE(`key_hash`)
);
--> statement-breakpoint
CREATE TABLE `currency_symbols` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`code` varchar(10) NOT NULL,
	`symbol` varchar(10) NOT NULL,
	`label` varchar(100) NOT NULL,
	`is_default` boolean DEFAULT false,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`created_by` bigint unsigned,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_by` bigint unsigned,
	CONSTRAINT `currency_symbols_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_currency_symbols_tenant_code` UNIQUE(`tenant_id`,`code`)
);
--> statement-breakpoint
CREATE TABLE `device_events` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`device_id` bigint unsigned NOT NULL,
	`actor_id` bigint unsigned NOT NULL,
	`device_event_type` enum('DEAD_IMEI','REPAIR_STARTED','REPAIR_COMPLETED','TRANSFER_IN','TRANSFER_OUT','ADJUSTMENT','TEST_COMPLETED','REPAIR_DELETED') NOT NULL,
	`details` json,
	`status` boolean DEFAULT true,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `device_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `device_grades` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`device_id` bigint unsigned NOT NULL,
	`grade_id` bigint unsigned NOT NULL,
	`status` boolean DEFAULT true,
	`actor_id` bigint unsigned NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `device_grades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `device_licenses` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`device_identifier` varchar(255) NOT NULL,
	`license_type_id` bigint unsigned NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`license_activated_at` timestamp NOT NULL,
	`retest_valid_until` timestamp NOT NULL,
	`ledger_entry_id` bigint unsigned,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `device_licenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`sku` varchar(255),
	`lpn` varchar(255),
	`make` varchar(255),
	`model_no` varchar(255),
	`grade` varchar(255),
	`model_name` varchar(255),
	`storage` varchar(255),
	`memory` varchar(255),
	`color` varchar(255),
	`edited_color` varchar(255),
	`device_type` enum('iPhone','Macbook','Airpods','Android'),
	`serial` varchar(255),
	`imei` varchar(255),
	`imei2` varchar(255),
	`guid` varchar(255),
	`description` varchar(255),
	`status` boolean DEFAULT true,
	`tenant_id` bigint unsigned NOT NULL,
	`warehouse_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_devices_tenant_imei` UNIQUE(`tenant_id`,`imei`)
);
--> statement-breakpoint
CREATE TABLE `diag_answers` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`question_text` varchar(500) NOT NULL,
	`answer_text` varchar(255) NOT NULL,
	`device_id` bigint unsigned,
	`test_result_id` bigint unsigned,
	`answered_by` bigint unsigned NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `diag_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diagn_qn_options` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`question_id` bigint unsigned NOT NULL,
	`option_text` varchar(255) NOT NULL,
	`message` text,
	`display_order` int DEFAULT 0,
	`status` boolean DEFAULT true,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `diagn_qn_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diag_qn_set_qns` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`question_set_id` bigint unsigned NOT NULL,
	`question_id` bigint unsigned NOT NULL,
	`display_order` int DEFAULT 0,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `diag_qn_set_qns_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_set_question` UNIQUE(`question_set_id`,`question_id`)
);
--> statement-breakpoint
CREATE TABLE `diag_qn_sets` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` boolean DEFAULT true,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `diag_qn_sets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diag_questions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`question_text` text NOT NULL,
	`description` text,
	`status` boolean DEFAULT true,
	`models` json,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `diag_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diag_translations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`entity_type` enum('question','option') NOT NULL,
	`entity_id` bigint unsigned NOT NULL,
	`language_code` varchar(10) NOT NULL,
	`translated_text` text NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `diag_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_diag_translation` UNIQUE(`entity_type`,`entity_id`,`language_code`)
);
--> statement-breakpoint
CREATE TABLE `grades` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`color` varchar(255) NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `grades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `label_templates` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` boolean DEFAULT true,
	`canvas_state` json NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `label_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `license_ledger` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`license_type_id` bigint unsigned NOT NULL,
	`amount` int NOT NULL,
	`transaction_type` enum('purchase','usage','refund','adjustment') NOT NULL,
	`reference_type` varchar(100),
	`reference_id` bigint unsigned,
	`device_identifier` varchar(255),
	`notes` text,
	`created_by` bigint unsigned,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `license_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `license_requests` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`requested_by` bigint unsigned NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`items` json NOT NULL,
	`notes` text,
	`reviewed_by` bigint unsigned,
	`reviewed_at` timestamp,
	`rejection_reason` text,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `license_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `license_types` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`product_category` varchar(100) NOT NULL,
	`test_type` varchar(100) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`description` text,
	`status` boolean DEFAULT true,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `license_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ota_update` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`version` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`target_os` enum('window','macos') NOT NULL,
	`target_architecture` enum('x86','arm') NOT NULL,
	`release_channel` enum('stable','beta','dev') NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `ota_update_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`purchase_id` bigint unsigned NOT NULL,
	`sku` varchar(255),
	`quantity` int NOT NULL,
	`quantity_used_for_repair` int DEFAULT 0,
	`price` decimal(10,2) NOT NULL,
	`is_part` boolean DEFAULT false,
	`status` boolean DEFAULT true,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`purchase_order_no` varchar(255) NOT NULL,
	`supplier_name` varchar(255) NOT NULL,
	`supplier_order_no` varchar(255) NOT NULL,
	`expected_delivery_date` date NOT NULL,
	`remarks` text,
	`invoice` text,
	`transport_doc` text,
	`receiving_picture` text,
	`tracking_number` varchar(255),
	`customer_name` varchar(255),
	`order_confirmation_doc` text,
	`tracking_url` text,
	`status` boolean DEFAULT true,
	`warehouse_id` bigint unsigned NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `received_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`purchase_id` bigint unsigned NOT NULL,
	`purchase_item_id` bigint unsigned,
	`sku` varchar(255),
	`device_id` bigint unsigned,
	`quantity` int NOT NULL DEFAULT 1,
	`received_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`status` boolean DEFAULT true,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `received_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `repair_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`repair_id` bigint unsigned NOT NULL,
	`sku` varchar(255),
	`quantity` int NOT NULL,
	`reason_id` bigint unsigned,
	`description` text,
	`cost` decimal(10,2) NOT NULL,
	`purchase_items_id` bigint unsigned,
	`status` boolean DEFAULT true,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `repair_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `repair_reason_model_prices` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`repair_reason_id` bigint unsigned NOT NULL,
	`model_name` varchar(255) NOT NULL,
	`fixed_price` decimal(10,2) NOT NULL,
	`status` boolean DEFAULT true,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `repair_reason_model_prices_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_repair_reason_model` UNIQUE(`repair_reason_id`,`model_name`,`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `repair_reasons` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`fixed_price` decimal(10,2),
	`status` boolean DEFAULT true,
	`tenant_id` bigint unsigned NOT NULL,
	CONSTRAINT `repair_reasons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `repairs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`device_id` bigint unsigned NOT NULL,
	`remarks` text,
	`status` boolean DEFAULT true,
	`actor_id` bigint unsigned NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`warehouse_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `repairs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` varchar(255) NOT NULL,
	`status` boolean DEFAULT true,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sendcloud_config` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`shop_id` bigint unsigned NOT NULL,
	`public_key` varchar(255) NOT NULL,
	`secret_key_encrypted` varchar(512) NOT NULL,
	`default_sender_address_id` int,
	`default_shipping_method_id` int,
	`default_shipping_option_code` varchar(255),
	`use_test_mode` boolean DEFAULT false,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sendcloud_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_sendcloud_config_shop_tenant` UNIQUE(`shop_id`,`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `shipment_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`shipment_id` bigint unsigned NOT NULL,
	`device_id` bigint unsigned,
	`sku` varchar(255),
	`imei` varchar(255),
	`serial_number` varchar(255),
	`model_name` varchar(255),
	`quantity` int DEFAULT 1,
	`weight_kg` decimal(10,3) DEFAULT '0.200',
	`unit_value` decimal(10,2),
	`hs_code` varchar(20) DEFAULT '851712',
	`description` varchar(500),
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `shipment_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`shipment_number` varchar(50) NOT NULL,
	`sendcloud_parcel_id` bigint unsigned,
	`sendcloud_tracking_number` varchar(255),
	`sendcloud_tracking_url` text,
	`carrier_name` varchar(100) DEFAULT 'UPS',
	`shipping_method_id` int,
	`from_warehouse_id` bigint unsigned NOT NULL,
	`to_warehouse_id` bigint unsigned,
	`recipient_name` varchar(255),
	`recipient_company` varchar(255),
	`recipient_address` varchar(255),
	`recipient_house_number` varchar(20),
	`recipient_city` varchar(100),
	`recipient_postal_code` varchar(20),
	`recipient_country` varchar(2),
	`recipient_phone` varchar(50),
	`recipient_email` varchar(255),
	`parcel_type` enum('individual','group') DEFAULT 'individual',
	`total_weight_kg` decimal(10,3),
	`total_items` int DEFAULT 1,
	`total_value` decimal(10,2),
	`label_url` text,
	`label_generated_at` timestamp,
	`shipment_status` enum('draft','pending','label_generated','shipped','in_transit','delivered','cancelled','returned') DEFAULT 'draft',
	`shipped_at` timestamp,
	`delivered_at` timestamp,
	`notes` text,
	`created_by` bigint unsigned NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `shipments_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_shipment_number_tenant` UNIQUE(`shipment_number`,`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `sku_mappings` (
	`id` varchar(36) NOT NULL,
	`sku` varchar(255) NOT NULL,
	`conditions` json NOT NULL,
	`canonical_key` varchar(512) NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sku_mappings_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_sku_mappings_canonical_tenant` UNIQUE(`canonical_key`,`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `sku_specs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`sku` varchar(255) NOT NULL,
	`make` varchar(255),
	`model_no` varchar(255),
	`model_name` varchar(255),
	`is_part` boolean DEFAULT false,
	`storage` varchar(255),
	`memory` varchar(255),
	`color` varchar(255),
	`device_type` enum('iPhone','Macbook','Airpods','Android'),
	`status` boolean DEFAULT true,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sku_specs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`sku` varchar(255) NOT NULL,
	`is_part` boolean DEFAULT false,
	`quantity` int NOT NULL,
	`warehouse_id` bigint unsigned NOT NULL,
	`status` boolean DEFAULT true,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `stock_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_unique` UNIQUE(`sku`,`warehouse_id`)
);
--> statement-breakpoint
CREATE TABLE `stock_device_ids` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`stock_id` bigint unsigned NOT NULL,
	`device_id` bigint unsigned NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `stock_device_ids_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`sku` varchar(255),
	`warehouse_id` bigint unsigned NOT NULL,
	`delta` int NOT NULL,
	`stock_movement_reasons` enum('purchase','dead_imei','transfer_out','transfer_in','repair','adjustment','buyback') NOT NULL,
	`ref_type` varchar(255) NOT NULL,
	`ref_id` bigint unsigned NOT NULL,
	`actor_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`status` boolean DEFAULT true,
	`tenant_id` bigint unsigned NOT NULL,
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_currency_preferences` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`currency_code` varchar(10) NOT NULL,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_currency_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_currency_preferences_tenant_id_unique` UNIQUE(`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`logo` text,
	`description` varchar(255) NOT NULL,
	`account_type` enum('prepaid','credit') NOT NULL DEFAULT 'prepaid',
	`status` boolean DEFAULT true,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `test_results` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`device_id` bigint unsigned NOT NULL,
	`warehouse_id` bigint unsigned NOT NULL,
	`tester_id` bigint unsigned NOT NULL,
	`battery_info` json,
	`passed_components` text,
	`failed_components` text,
	`pending_components` text,
	`oem_status` varchar(255),
	`oem_info` json,
	`lpn` varchar(255),
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`label_printed` boolean DEFAULT false,
	`status` boolean DEFAULT true,
	`os_version` varchar(255),
	`device_lock` varchar(255),
	`carrier_lock` json,
	`sim_lock` json,
	`ESN` varchar(255),
	`iCloud` json,
	`eSIM` boolean,
	`eSIM_erasure` boolean,
	`rooted` boolean,
	`erased` boolean,
	`grade` varchar(255),
	`serial_number` varchar(255),
	`imei` varchar(255),
	CONSTRAINT `test_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transfer_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`transfer_id` bigint unsigned NOT NULL,
	`sku` varchar(255) NOT NULL,
	`device_id` bigint unsigned DEFAULT NULL,
	`is_part` boolean DEFAULT false,
	`quantity` int DEFAULT 1,
	`status` boolean DEFAULT true,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `transfer_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`from_warehouse_id` bigint unsigned NOT NULL,
	`to_warehouse_id` bigint unsigned NOT NULL,
	`tracking_number` varchar(255),
	`tracking_url` text,
	`status` boolean DEFAULT false,
	`created_by` bigint unsigned NOT NULL,
	`completed_by` bigint unsigned,
	`completed_at` timestamp,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `transfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`user_name` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`status` boolean DEFAULT true,
	`wifi_profile_id` bigint unsigned,
	`workflow_id` bigint unsigned,
	`label_template_id` bigint unsigned,
	`ota_update_id` bigint unsigned,
	`diagnostic_question_set_id` bigint unsigned,
	`role_id` bigint unsigned,
	`tenant_id` bigint unsigned NOT NULL,
	`warehouse_id` bigint unsigned,
	`managed_shop_id` bigint unsigned,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_user_name_unique` UNIQUE(`user_name`)
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` varchar(255) NOT NULL,
	`status` boolean DEFAULT true,
	`tenant_id` bigint unsigned NOT NULL,
	`shop_id` bigint unsigned,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `warehouses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wifi_profile` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`ssid` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`status` boolean DEFAULT true,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `wifi_profile_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`canvas_state` json NOT NULL,
	`position_x` float DEFAULT 0,
	`position_y` float DEFAULT 0,
	`scale` float DEFAULT 1,
	`viewport_position_x` float DEFAULT 0,
	`viewport_position_y` float DEFAULT 0,
	`viewport_scale` float DEFAULT 1,
	`grid_visible` boolean DEFAULT true,
	`grid_size` int DEFAULT 20,
	`is_published` boolean DEFAULT false,
	`status` boolean DEFAULT true,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `workflows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_template_dynamic_fields` (
	`id` varchar(36) NOT NULL,
	`field_key` varchar(100) NOT NULL,
	`display_name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100) NOT NULL,
	`data_type` varchar(50) NOT NULL,
	`default_value` text,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_template_dynamic_fields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` varchar(36) NOT NULL,
	`shop_id` bigint unsigned NOT NULL,
	`name` varchar(255) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`template_type` enum('ORDER_CONFIRMATION','SHIPMENT_RECEIVED','INSPECTION_COMPLETED','OFFER_ACCEPTED','OFFER_REJECTED','ORDER_COMPLETED','ORDER_CANCELLED','CUSTOM') NOT NULL,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `faq_translations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`faq_id` bigint unsigned NOT NULL,
	`language_id` bigint unsigned NOT NULL,
	`question` varchar(500) NOT NULL,
	`answer` text NOT NULL,
	CONSTRAINT `faq_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `faq_translations_faq_id_language_id_unique` UNIQUE(`faq_id`,`language_id`)
);
--> statement-breakpoint
CREATE TABLE `faqs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`question` varchar(500) NOT NULL,
	`answer` text NOT NULL,
	`order_no` int DEFAULT 0,
	`is_published` tinyint NOT NULL DEFAULT 1,
	`shop_id` bigint unsigned NOT NULL,
	`tenant_id` bigint unsigned NOT NULL,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `faqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `translations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`entity_type` enum('device_category','brand','model_series','model','question','question_option') NOT NULL,
	`entity_id` int NOT NULL,
	`language_id` int NOT NULL,
	`fields` json NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `translations_entity_language_unique` UNIQUE(`entity_type`,`entity_id`,`language_id`)
);
--> statement-breakpoint
CREATE TABLE `order_device_condition_answers` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`question_key` varchar(100) NOT NULL,
	`question_text_snapshot` text NOT NULL,
	`answer_value` json NOT NULL,
	`answer_text_snapshot` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_device_condition_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`status` enum('PENDING','ARRIVED','PAID','REJECTED') NOT NULL,
	`changed_at` timestamp NOT NULL DEFAULT (now()),
	`changed_by_user_id` bigint unsigned,
	`notes` text,
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`order_number` varchar(50) NOT NULL,
	`device_id` int NOT NULL,
	`device_snapshot` json NOT NULL,
	`estimated_price` decimal(10,2) NOT NULL,
	`final_price` decimal(10,2),
	`imei` varchar(255),
	`sku` varchar(255),
	`serial_number` varchar(255),
	`testing_info` json,
	`status` enum('PENDING','ARRIVED','PAID','REJECTED') NOT NULL DEFAULT 'PENDING',
	`seller_notes` text,
	`admin_notes` text,
	`tenant_id` bigint unsigned NOT NULL,
	`shop_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_number_unique` UNIQUE(`order_number`)
);
--> statement-breakpoint
CREATE TABLE `shipping_details` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`seller_name` varchar(255) NOT NULL,
	`seller_street1` varchar(255) NOT NULL,
	`seller_street2` varchar(255),
	`seller_city` varchar(100) NOT NULL,
	`seller_state_province` varchar(100) NOT NULL,
	`seller_postal_code` varchar(20) NOT NULL,
	`seller_country_code` varchar(2) NOT NULL,
	`seller_phone_number` varchar(20),
	`seller_email` varchar(255),
	`shipping_label_url` text,
	`tracking_number` varchar(100),
	`shipping_provider` enum('DHL','FEDEX','UPS','USPS'),
	`label_data` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipping_details_id` PRIMARY KEY(`id`),
	CONSTRAINT `shipping_details_order_id_unique` UNIQUE(`order_id`)
);
--> statement-breakpoint
CREATE TABLE `shop_catalog` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`shop_id` int NOT NULL,
	`entity_type` enum('brand','device_category','model_series','model') NOT NULL,
	`entity_id` int NOT NULL,
	`is_published` boolean NOT NULL DEFAULT false,
	`metadata` json,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shop_catalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `shop_catalog_unique` UNIQUE(`shop_id`,`entity_type`,`entity_id`)
);
--> statement-breakpoint
CREATE TABLE `brand_translations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brand_id` bigint unsigned NOT NULL,
	`language_id` bigint unsigned NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`meta_title` varchar(255),
	`meta_description` text,
	`meta_keywords` varchar(255),
	CONSTRAINT `brand_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `brand_translations_brand_id_language_id_unique` UNIQUE(`brand_id`,`language_id`)
);
--> statement-breakpoint
CREATE TABLE `device_category_translations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category_id` bigint unsigned NOT NULL,
	`language_id` bigint unsigned NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`meta_title` varchar(255),
	`meta_description` text,
	`meta_keywords` varchar(255),
	CONSTRAINT `device_category_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `device_category_translations_category_id_language_id_unique` UNIQUE(`category_id`,`language_id`)
);
--> statement-breakpoint
CREATE TABLE `model_series_translations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`series_id` bigint unsigned NOT NULL,
	`language_id` bigint unsigned NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`meta_title` varchar(255),
	`meta_description` text,
	`meta_keywords` varchar(255),
	CONSTRAINT `model_series_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `model_series_translations_series_id_language_id_unique` UNIQUE(`series_id`,`language_id`)
);
--> statement-breakpoint
CREATE TABLE `model_translations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`model_id` bigint unsigned NOT NULL,
	`language_id` bigint unsigned NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`meta_title` varchar(255),
	`meta_description` text,
	`meta_keywords` varchar(255),
	`specifications` json,
	`tooltip_of_model` varchar(255),
	`searchable_words` text,
	CONSTRAINT `model_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `model_translations_model_id_language_id_unique` UNIQUE(`model_id`,`language_id`)
);
--> statement-breakpoint
CREATE TABLE `shop_brands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shop_id` bigint unsigned NOT NULL,
	`brand_id` bigint unsigned NOT NULL,
	`is_published` tinyint NOT NULL DEFAULT 0,
	`createdAt` datetime,
	`updatedAt` datetime,
	CONSTRAINT `shop_brands_id` PRIMARY KEY(`id`),
	CONSTRAINT `shop_brands_shop_id_brand_id_unique` UNIQUE(`shop_id`,`brand_id`)
);
--> statement-breakpoint
CREATE TABLE `shop_device_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shop_id` bigint unsigned NOT NULL,
	`category_id` bigint unsigned NOT NULL,
	`is_published` tinyint NOT NULL DEFAULT 0,
	`createdAt` datetime,
	`updatedAt` datetime,
	CONSTRAINT `shop_device_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `shop_device_categories_shop_id_category_id_unique` UNIQUE(`shop_id`,`category_id`)
);
--> statement-breakpoint
CREATE TABLE `shop_location_phones` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`location_id` bigint unsigned NOT NULL,
	`phone_number` varchar(20) NOT NULL,
	`phone_type` enum('main','mobile','fax','whatsapp') NOT NULL DEFAULT 'main',
	`is_primary` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shop_location_phones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_locations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`shop_id` bigint unsigned NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text NOT NULL,
	`city` varchar(100) NOT NULL,
	`state` varchar(100),
	`postal_code` varchar(20),
	`country` varchar(100) NOT NULL,
	`latitude` double NOT NULL,
	`longitude` double NOT NULL,
	`description` text,
	`operating_hours` json,
	`is_active` boolean NOT NULL DEFAULT true,
	`display_order` int DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shop_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_model_series` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shop_id` bigint unsigned NOT NULL,
	`series_id` bigint unsigned NOT NULL,
	`is_published` tinyint NOT NULL DEFAULT 0,
	`createdAt` datetime,
	`updatedAt` datetime,
	CONSTRAINT `shop_model_series_id` PRIMARY KEY(`id`),
	CONSTRAINT `shop_model_series_shop_id_series_id_unique` UNIQUE(`shop_id`,`series_id`)
);
--> statement-breakpoint
CREATE TABLE `shop_models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shop_id` bigint unsigned NOT NULL,
	`model_id` bigint unsigned NOT NULL,
	`is_published` tinyint NOT NULL DEFAULT 0,
	`base_price` float,
	`createdAt` datetime,
	`updatedAt` datetime,
	CONSTRAINT `shop_models_id` PRIMARY KEY(`id`),
	CONSTRAINT `shop_models_shop_id_model_id_unique` UNIQUE(`shop_id`,`model_id`)
);
--> statement-breakpoint
CREATE TABLE `shops` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255),
	`tenant_id` bigint unsigned NOT NULL,
	`owner_id` bigint unsigned NOT NULL,
	`logo` text,
	`organization` varchar(255),
	`config` json,
	`phone` varchar(255),
	`active` tinyint DEFAULT 1,
	`created_at` datetime,
	`updated_at` datetime,
	`deleted_at` datetime,
	CONSTRAINT `shops_id` PRIMARY KEY(`id`),
	CONSTRAINT `shops_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `user_shop_access` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`shop_id` bigint unsigned NOT NULL,
	`can_view` boolean NOT NULL DEFAULT true,
	`can_edit` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`created_by` bigint unsigned,
	CONSTRAINT `user_shop_access_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_shop_unique` UNIQUE(`user_id`,`shop_id`)
);
--> statement-breakpoint
ALTER TABLE `brands` ADD CONSTRAINT `brands_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_categories` ADD CONSTRAINT `device_categories_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_model_question_set_assignments` ADD CONSTRAINT `fk_dmqsa_model_id` FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_model_question_set_assignments` ADD CONSTRAINT `fk_dmqsa_question_set_id` FOREIGN KEY (`question_set_id`) REFERENCES `question_sets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_questions` ADD CONSTRAINT `device_questions_question_set_id_question_sets_id_fk` FOREIGN KEY (`question_set_id`) REFERENCES `question_sets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `featured_devices` ADD CONSTRAINT `featured_devices_model_id_models_id_fk` FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `featured_devices` ADD CONSTRAINT `featured_devices_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `featured_devices` ADD CONSTRAINT `featured_devices_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `model_series` ADD CONSTRAINT `model_series_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `model_test_price_drops` ADD CONSTRAINT `model_test_price_drops_model_id_models_id_fk` FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `models` ADD CONSTRAINT `models_category_id_device_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `device_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `models` ADD CONSTRAINT `models_brand_id_brands_id_fk` FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `models` ADD CONSTRAINT `models_model_series_id_model_series_id_fk` FOREIGN KEY (`model_series_id`) REFERENCES `model_series`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `models` ADD CONSTRAINT `models_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_option_translations` ADD CONSTRAINT `question_option_translations_option_id_question_options_id_fk` FOREIGN KEY (`option_id`) REFERENCES `question_options`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_option_translations` ADD CONSTRAINT `question_option_translations_language_id_languages_id_fk` FOREIGN KEY (`language_id`) REFERENCES `languages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_options` ADD CONSTRAINT `question_options_question_id_device_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `device_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_set_translations` ADD CONSTRAINT `question_set_translations_question_set_id_question_sets_id_fk` FOREIGN KEY (`question_set_id`) REFERENCES `question_sets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_set_translations` ADD CONSTRAINT `question_set_translations_language_id_languages_id_fk` FOREIGN KEY (`language_id`) REFERENCES `languages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_sets` ADD CONSTRAINT `question_sets_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_translations` ADD CONSTRAINT `question_translations_question_id_device_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `device_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_translations` ADD CONSTRAINT `question_translations_language_id_languages_id_fk` FOREIGN KEY (`language_id`) REFERENCES `languages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_key_usage_logs` ADD CONSTRAINT `api_key_usage_logs_api_key_id_api_keys_id_fk` FOREIGN KEY (`api_key_id`) REFERENCES `api_keys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_key_usage_logs` ADD CONSTRAINT `api_key_usage_logs_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_revoked_by_users_id_fk` FOREIGN KEY (`revoked_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `currency_symbols` ADD CONSTRAINT `currency_symbols_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `currency_symbols` ADD CONSTRAINT `currency_symbols_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `currency_symbols` ADD CONSTRAINT `currency_symbols_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_events` ADD CONSTRAINT `device_events_device_id_devices_id_fk` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_events` ADD CONSTRAINT `device_events_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_events` ADD CONSTRAINT `device_events_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_grades` ADD CONSTRAINT `device_grades_device_id_devices_id_fk` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_grades` ADD CONSTRAINT `device_grades_grade_id_grades_id_fk` FOREIGN KEY (`grade_id`) REFERENCES `grades`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_grades` ADD CONSTRAINT `device_grades_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_grades` ADD CONSTRAINT `device_grades_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_licenses` ADD CONSTRAINT `device_licenses_license_type_id_license_types_id_fk` FOREIGN KEY (`license_type_id`) REFERENCES `license_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_licenses` ADD CONSTRAINT `device_licenses_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_licenses` ADD CONSTRAINT `device_licenses_ledger_entry_id_license_ledger_id_fk` FOREIGN KEY (`ledger_entry_id`) REFERENCES `license_ledger`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `devices` ADD CONSTRAINT `devices_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `devices` ADD CONSTRAINT `devices_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diag_answers` ADD CONSTRAINT `diag_answers_device_id_devices_id_fk` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diag_answers` ADD CONSTRAINT `diag_answers_test_result_id_test_results_id_fk` FOREIGN KEY (`test_result_id`) REFERENCES `test_results`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diag_answers` ADD CONSTRAINT `diag_answers_answered_by_users_id_fk` FOREIGN KEY (`answered_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diag_answers` ADD CONSTRAINT `diag_answers_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagn_qn_options` ADD CONSTRAINT `diagn_qn_options_question_id_diag_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `diag_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diag_qn_set_qns` ADD CONSTRAINT `diag_qn_set_qns_question_set_id_diag_qn_sets_id_fk` FOREIGN KEY (`question_set_id`) REFERENCES `diag_qn_sets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diag_qn_set_qns` ADD CONSTRAINT `diag_qn_set_qns_question_id_diag_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `diag_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diag_qn_sets` ADD CONSTRAINT `diag_qn_sets_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diag_questions` ADD CONSTRAINT `diag_questions_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diag_translations` ADD CONSTRAINT `diag_translations_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grades` ADD CONSTRAINT `grades_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `label_templates` ADD CONSTRAINT `label_templates_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `license_ledger` ADD CONSTRAINT `license_ledger_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `license_ledger` ADD CONSTRAINT `license_ledger_license_type_id_license_types_id_fk` FOREIGN KEY (`license_type_id`) REFERENCES `license_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `license_ledger` ADD CONSTRAINT `license_ledger_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `license_requests` ADD CONSTRAINT `license_requests_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `license_requests` ADD CONSTRAINT `license_requests_requested_by_users_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `license_requests` ADD CONSTRAINT `license_requests_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_purchase_id_purchases_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `received_items` ADD CONSTRAINT `received_items_purchase_id_purchases_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `received_items` ADD CONSTRAINT `received_items_purchase_item_id_purchase_items_id_fk` FOREIGN KEY (`purchase_item_id`) REFERENCES `purchase_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `received_items` ADD CONSTRAINT `received_items_device_id_devices_id_fk` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `received_items` ADD CONSTRAINT `received_items_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `repair_items` ADD CONSTRAINT `repair_items_repair_id_repairs_id_fk` FOREIGN KEY (`repair_id`) REFERENCES `repairs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `repair_items` ADD CONSTRAINT `repair_items_reason_id_repair_reasons_id_fk` FOREIGN KEY (`reason_id`) REFERENCES `repair_reasons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `repair_items` ADD CONSTRAINT `repair_items_purchase_items_id_purchase_items_id_fk` FOREIGN KEY (`purchase_items_id`) REFERENCES `purchase_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `repair_items` ADD CONSTRAINT `repair_items_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `repair_reason_model_prices` ADD CONSTRAINT `repair_reason_model_prices_repair_reason_id_repair_reasons_id_fk` FOREIGN KEY (`repair_reason_id`) REFERENCES `repair_reasons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `repair_reason_model_prices` ADD CONSTRAINT `repair_reason_model_prices_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `repair_reasons` ADD CONSTRAINT `repair_reasons_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `repairs` ADD CONSTRAINT `repairs_device_id_devices_id_fk` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `repairs` ADD CONSTRAINT `repairs_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `repairs` ADD CONSTRAINT `repairs_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `repairs` ADD CONSTRAINT `repairs_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sendcloud_config` ADD CONSTRAINT `sendcloud_config_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sendcloud_config` ADD CONSTRAINT `sendcloud_config_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipment_items` ADD CONSTRAINT `shipment_items_shipment_id_shipments_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipment_items` ADD CONSTRAINT `shipment_items_device_id_devices_id_fk` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipment_items` ADD CONSTRAINT `shipment_items_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_from_warehouse_id_warehouses_id_fk` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_to_warehouse_id_warehouses_id_fk` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sku_mappings` ADD CONSTRAINT `sku_mappings_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sku_specs` ADD CONSTRAINT `sku_specs_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock` ADD CONSTRAINT `stock_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock` ADD CONSTRAINT `stock_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_device_ids` ADD CONSTRAINT `stock_device_ids_stock_id_stock_id_fk` FOREIGN KEY (`stock_id`) REFERENCES `stock`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_device_ids` ADD CONSTRAINT `stock_device_ids_device_id_devices_id_fk` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_device_ids` ADD CONSTRAINT `stock_device_ids_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenant_currency_preferences` ADD CONSTRAINT `tenant_currency_preferences_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_results` ADD CONSTRAINT `test_results_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_results` ADD CONSTRAINT `test_results_device_id_devices_id_fk` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_results` ADD CONSTRAINT `test_results_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_results` ADD CONSTRAINT `test_results_tester_id_users_id_fk` FOREIGN KEY (`tester_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transfer_items` ADD CONSTRAINT `transfer_items_transfer_id_transfers_id_fk` FOREIGN KEY (`transfer_id`) REFERENCES `transfers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transfer_items` ADD CONSTRAINT `transfer_items_device_id_devices_id_fk` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transfer_items` ADD CONSTRAINT `transfer_items_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_from_warehouse_id_warehouses_id_fk` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_to_warehouse_id_warehouses_id_fk` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_completed_by_users_id_fk` FOREIGN KEY (`completed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_wifi_profile_id_wifi_profile_id_fk` FOREIGN KEY (`wifi_profile_id`) REFERENCES `wifi_profile`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_workflow_id_workflows_id_fk` FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_label_template_id_label_templates_id_fk` FOREIGN KEY (`label_template_id`) REFERENCES `label_templates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_ota_update_id_ota_update_id_fk` FOREIGN KEY (`ota_update_id`) REFERENCES `ota_update`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_diagnostic_question_set_id_diag_qn_sets_id_fk` FOREIGN KEY (`diagnostic_question_set_id`) REFERENCES `diag_qn_sets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_managed_shop_id_shops_id_fk` FOREIGN KEY (`managed_shop_id`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wifi_profile` ADD CONSTRAINT `wifi_profile_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflows` ADD CONSTRAINT `workflows_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_templates` ADD CONSTRAINT `email_templates_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `faq_translations` ADD CONSTRAINT `faq_translations_faq_id_faqs_id_fk` FOREIGN KEY (`faq_id`) REFERENCES `faqs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `faq_translations` ADD CONSTRAINT `faq_translations_language_id_languages_id_fk` FOREIGN KEY (`language_id`) REFERENCES `languages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `faqs` ADD CONSTRAINT `faqs_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `faqs` ADD CONSTRAINT `faqs_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_device_condition_answers` ADD CONSTRAINT `order_device_condition_answers_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_changed_by_user_id_fk` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_tenant_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_tenant_imei_devices_fk` FOREIGN KEY (`tenant_id`,`imei`) REFERENCES `devices`(`tenant_id`,`imei`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipping_details` ADD CONSTRAINT `shipping_details_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `brand_translations` ADD CONSTRAINT `brand_translations_brand_id_brands_id_fk` FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `brand_translations` ADD CONSTRAINT `brand_translations_language_id_languages_id_fk` FOREIGN KEY (`language_id`) REFERENCES `languages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_category_translations` ADD CONSTRAINT `device_category_translations_category_id_device_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `device_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_category_translations` ADD CONSTRAINT `device_category_translations_language_id_languages_id_fk` FOREIGN KEY (`language_id`) REFERENCES `languages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `model_series_translations` ADD CONSTRAINT `model_series_translations_series_id_model_series_id_fk` FOREIGN KEY (`series_id`) REFERENCES `model_series`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `model_series_translations` ADD CONSTRAINT `model_series_translations_language_id_languages_id_fk` FOREIGN KEY (`language_id`) REFERENCES `languages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `model_translations` ADD CONSTRAINT `model_translations_model_id_models_id_fk` FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `model_translations` ADD CONSTRAINT `model_translations_language_id_languages_id_fk` FOREIGN KEY (`language_id`) REFERENCES `languages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_brands` ADD CONSTRAINT `shop_brands_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_brands` ADD CONSTRAINT `shop_brands_brand_id_brands_id_fk` FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_device_categories` ADD CONSTRAINT `shop_device_categories_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_device_categories` ADD CONSTRAINT `shop_device_categories_category_id_device_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `device_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_location_phones` ADD CONSTRAINT `shop_location_phones_location_id_shop_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `shop_locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_locations` ADD CONSTRAINT `shop_locations_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_model_series` ADD CONSTRAINT `shop_model_series_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_model_series` ADD CONSTRAINT `shop_model_series_series_id_model_series_id_fk` FOREIGN KEY (`series_id`) REFERENCES `model_series`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_models` ADD CONSTRAINT `shop_models_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_models` ADD CONSTRAINT `shop_models_model_id_models_id_fk` FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shops` ADD CONSTRAINT `shops_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shops` ADD CONSTRAINT `shops_owner_id_tenants_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_shop_access` ADD CONSTRAINT `user_shop_access_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_shop_access` ADD CONSTRAINT `user_shop_access_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_shop_access` ADD CONSTRAINT `user_shop_access_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `brands_tenant_id_idx` ON `brands` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `device_categories_tenant_id_idx` ON `device_categories` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `device_model_question_set_assignments_model_id_idx` ON `device_model_question_set_assignments` (`model_id`);--> statement-breakpoint
CREATE INDEX `device_model_question_set_assignments_question_set_id_idx` ON `device_model_question_set_assignments` (`question_set_id`);--> statement-breakpoint
CREATE INDEX `questions_question_set_id_idx` ON `device_questions` (`question_set_id`);--> statement-breakpoint
CREATE INDEX `questions_key_idx` ON `device_questions` (`key`);--> statement-breakpoint
CREATE INDEX `featured_devices_tenant_id_idx` ON `featured_devices` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `featured_devices_model_id_idx` ON `featured_devices` (`model_id`);--> statement-breakpoint
CREATE INDEX `featured_devices_shop_id_idx` ON `featured_devices` (`shop_id`);--> statement-breakpoint
CREATE INDEX `model_series_tenant_id_idx` ON `model_series` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `model_test_price_drops_model_id_idx` ON `model_test_price_drops` (`model_id`);--> statement-breakpoint
CREATE INDEX `models_tenant_id_idx` ON `models` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `models_category_id_idx` ON `models` (`category_id`);--> statement-breakpoint
CREATE INDEX `models_brand_id_idx` ON `models` (`brand_id`);--> statement-breakpoint
CREATE INDEX `models_model_series_id_idx` ON `models` (`model_series_id`);--> statement-breakpoint
CREATE INDEX `question_option_translations_option_id_idx` ON `question_option_translations` (`option_id`);--> statement-breakpoint
CREATE INDEX `question_option_translations_language_id_idx` ON `question_option_translations` (`language_id`);--> statement-breakpoint
CREATE INDEX `question_options_question_id_idx` ON `question_options` (`question_id`);--> statement-breakpoint
CREATE INDEX `question_options_key_idx` ON `question_options` (`key`);--> statement-breakpoint
CREATE INDEX `question_sets_tenant_id_idx` ON `question_sets` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `question_translations_question_id_idx` ON `question_translations` (`question_id`);--> statement-breakpoint
CREATE INDEX `question_translations_language_id_idx` ON `question_translations` (`language_id`);--> statement-breakpoint
CREATE INDEX `idx_api_usage_key_time` ON `api_key_usage_logs` (`api_key_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_api_usage_tenant_time` ON `api_key_usage_logs` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_api_usage_endpoint` ON `api_key_usage_logs` (`endpoint`);--> statement-breakpoint
CREATE INDEX `idx_api_keys_tenant` ON `api_keys` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_api_keys_key_hash` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `idx_api_keys_prefix` ON `api_keys` (`key_prefix`);--> statement-breakpoint
CREATE INDEX `idx_api_keys_active` ON `api_keys` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_api_keys_expires` ON `api_keys` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_currency_symbols_tenant` ON `currency_symbols` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_device_licenses_device` ON `device_licenses` (`device_identifier`,`license_type_id`);--> statement-breakpoint
CREATE INDEX `idx_device_licenses_tenant` ON `device_licenses` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_device_licenses_validity` ON `device_licenses` (`retest_valid_until`);--> statement-breakpoint
CREATE INDEX `idx_devices_tenant_serial` ON `devices` (`tenant_id`,`serial`);--> statement-breakpoint
CREATE INDEX `idx_devices_tenant_imei` ON `devices` (`tenant_id`,`imei`);--> statement-breakpoint
CREATE INDEX `idx_devices_tenant_created_at` ON `devices` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_devices_tenant_device_type` ON `devices` (`tenant_id`,`device_type`);--> statement-breakpoint
CREATE INDEX `idx_devices_lpn` ON `devices` (`lpn`);--> statement-breakpoint
CREATE INDEX `idx_devices_sku` ON `devices` (`sku`,`warehouse_id`);--> statement-breakpoint
CREATE INDEX `idx_diag_ans_device` ON `diag_answers` (`device_id`);--> statement-breakpoint
CREATE INDEX `idx_diag_ans_test_result` ON `diag_answers` (`test_result_id`);--> statement-breakpoint
CREATE INDEX `idx_diag_ans_tenant` ON `diag_answers` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_diagnostic_question_options_question` ON `diagn_qn_options` (`question_id`);--> statement-breakpoint
CREATE INDEX `idx_question_set_questions` ON `diag_qn_set_qns` (`question_set_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `idx_diagnostic_question_sets_tenant` ON `diag_qn_sets` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_diagnostic_questions_tenant` ON `diag_questions` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_diag_translations_entity` ON `diag_translations` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_diag_translations_lang` ON `diag_translations` (`language_code`);--> statement-breakpoint
CREATE INDEX `idx_license_ledger_tenant` ON `license_ledger` (`tenant_id`,`license_type_id`);--> statement-breakpoint
CREATE INDEX `idx_license_ledger_device` ON `license_ledger` (`device_identifier`);--> statement-breakpoint
CREATE INDEX `idx_license_ledger_created_at` ON `license_ledger` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_license_requests_tenant` ON `license_requests` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_license_requests_status` ON `license_requests` (`status`);--> statement-breakpoint
CREATE INDEX `idx_license_requests_created_at` ON `license_requests` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_license_types_category` ON `license_types` (`product_category`,`test_type`);--> statement-breakpoint
CREATE INDEX `idx_repair_reason_model_prices_tenant` ON `repair_reason_model_prices` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_repair_reason_model_prices_reason` ON `repair_reason_model_prices` (`repair_reason_id`);--> statement-breakpoint
CREATE INDEX `idx_sendcloud_config_tenant` ON `sendcloud_config` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_sendcloud_config_shop` ON `sendcloud_config` (`shop_id`);--> statement-breakpoint
CREATE INDEX `idx_shipment_items_shipment` ON `shipment_items` (`shipment_id`);--> statement-breakpoint
CREATE INDEX `idx_shipment_items_device` ON `shipment_items` (`device_id`);--> statement-breakpoint
CREATE INDEX `idx_shipments_tenant` ON `shipments` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_shipments_status` ON `shipments` (`shipment_status`);--> statement-breakpoint
CREATE INDEX `idx_shipments_sendcloud` ON `shipments` (`sendcloud_parcel_id`);--> statement-breakpoint
CREATE INDEX `idx_sku_mappings_sku` ON `sku_mappings` (`sku`);--> statement-breakpoint
CREATE INDEX `idx_sku_mappings_tenant` ON `sku_mappings` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_tenant_currency_preferences` ON `tenant_currency_preferences` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_test_results_tenant_created_at` ON `test_results` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_test_results_tenant_warehouse_created_at` ON `test_results` (`tenant_id`,`warehouse_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_test_results_tenant_tester_created_at` ON `test_results` (`tenant_id`,`tester_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_test_results_device_id` ON `test_results` (`device_id`);--> statement-breakpoint
CREATE INDEX `idx_test_results_identifiers` ON `test_results` (`serial_number`,`imei`,`lpn`);--> statement-breakpoint
CREATE INDEX `idx_users_tenant` ON `users` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_warehouses_tenant` ON `warehouses` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `email_template_dynamic_fields_key_idx` ON `email_template_dynamic_fields` (`field_key`);--> statement-breakpoint
CREATE INDEX `email_template_dynamic_fields_category_idx` ON `email_template_dynamic_fields` (`category`);--> statement-breakpoint
CREATE INDEX `email_template_dynamic_fields_active_idx` ON `email_template_dynamic_fields` (`is_active`);--> statement-breakpoint
CREATE INDEX `email_templates_shop_id_idx` ON `email_templates` (`shop_id`);--> statement-breakpoint
CREATE INDEX `email_templates_type_idx` ON `email_templates` (`template_type`);--> statement-breakpoint
CREATE INDEX `email_templates_active_idx` ON `email_templates` (`is_active`);--> statement-breakpoint
CREATE INDEX `faqs_shop_id_idx` ON `faqs` (`shop_id`);--> statement-breakpoint
CREATE INDEX `faqs_tenant_id_idx` ON `faqs` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `faqs_order_no_idx` ON `faqs` (`order_no`);--> statement-breakpoint
CREATE INDEX `faqs_is_published_idx` ON `faqs` (`is_published`);--> statement-breakpoint
CREATE INDEX `translations_entity_idx` ON `translations` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `translations_language_idx` ON `translations` (`language_id`);--> statement-breakpoint
CREATE INDEX `order_device_condition_answers_order_id_idx` ON `order_device_condition_answers` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_device_condition_answers_question_key_idx` ON `order_device_condition_answers` (`question_key`);--> statement-breakpoint
CREATE INDEX `order_status_history_order_id_idx` ON `order_status_history` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_status_history_changed_by_user_id_idx` ON `order_status_history` (`changed_by_user_id`);--> statement-breakpoint
CREATE INDEX `orders_device_id_idx` ON `orders` (`device_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_tenant_id_idx` ON `orders` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `shop_catalog_shop_id_idx` ON `shop_catalog` (`shop_id`);--> statement-breakpoint
CREATE INDEX `shop_catalog_entity_idx` ON `shop_catalog` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `shop_location_phones_location_id_idx` ON `shop_location_phones` (`location_id`);--> statement-breakpoint
CREATE INDEX `shop_location_phones_primary_idx` ON `shop_location_phones` (`is_primary`);--> statement-breakpoint
CREATE INDEX `shop_locations_shop_id_idx` ON `shop_locations` (`shop_id`);--> statement-breakpoint
CREATE INDEX `shop_locations_active_idx` ON `shop_locations` (`is_active`);--> statement-breakpoint
CREATE INDEX `shop_locations_coordinates_idx` ON `shop_locations` (`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `shops_tenant_id_idx` ON `shops` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `shops_owner_id_idx` ON `shops` (`owner_id`);--> statement-breakpoint
CREATE INDEX `user_shop_access_user_id_idx` ON `user_shop_access` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_shop_access_shop_id_idx` ON `user_shop_access` (`shop_id`);