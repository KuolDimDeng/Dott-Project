#!/bin/bash

# Fix Staging Database Migration Issues
# This script resolves migration conflicts in staging

echo "========================================="
echo "Fixing Staging Database Migrations"
echo "========================================="
echo ""

# Database URL
STAGING_DB_URL="postgresql://dott_db_staging_user:K1k1wll1XM4uv9eZeAB3QAYaZ7BP4ehe@dpg-d20897vfte5s738ismk0-a.oregon-postgres.render.com/dott_db_staging"

echo "Step 1: Backing up current migration state..."
psql "$STAGING_DB_URL" -c "SELECT * FROM django_migrations;" > migrations_backup.txt 2>/dev/null

echo "Step 2: Clearing all migration history and tables..."
psql "$STAGING_DB_URL" << 'EOF'
-- Start transaction
BEGIN;

-- Drop all tables in public schema
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Create required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Commit changes
COMMIT;

-- Verify
SELECT 'Database cleared successfully' as status;
EOF

echo ""
echo "✅ Database cleared. Now run migrations in Django shell."
echo ""
echo "========================================="
echo "Next Steps:"
echo "========================================="
echo ""
echo "1. Go back to the Render shell"
echo "2. Run these commands:"
echo ""
echo "   # Create all tables fresh"
echo "   python manage.py migrate --run-syncdb"
echo ""
echo "   # If that doesn't work, try:"
echo "   python manage.py migrate --fake-initial"
echo ""
echo "   # Verify tables were created"
echo "   python manage.py dbshell -c '\dt' | head -20"
echo ""
echo "3. Create a test user (optional):"
echo "   python manage.py createsuperuser"
echo ""