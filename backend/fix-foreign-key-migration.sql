-- Fix Foreign Key Constraint Issue during Drizzle Migration
-- This script temporarily disables foreign key checks to allow table truncation

-- Backup current users with managed_shop_id before migration
CREATE TABLE IF NOT EXISTS temp_users_backup AS 
SELECT id, name, user_name, managed_shop_id 
FROM users 
WHERE managed_shop_id IS NOT NULL;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Show current foreign key constraint status for reference
SELECT 'Foreign key checks disabled' as status;

-- Note: At this point, you can run your drizzle-kit push command
-- The script will be paused here - run the drizzle command manually

-- After running drizzle-kit push, re-enable foreign key checks
-- SET FOREIGN_KEY_CHECKS = 1;

-- Restore any data if needed from backup
-- (This part will be uncommented after successful migration)
-- INSERT INTO users (id, name, user_name, managed_shop_id)
-- SELECT id, name, user_name, managed_shop_id 
-- FROM temp_users_backup
-- ON DUPLICATE KEY UPDATE managed_shop_id = VALUES(managed_shop_id);

-- Clean up backup table
-- DROP TABLE IF EXISTS temp_users_backup;

SELECT 'Migration preparation complete' as result;