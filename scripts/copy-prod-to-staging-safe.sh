#!/bin/bash

# Safe Database Copy Script - Production to Staging
# This script safely copies production data to staging for testing

echo "========================================="
echo "Production to Staging Database Copy"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Production database (known)
PROD_DB_URL="postgresql://dott_db_rj48_user:HYKEMGJSmHazfxTJF1SdOy4n7VnxpKjf@dpg-d14numtmpk0c73fcss30-a.oregon-postgres.render.com/dott_db_rj48"

# Prompt for staging database URL
echo "Please enter your staging database URL from Render:"
echo "(You can find this in Render Dashboard > dott-db-staging > Connect > External Database URL)"
echo ""
read -r STAGING_DB_URL

if [ -z "$STAGING_DB_URL" ]; then
    echo -e "${RED}❌ Staging database URL is required${NC}"
    exit 1
fi

# Validate the URL format
if [[ ! "$STAGING_DB_URL" =~ ^postgresql:// ]]; then
    echo -e "${RED}❌ Invalid database URL format. Should start with postgresql://${NC}"
    exit 1
fi

# Timestamp for backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="prod_backup_${TIMESTAMP}.sql"

echo ""
echo -e "${YELLOW}⚠️  WARNING: This will REPLACE all data in staging with production data!${NC}"
echo "Continue? (yes/no)"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
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
  --verbose \
  > "$BACKUP_FILE" 2>backup.log

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to create production backup${NC}"
    echo "Check backup.log for details"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "${GREEN}✅ Production backup created${NC}"
echo "   File: $BACKUP_FILE"
echo "   Size: $BACKUP_SIZE"

# Optional: Anonymize sensitive data
echo ""
echo "Do you want to anonymize sensitive user data for staging? (recommended)"
echo "This will:"
echo "  - Replace real emails with test emails"
echo "  - Clear payment tokens"
echo "  - Remove API keys"
echo "(yes/no)"
read -r ANONYMIZE

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
    echo -e "${RED}❌ Failed to clear staging database${NC}"
    echo "Check restore.log for details"
    exit 1
fi

echo -e "${GREEN}✅ Staging database cleared${NC}"

echo ""
echo "Step 3: Restoring data to staging..."
psql "$STAGING_DB_URL" < "$BACKUP_FILE" 2>>restore.log

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to restore to staging${NC}"
    echo "Check restore.log for details"
    exit 1
fi

echo -e "${GREEN}✅ Data restored to staging${NC}"

# Apply anonymization if requested
if [ "$ANONYMIZE" = "yes" ]; then
    echo ""
    echo "Step 4: Anonymizing sensitive data..."
    
    psql "$STAGING_DB_URL" << 'EOF' 2>>anonymize.log
-- Start transaction
BEGIN;

-- Anonymize user emails (keep admin emails)
UPDATE custom_auth_customuser 
SET email = CONCAT('user_', id, '@staging.dottapps.com')
WHERE email NOT LIKE '%@dottapps.com'
  AND email != 'kuoldimdeng@outlook.com';  -- Keep your beta user for testing

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

-- Clear Stripe customer IDs
UPDATE payments_stripecustomer
SET stripe_customer_id = CONCAT('cus_test_', id);

-- Reset API keys
UPDATE users_userprofile 
SET 
  api_key = NULL,
  api_secret = NULL
WHERE api_key IS NOT NULL;

-- Commit changes
COMMIT;

-- Show summary
SELECT 'Anonymization complete' as status;
SELECT COUNT(*) as anonymized_users FROM custom_auth_customuser WHERE email LIKE '%@staging.dottapps.com';
EOF

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Data anonymized for staging${NC}"
    else
        echo -e "${YELLOW}⚠️  Anonymization had some warnings (check anonymize.log)${NC}"
    fi
fi

# Run Django migrations
echo ""
echo "Step 5: Final steps needed..."
echo ""
echo -e "${YELLOW}Run these commands on your staging server:${NC}"
echo "1. SSH into staging backend:"
echo "   render shell dott-api-staging"
echo ""
echo "2. Run migrations:"
echo "   python manage.py migrate"
echo ""
echo "3. Verify data:"
echo "   python manage.py dbshell"
echo "   SELECT COUNT(*) FROM custom_auth_customuser;"
echo "   SELECT COUNT(*) FROM tenants_tenant;"
echo ""

# Cleanup
echo "Do you want to keep the backup file? (yes/no)"
read -r KEEP_BACKUP

if [ "$KEEP_BACKUP" != "yes" ]; then
    rm -f "$BACKUP_FILE" backup.log restore.log anonymize.log
    echo "Temporary files cleaned up"
else
    echo "Backup saved as: $BACKUP_FILE"
    echo "Logs saved as: backup.log, restore.log, anonymize.log"
fi

echo ""
echo "========================================="
echo -e "${GREEN}✅ Database copy complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Test login with your beta user: kuoldimdeng@outlook.com"
echo "2. Verify all features work correctly"
echo "3. Check that data appears correctly"
echo ""
echo "Staging URLs:"
echo "  Frontend: https://staging.dottapps.com"
echo "  Backend: https://dott-api-staging.onrender.com"