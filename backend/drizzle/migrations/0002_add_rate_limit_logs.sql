CREATE TABLE IF NOT EXISTS `rate_limit_logs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `endpoint` varchar(500) NOT NULL,
  `priority` int NOT NULL,
  `status` varchar(50) NOT NULL,
  `response_status` int DEFAULT NULL,
  `duration` int DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rate_limit_logs_timestamp` (`timestamp`),
  KEY `idx_rate_limit_logs_priority` (`priority`),
  KEY `idx_rate_limit_logs_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
