#!/bin/bash

# Database Copy Script - Production to Staging
# This script safely copies production data to staging for testing

echo "========================================="
echo "Production to Staging Database Copy"
echo "========================================="

# Configuration
PROD_DB_URL="postgresql://dott_db_rj48_user:HYKEMGJSmHazfxTJF1SdOy4n7VnxpKjf@dpg-d14numtmpk0c73fcss30-a.oregon-postgres.render.com/dott_db_rj48"
STAGING_DB_URL="postgresql://dott_db_staging_user:YOUR_STAGING_PASSWORD@YOUR_STAGING_HOST/dott_db_staging"

# You'll need to get these from Render dashboard
echo "⚠️  Please update the STAGING_DB_URL with your actual staging database credentials from Render"
echo ""

# Timestamp for backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="prod_backup_${TIMESTAMP}.sql"

echo "Step 1: Creating production database backup..."
echo "This may take a few minutes for large databases..."

# Create backup from production
pg_dump "$PROD_DB_URL" \
  --no-owner \
  --no-privileges \
  --no-acl \
  --exclude-table=django_migrations \
  --exclude-table=django_admin_log \
  --exclude-table=django_session \
  > "$BACKUP_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Failed to create production backup"
    exit 1
fi

echo "✅ Production backup created: $BACKUP_FILE"
echo "   Size: $(du -h $BACKUP_FILE | cut -f1)"

# Optional: Anonymize sensitive data
echo ""
echo "Step 2: Anonymizing sensitive data (optional)..."
echo "Do you want to anonymize user emails and sensitive data? (y/n)"
read -r ANONYMIZE

if [ "$ANONYMIZE" = "y" ]; then
    # Create anonymization script
    cat > anonymize.sql << 'EOF'
-- Anonymize user emails (keep domain for testing)
UPDATE custom_auth_customuser 
SET email = CONCAT('user_', id, '@test.dottapps.com')
WHERE email NOT LIKE '%@dottapps.com';

-- Anonymize phone numbers
UPDATE custom_auth_customuser 
SET phone = CONCAT('+1555', LPAD(CAST(id AS VARCHAR), 7, '0'))
WHERE phone IS NOT NULL;

-- Clear sensitive payment data
UPDATE payments_paymentmethod SET last_four = '0000';
UPDATE payments_transaction SET stripe_charge_id = CONCAT('test_', id);

-- Clear API keys and tokens
UPDATE users_userprofile SET api_key = NULL WHERE api_key IS NOT NULL;
DELETE FROM authtoken_token;
DELETE FROM session_manager_usersession;

COMMIT;
EOF
    
    echo "Applying anonymization..."
    # This would be applied after restoring to staging
fi

echo ""
echo "Step 3: Preparing staging database..."
echo "⚠️  WARNING: This will DELETE all existing staging data!"
echo "Continue? (y/n)"
read -r CONTINUE

if [ "$CONTINUE" != "y" ]; then
    echo "Aborted."
    exit 0
fi

# Clear staging database
echo "Clearing staging database..."
psql "$STAGING_DB_URL" << EOF
-- Terminate existing connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = current_database() 
  AND pid <> pg_backend_pid();

-- Drop all tables in public schema
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
EOF

echo ""
echo "Step 4: Restoring to staging database..."
psql "$STAGING_DB_URL" < "$BACKUP_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Failed to restore to staging"
    exit 1
fi

# Apply anonymization if requested
if [ "$ANONYMIZE" = "y" ]; then
    echo "Applying data anonymization..."
    psql "$STAGING_DB_URL" < anonymize.sql
    rm anonymize.sql
fi

echo "✅ Database successfully copied to staging!"

# Run migrations on staging
echo ""
echo "Step 5: Running Django migrations on staging..."
echo "You'll need to run this on your staging server:"
echo "python manage.py migrate --database=staging"

# Clean up
echo ""
echo "Step 6: Cleanup..."
echo "Keep backup file? (y/n)"
read -r KEEP_BACKUP

if [ "$KEEP_BACKUP" != "y" ]; then
    rm "$BACKUP_FILE"
    echo "Backup file deleted"
else
    echo "Backup saved as: $BACKUP_FILE"
fi

echo ""
echo "========================================="
echo "✅ Staging setup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Update staging environment variables"
echo "2. Deploy latest code to staging"
echo "3. Test all features"
echo "4. Set up staging domains (staging.dottapps.com)"