-- Migration: Refactor diagnostic question assignments and answers
-- Date: 2025-10-09
-- Description: 
--   1. Remove diagnostic_question_set_assignments table and add diagnostic_question_set_id to users table
--   2. Change diagnostic_question_answers to store actual text instead of references

-- Step 1: Add diagnostic_question_set_id column to users table
ALTER TABLE `users` ADD COLUMN `diagnostic_question_set_id` BIGINT UNSIGNED;

-- Step 2: Add foreign key constraint
ALTER TABLE `users` ADD CONSTRAINT `users_diagnostic_question_set_id_diagnostic_question_sets_id_fk` 
    FOREIGN KEY (`diagnostic_question_set_id`) REFERENCES `diagnostic_question_sets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 3: Migrate data from diagnostic_question_set_assignments to users table
-- This will only migrate the most recent active assignment per user
UPDATE `users` u
INNER JOIN (
    SELECT 
        dqsa.tester_id,
        dqsa.question_set_id
    FROM `diagnostic_question_set_assignments` dqsa
    INNER JOIN (
        SELECT tester_id, MAX(assigned_at) as max_assigned_at
        FROM `diagnostic_question_set_assignments`
        WHERE status = 'active'
        GROUP BY tester_id
    ) latest ON dqsa.tester_id = latest.tester_id AND dqsa.assigned_at = latest.max_assigned_at
    WHERE dqsa.status = 'active'
) assignments ON u.id = assignments.tester_id
SET u.diagnostic_question_set_id = assignments.question_set_id;

-- Step 4: Rename diag_question_answers to diag_answers (if exists)
RENAME TABLE `diag_question_answers` TO `diag_answers_backup`;

-- Step 5: Create new diag_answers table with text fields
CREATE TABLE `diag_answers` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `question_text` VARCHAR(500) NOT NULL,
    `answer_text` VARCHAR(255) NOT NULL,
    `device_id` BIGINT UNSIGNED,
    `test_result_id` BIGINT UNSIGNED,
    `answered_by` BIGINT UNSIGNED NOT NULL,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_diag_ans_device` (`device_id`),
    INDEX `idx_diag_ans_test_result` (`test_result_id`),
    INDEX `idx_diag_ans_tenant` (`tenant_id`),
    CONSTRAINT `diag_answers_device_id_devices_id_fk` 
        FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `diag_answers_test_result_id_test_results_id_fk` 
        FOREIGN KEY (`test_result_id`) REFERENCES `test_results`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `diag_answers_answered_by_users_id_fk` 
        FOREIGN KEY (`answered_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `diag_answers_tenant_id_tenants_id_fk` 
        FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 6: Migrate existing answers with actual text values (if any exist)
INSERT INTO `diag_answers` (question_text, answer_text, device_id, test_result_id, answered_by, tenant_id, created_at)
SELECT 
    COALESCE(dq.question_text, 'Question deleted') as question_text,
    COALESCE(dqo.option_text, 'Option deleted') as answer_text,
    dqa.device_id,
    dqa.test_result_id,
    dqa.answered_by,
    dqa.tenant_id,
    dqa.created_at
FROM `diag_answers_backup` dqa
LEFT JOIN `diagnostic_questions` dq ON dqa.question_id = dq.id
LEFT JOIN `diagnostic_question_options` dqo ON dqa.selected_option_id = dqo.id;

-- Step 7: Drop backup table
DROP TABLE IF EXISTS `diag_answers_backup`;

-- Step 8: Drop the diagnostic_question_set_assignments table
DROP TABLE IF EXISTS `diagnostic_question_set_assignments`;
