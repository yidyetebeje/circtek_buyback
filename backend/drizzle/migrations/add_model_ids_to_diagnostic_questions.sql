-- Add models column to diagnostic questions table
-- This allows questions to be associated with specific device models
-- When models is NULL or empty array, the question applies to all models

ALTER TABLE `diag_questions` 
ADD COLUMN `models` JSON DEFAULT NULL 
COMMENT 'Array of model names; null/empty = all models';

