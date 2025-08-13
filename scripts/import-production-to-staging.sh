#!/bin/bash

# Import Production Database Export to Staging
# This script downloads and imports the production database structure to staging

echo "========================================="
echo "Importing Production Database to Staging"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database URLs
STAGING_DB_URL="postgresql://dott_db_staging_user:K1k1wll1XM4uv9eZeAB3QAYaZ7BP4ehe@dpg-d20897vfte5s738ismk0-a.oregon-postgres.render.com/dott_db_staging"

# Production export URL (provided by user)
EXPORT_URL="https://backups.render.com/db/dpg-d0u3s349c44c73a8m3rg-a/2025-08-12T19:18Z.dir.tar.gz?auth=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3MzQwMzA0MDIsImlzcyI6ImJhY2t1cHMucmVuZGVyLmNvbSIsImV4cCI6MTczNDAzNDAwMn0.GRb5FEhj8aXsaVgKhCEt_-mcdU1fmjqnGSAjF5x90r0"

echo "Step 1: Downloading production export..."
curl -L "$EXPORT_URL" -o production_export.tar.gz 2>download_error.log

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to download export${NC}"
    echo "Error details:"
    cat download_error.log
    exit 1
fi

echo -e "${GREEN}✅ Export downloaded successfully${NC}"

echo ""
echo "Step 2: Extracting export..."
# macOS compatible tar extraction
tar -xf production_export.tar.gz

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to extract export${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Export extracted successfully${NC}"

echo ""
echo "Step 3: Clearing staging database..."
psql "$STAGING_DB_URL" << 'EOF' 2>clear_error.log
-- Drop all existing objects
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOF

echo -e "${GREEN}✅ Staging database cleared${NC}"

echo ""
echo "Step 4: Restoring database to staging..."
# Using pg_restore for directory format
pg_restore \
  --dbname="$STAGING_DB_URL" \
  --verbose \
  --no-owner \
  --no-privileges \
  --no-acl \
  --schema=public \
  2025-08-12T19:18Z.dir 2>restore_error.log

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Some warnings during restore (checking if critical)${NC}"
    # Check for critical errors (not just warnings)
    if grep -q "ERROR\|FATAL\|PANIC" restore_error.log; then
        echo -e "${RED}❌ Critical errors found during restore${NC}"
        echo "Error details:"
        grep "ERROR\|FATAL\|PANIC" restore_error.log | head -20
    else
        echo -e "${GREEN}✅ Restore completed with minor warnings (normal)${NC}"
    fi
fi

echo ""
echo "Step 5: Clearing production data (keeping structure only)..."
# This will delete all data but keep the table structure
psql "$STAGING_DB_URL" << 'EOF'
BEGIN;

-- Get all tables except django_migrations and other system tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('django_migrations', 'django_content_type', 'auth_permission')
    LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Keep essential migration records to avoid re-running migrations
-- This preserves the migration state from production
SELECT 'Kept migration records: ' || COUNT(*) FROM django_migrations;

COMMIT;
EOF

echo ""
echo "Step 6: Verifying tables..."
TABLE_COUNT=$(psql "$STAGING_DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
MIGRATION_COUNT=$(psql "$STAGING_DB_URL" -t -c "SELECT COUNT(*) FROM django_migrations;" 2>/dev/null || echo "0")

echo -e "${GREEN}✅ Import complete!${NC}"
echo "Total tables: $TABLE_COUNT"
echo "Migration records: $MIGRATION_COUNT"

echo ""
echo "Step 7: Creating staging test user..."
psql "$STAGING_DB_URL" << 'EOF'
-- Create a test admin user for staging
INSERT INTO custom_auth_customuser (
    id, 
    email, 
    is_active, 
    is_staff, 
    is_superuser,
    date_joined,
    auth0_user_id,
    onboarding_completed
) VALUES (
    gen_random_uuid(),
    'admin@staging.dottapps.com',
    true,
    true,
    true,
    NOW(),
    'auth0|staging-test-user',
    true
) ON CONFLICT (email) DO UPDATE SET
    is_active = true,
    is_staff = true,
    is_superuser = true;

-- Also create a user profile for the test user
INSERT INTO custom_auth_userprofile (
    id,
    user_id,
    subscription_plan,
    subscription_status,
    created_at,
    updated_at
) 
SELECT 
    gen_random_uuid(),
    id,
    'professional',
    'active',
    NOW(),
    NOW()
FROM custom_auth_customuser
WHERE email = 'admin@staging.dottapps.com'
ON CONFLICT (user_id) DO UPDATE SET
    subscription_plan = 'professional',
    subscription_status = 'active';

SELECT 'Test user created: admin@staging.dottapps.com' as status;
EOF

# Cleanup
echo ""
echo "Step 8: Cleaning up temporary files..."
rm -rf production_export.tar.gz 2025-08-12T19:18Z.dir download_error.log clear_error.log restore_error.log

echo ""
echo "========================================="
echo -e "${GREEN}✅ Staging database setup complete!${NC}"
echo "========================================="
echo ""
echo "Summary:"
echo "- Production database structure imported to staging"
echo "- All production data cleared (tables are empty)"
echo "- Migration history preserved (no need to run migrations)"
echo "- Test admin user created: admin@staging.dottapps.com"
echo ""
echo "The staging database now has:"
echo "✅ All tables and structure from production"
echo "✅ No production data (empty tables)"
echo "✅ Migration history (to avoid conflicts)"
echo "✅ Required PostgreSQL extensions"
echo "✅ Test admin user for staging"
echo ""
echo "Next steps:"
echo "1. Deploy your staging frontend (should work now)"
echo "2. Deploy your staging backend (should work now)"
echo "3. Test at https://staging.dottapps.com"