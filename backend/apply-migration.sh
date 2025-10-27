#!/bin/bash

# Script to apply the REPAIR_DELETED migration safely
# Usage: ./apply-migration.sh

set -e

echo "🔄 Applying REPAIR_DELETED event type migration..."

# Load environment variables
source .env

# Parse DATABASE_URL
# Format: mysql://user:password@host:port/database?ssl-mode=REQUIRED
if [[ -z "$DATABASE_URL" ]]; then
    echo "❌ ERROR: DATABASE_URL not found in .env file"
    exit 1
fi

# Extract components from DATABASE_URL using regex
# mysql://user:password@host:port/database?params
if [[ $DATABASE_URL =~ mysql://([^:]+):([^@]+)@([^:]+):([^/]+)/([^\?]+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo "❌ ERROR: Could not parse DATABASE_URL"
    echo "Expected format: mysql://user:password@host:port/database"
    exit 1
fi

echo "📡 Connecting to: $DB_HOST:$DB_PORT/$DB_NAME"
echo "👤 User: $DB_USER"
echo ""

# Apply the migration with SSL
echo "Applying migration..."
mysql -h "$DB_HOST" \
      -P "$DB_PORT" \
      -u "$DB_USER" \
      -p"$DB_PASSWORD" \
      --ssl-mode=REQUIRED \
      "$DB_NAME" \
      < drizzle/migrations/add_repair_deleted_event_type.sql

echo "✅ Migration applied successfully!"
echo ""
echo "Verifying the change..."

mysql -h "$DB_HOST" \
      -P "$DB_PORT" \
      -u "$DB_USER" \
      -p"$DB_PASSWORD" \
      --ssl-mode=REQUIRED \
      "$DB_NAME" \
      -e "SHOW COLUMNS FROM device_events WHERE Field = 'event_type';"

echo ""
echo "✨ All done! REPAIR_DELETED event type is now available."
