#!/bin/bash

# Automated Database Copy Script - Production to Staging
# This script copies production data to staging

echo "========================================="
echo "Production to Staging Database Copy"
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

# Timestamp for backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="prod_backup_${TIMESTAMP}.sql"

echo "Step 1: Creating production database backup..."
echo "This may take a few minutes..."

# Create backup from production (excluding certain tables)
pg_dump "$PROD_DB_URL" \
  --no-owner \
  --no-privileges \
  --no-acl \
  --exclude-table=django_migrations \
  --exclude-table=django_session \
  --exclude-table=session_manager_usersession \
  > "$BACKUP_FILE" 2>backup.log

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to create production backup${NC}"
    echo "Error details:"
    cat backup.log | head -20
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "${GREEN}✅ Production backup created${NC}"
echo "   File: $BACKUP_FILE"
echo "   Size: $BACKUP_SIZE"

echo ""
echo "Step 2: Clearing staging database..."

# Create a clean staging database
psql "$STAGING_DB_URL" << EOF 2>restore.log
-- Terminate existing connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = current_database() 
  AND pid <> pg_backend_pid();

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
    echo -e "${YELLOW}⚠️  Warning during staging database clear (may be normal)${NC}"
fi

echo -e "${GREEN}✅ Staging database prepared${NC}"

echo ""
echo "Step 3: Restoring data to staging..."
psql "$STAGING_DB_URL" < "$BACKUP_FILE" 2>>restore.log

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to restore to staging${NC}"
    echo "Error details:"
    tail -20 restore.log
    exit 1
fi

echo -e "${GREEN}✅ Data restored to staging${NC}"

echo ""
echo "Step 4: Anonymizing sensitive data for staging..."

psql "$STAGING_DB_URL" << 'EOF' 2>>anonymize.log
-- Start transaction
BEGIN;

-- Anonymize user emails (keep admin and beta user emails)
UPDATE custom_auth_customuser 
SET email = CONCAT('user_', id, '@staging.dottapps.com')
WHERE email NOT LIKE '%@dottapps.com'
  AND email != 'kuoldimdeng@outlook.com';  -- Keep beta user for testing

-- Clear sensitive tokens
DELETE FROM authtoken_token;
DELETE FROM session_manager_usersession;
DELETE FROM django_session;

-- Clear payment method details (keep structure)
UPDATE payments_paymentmethod 
SET 
  stripe_payment_method_id = CONCAT('pm_test_', id),
  last_four = '4242'
WHERE stripe_payment_method_id IS NOT NULL;

-- Clear Stripe customer IDs (use test IDs)
UPDATE payments_stripecustomer
SET stripe_customer_id = CONCAT('cus_test_', id)
WHERE stripe_customer_id IS NOT NULL;

-- Reset API keys
UPDATE users_userprofile 
SET 
  api_key = NULL,
  api_secret = NULL
WHERE api_key IS NOT NULL;

-- Commit changes
COMMIT;

-- Show summary
SELECT 'Data anonymization complete' as status;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Data anonymized for staging${NC}"
else
    echo -e "${YELLOW}⚠️  Anonymization had some warnings (normal)${NC}"
fi

# Quick data verification
echo ""
echo "Step 5: Verifying data..."

psql "$STAGING_DB_URL" << 'EOF'
SELECT 'Users' as table_name, COUNT(*) as count FROM custom_auth_customuser
UNION ALL
SELECT 'Tenants', COUNT(*) FROM tenants_tenant
UNION ALL
SELECT 'Products', COUNT(*) FROM inventory_product
UNION ALL
SELECT 'Beta User Check', COUNT(*) FROM custom_auth_customuser WHERE email = 'kuoldimdeng@outlook.com';
EOF

# Cleanup
rm -f "$BACKUP_FILE" backup.log restore.log anonymize.log

echo ""
echo "========================================="
echo -e "${GREEN}✅ Database copy complete!${NC}"
echo "========================================="
echo ""
echo "Data successfully copied from production to staging!"
echo ""
echo "Beta user (kuoldimdeng@outlook.com) preserved for testing"
echo "Other users anonymized to user_ID@staging.dottapps.com"
echo ""
echo "Staging URLs:"
echo "  Frontend: https://staging.dottapps.com"
echo "  Backend: https://dott-api-staging.onrender.com"
echo ""
echo "Note: Django migrations will run automatically on next deploy"