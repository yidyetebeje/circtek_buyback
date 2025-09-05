# Database Migrations

This directory contains database migration scripts for the Circtek application.

## Migration: Add Grid Fields to Workflows

**File:** `add_grid_fields_to_workflows.sql`

**Purpose:** Adds new grid-related fields to the workflows table to support enhanced workflow editor functionality.

**New Fields Added:**
- `position_x` (FLOAT) - X coordinate of workflow position
- `position_y` (FLOAT) - Y coordinate of workflow position  
- `scale` (FLOAT) - Zoom scale of workflow
- `viewport_position_x` (FLOAT) - X coordinate of viewport position
- `viewport_position_y` (FLOAT) - Y coordinate of viewport position
- `viewport_scale` (FLOAT) - Zoom scale of viewport
- `grid_visible` (BOOLEAN) - Whether grid is visible
- `grid_size` (INT) - Size of grid cells
- `is_published` (BOOLEAN) - Whether workflow is published

## Running the Migration

1. **Using MySQL Command Line:**
   ```bash
   mysql -u username -p database_name < drizzle/migrations/add_grid_fields_to_workflows.sql
   ```

2. **Using MySQL Workbench or other GUI:**
   - Open the SQL file
   - Execute the contents against your database

3. **Using Drizzle Kit (if configured):**
   ```bash
   npx drizzle-kit push
   ```

## Rollback

If you need to rollback this migration, you can run:

```sql
ALTER TABLE workflows 
DROP COLUMN position_x,
DROP COLUMN position_y,
DROP COLUMN scale,
DROP COLUMN viewport_position_x,
DROP COLUMN viewport_position_y,
DROP COLUMN viewport_scale,
DROP COLUMN grid_visible,
DROP COLUMN grid_size,
DROP COLUMN is_published;
```

**Note:** This will permanently delete the data in these columns.


