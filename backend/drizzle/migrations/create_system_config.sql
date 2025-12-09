CREATE TABLE IF NOT EXISTS `system_config` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) NOT NULL,
  `value` json NOT NULL,
  `description` text,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint unsigned,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`),
  CONSTRAINT `system_config_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
);
