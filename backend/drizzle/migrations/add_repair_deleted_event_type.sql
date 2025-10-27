-- Add REPAIR_DELETED to device_event_type enum
-- This ALTER will preserve all existing data

ALTER TABLE `device_events` 
MODIFY COLUMN `device_event_type` ENUM(
  'DEAD_IMEI',
  'REPAIR_STARTED',
  'REPAIR_COMPLETED',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'ADJUSTMENT',
  'TEST_COMPLETED',
  'REPAIR_DELETED'
) NOT NULL;
