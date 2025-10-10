-- Cleanup script for diagnostic question tables
-- Run this before pushing the new schema

-- Drop old tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS `diag_question_answers`;
DROP TABLE IF EXISTS `diagnostic_question_set_assignments`;
DROP TABLE IF EXISTS `diagnostic_question_set_questions`;
DROP TABLE IF EXISTS `diagnostic_question_options`;
DROP TABLE IF EXISTS `diagnostic_question_sets`;
DROP TABLE IF EXISTS `diagnostic_questions`;

-- Also drop the new table names in case they exist
DROP TABLE IF EXISTS `diag_answers`;
DROP TABLE IF EXISTS `diag_qn_set_qns`;
DROP TABLE IF EXISTS `diagn_qn_options`;
DROP TABLE IF EXISTS `diag_qn_sets`;
DROP TABLE IF EXISTS `diag_questions`;
