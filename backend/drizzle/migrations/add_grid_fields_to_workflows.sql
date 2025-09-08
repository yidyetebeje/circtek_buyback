-- Migration: Add grid fields to workflows table
-- Date: 2024-01-XX

ALTER TABLE workflows 
ADD COLUMN position_x FLOAT DEFAULT 0,
ADD COLUMN position_y FLOAT DEFAULT 0,
ADD COLUMN scale FLOAT DEFAULT 1,
ADD COLUMN viewport_position_x FLOAT DEFAULT 0,
ADD COLUMN viewport_position_y FLOAT DEFAULT 0,
ADD COLUMN viewport_scale FLOAT DEFAULT 1,
ADD COLUMN grid_visible BOOLEAN DEFAULT TRUE,
ADD COLUMN grid_size INT DEFAULT 20,
ADD COLUMN is_published BOOLEAN DEFAULT FALSE;

-- Update existing records to have default values
UPDATE workflows 
SET position_x = 0, 
    position_y = 0, 
    scale = 1, 
    viewport_position_x = 0, 
    viewport_position_y = 0, 
    viewport_scale = 1, 
    grid_visible = TRUE, 
    grid_size = 20, 
    is_published = FALSE 
WHERE position_x IS NULL;




