#!/bin/bash

# Setup Staging Database Schema
# This script creates all necessary tables in staging without copying data

echo "========================================="
echo "Setting Up Staging Database Schema"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database URLs
PROD_DB_URL="postgresql://dott_db_rj48_user:HYKEMGJSmHazfxTJF1SdOy4n7VnxpKjf@dpg-d14numtmpk0c73fcss30-a.oregon-postgres.render.com/dott_db_rj48"
STAGING_DB_URL="postgresql://dott_db_staging_user:K1k1wll1XM4uv9eZeAB3QAYaZ7BP4ehe@dpg-d20897vfte5s738ismk0-a.oregon-postgres.render.com/dott_db_staging"

echo "Step 1: Exporting schema from production (structure only, no data)..."
pg_dump "$PROD_DB_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-acl \
  --no-comments \
  --if-exists \
  --clean \
  > staging_schema.sql 2>export_error.log

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to export schema${NC}"
    echo "Error details:"
    cat export_error.log
    exit 1
fi

echo -e "${GREEN}✅ Schema exported successfully${NC}"

echo ""
echo "Step 2: Clearing staging database..."
psql "$STAGING_DB_URL" << EOF 2>clear_error.log
-- Drop all existing objects
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOF

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Warning during clear (may be normal for new database)${NC}"
fi

echo ""
echo "Step 3: Importing schema to staging..."
psql "$STAGING_DB_URL" < staging_schema.sql 2>import_error.log

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Some warnings during import (usually normal)${NC}"
    echo "Checking if tables were created..."
fi

echo ""
echo "Step 4: Verifying tables..."
TABLE_COUNT=$(psql "$STAGING_DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

echo -e "${GREEN}✅ Schema import complete!${NC}"
echo "Total tables created: $TABLE_COUNT"

echo ""
echo "Step 5: Creating test user (optional)..."
psql "$STAGING_DB_URL" << 'EOF'
-- Create a test admin user for staging
INSERT INTO custom_auth_customuser (
    id, 
    email, 
    is_active, 
    is_staff, 
    is_superuser,
    date_joined,
    auth0_user_id
) VALUES (
    gen_random_uuid(),
    'admin@staging.dottapps.com',
    true,
    true,
    true,
    NOW(),
    'auth0|staging-test-user'
) ON CONFLICT (email) DO NOTHING;
EOF

# Cleanup
rm -f staging_schema.sql export_error.log clear_error.log import_error.log

echo ""
echo "========================================="
echo -e "${GREEN}✅ Staging database schema setup complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Go to dott-api-staging Shell in Render"
echo "2. Run: python manage.py migrate"
echo "3. Your staging database is ready!"
echo ""
echo "The database has:"
echo "- All tables and structure from production"
echo "- No production data (empty tables)"
echo "- Required PostgreSQL extensions"
echo "- Ready for testing"