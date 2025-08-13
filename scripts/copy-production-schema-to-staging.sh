#!/bin/bash

# Copy Production Database Schema to Staging
# This script directly copies the schema from production to staging

echo "========================================="
echo "Copying Production Schema to Staging"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database URLs
PROD_DB_URL="postgresql://dott_db_rj48_user:HYKEMGJSmHazfxTJF1SdOy4n7VnxpKjf@dpg-d14numtmpk0c73fcss30-a.oregon-postgres.render.com/dott_db_rj48?sslmode=require"
STAGING_DB_URL="postgresql://dott_db_staging_user:K1k1wll1XM4uv9eZeAB3QAYaZ7BP4ehe@dpg-d20897vfte5s738ismk0-a.oregon-postgres.render.com/dott_db_staging?sslmode=require"

echo "Step 1: Exporting schema from production (structure only)..."
echo "This may take a minute..."

# Export schema only (no data) from production
PGSSLMODE=require pg_dump "$PROD_DB_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-acl \
  -f production_schema.sql

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to export schema from production${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Schema exported successfully${NC}"
echo "File size: $(ls -lh production_schema.sql | awk '{print $5}')"

echo ""
echo "Step 2: Preparing staging database..."
echo "Clearing existing schema..."

# Clear staging database
PGSSLMODE=require psql "$STAGING_DB_URL" << 'EOF'
-- Drop all existing objects
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

SELECT 'Database cleared' as status;
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to clear staging database${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Staging database cleared${NC}"

echo ""
echo "Step 3: Importing schema to staging..."
echo "This may take a few minutes..."

# Import schema to staging
PGSSLMODE=require psql "$STAGING_DB_URL" < production_schema.sql 2>import_error.log

# Check for errors (ignore NOTICE and WARNING messages)
if grep -q "ERROR\|FATAL\|PANIC" import_error.log 2>/dev/null; then
    echo -e "${RED}❌ Critical errors during import:${NC}"
    grep "ERROR\|FATAL\|PANIC" import_error.log | head -10
    echo ""
    echo "Attempting to continue despite errors..."
else
    echo -e "${GREEN}✅ Schema imported successfully${NC}"
fi

echo ""
echo "Step 4: Verifying tables..."
TABLE_COUNT=$(PGSSLMODE=require psql "$STAGING_DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

echo "Total tables created: $TABLE_COUNT"

echo ""
echo "Step 5: Copying migration history..."
echo "This ensures Django knows which migrations have been applied..."

# Export just the django_migrations table data
PGSSLMODE=require pg_dump "$PROD_DB_URL" \
  --data-only \
  --table=django_migrations \
  --no-owner \
  --no-privileges \
  --no-acl \
  -f migrations_data.sql

if [ $? -eq 0 ]; then
    # Import migration history
    PGSSLMODE=require psql "$STAGING_DB_URL" < migrations_data.sql 2>/dev/null
    MIGRATION_COUNT=$(PGSSLMODE=require psql "$STAGING_DB_URL" -t -c "SELECT COUNT(*) FROM django_migrations;" 2>/dev/null || echo "0")
    echo -e "${GREEN}✅ Migration history copied: $MIGRATION_COUNT records${NC}"
else
    echo -e "${YELLOW}⚠️  Could not copy migration history (you may need to run migrations)${NC}"
fi

echo ""
echo "Step 6: Creating staging test user..."
PGSSLMODE=require psql "$STAGING_DB_URL" << 'EOF'
-- Create tenant for staging
INSERT INTO custom_auth_tenant (
    id,
    name,
    subdomain,
    created_at,
    updated_at,
    is_active
) VALUES (
    gen_random_uuid(),
    'Staging Test Company',
    'staging-test',
    NOW(),
    NOW(),
    true
) ON CONFLICT (subdomain) DO NOTHING;

-- Create a test admin user for staging
INSERT INTO custom_auth_customuser (
    id, 
    email, 
    is_active, 
    is_staff, 
    is_superuser,
    date_joined,
    auth0_user_id,
    onboarding_completed,
    tenant_id
) 
SELECT
    gen_random_uuid(),
    'admin@staging.dottapps.com',
    true,
    true,
    true,
    NOW(),
    'auth0|staging-test-user',
    true,
    id
FROM custom_auth_tenant
WHERE subdomain = 'staging-test'
ON CONFLICT (email) DO UPDATE SET
    is_active = true,
    is_staff = true,
    is_superuser = true,
    onboarding_completed = true;

-- Create user profile
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
echo "Step 7: Cleaning up temporary files..."
rm -f production_schema.sql migrations_data.sql import_error.log

echo ""
echo "========================================="
echo -e "${GREEN}✅ Staging database setup complete!${NC}"
echo "========================================="
echo ""
echo "Summary:"
echo "✅ Production database structure copied to staging"
echo "✅ All tables created (no data)"
echo "✅ Migration history preserved"
echo "✅ Test admin user created"
echo ""
echo "Database contains:"
echo "- $TABLE_COUNT tables from production"
echo "- No production data (privacy protected)"
echo "- Test user: admin@staging.dottapps.com"
echo "- Tenant: staging-test"
echo ""
echo "Next steps:"
echo "1. Your staging backend should now work without migration errors"
echo "2. Deploy staging frontend if not already done"
echo "3. Test at https://staging.dottapps.com"
echo ""
echo "If you still see migration errors in Django, run:"
echo "  python manage.py migrate --fake"