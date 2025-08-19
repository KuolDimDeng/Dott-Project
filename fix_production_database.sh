#!/bin/bash

echo "========================================"
echo "Production Database Fix Script"
echo "Apply missing changes from staging"
echo "========================================"

cat << 'EOF' > /tmp/fix_production_db.sql
-- 1. Add tax cache fields if missing
ALTER TABLE users_userprofile 
ADD COLUMN IF NOT EXISTS cached_tax_rate NUMERIC(5, 4),
ADD COLUMN IF NOT EXISTS cached_tax_rate_percentage NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS cached_tax_jurisdiction VARCHAR(100),
ADD COLUMN IF NOT EXISTS cached_tax_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cached_tax_source VARCHAR(20);

-- Create index for tax cache
CREATE INDEX IF NOT EXISTS idx_userprofile_tax_updated 
ON users_userprofile(cached_tax_updated_at) 
WHERE cached_tax_rate IS NOT NULL;

-- 2. Fix SSP currency symbol
UPDATE users_business_details
SET preferred_currency_symbol = 'SSP'
WHERE preferred_currency_code = 'SSP' 
AND preferred_currency_symbol = '£';

UPDATE users_business
SET preferred_currency_symbol = 'SSP'
WHERE preferred_currency_code = 'SSP'
AND preferred_currency_symbol = '£';

-- 3. Add missing columns to CRM customer if needed
ALTER TABLE crm_customer
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. Mark migrations as applied if fields exist
-- This prevents Django from trying to re-run migrations
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('users', '0121_add_missing_currency_fields', NOW()),
    ('users', '0122_merge_20250818_0358', NOW()),
    ('users', '0123_add_cached_tax_rate_fields', NOW()),
    ('crm', '0008_add_is_active_to_customer', NOW())
ON CONFLICT (app, name) DO NOTHING;

-- 5. Verify the fixes
SELECT 'Tax Cache Fields' as check_type,
    EXISTS(SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'users_userprofile' 
           AND column_name = 'cached_tax_rate') as exists;

SELECT 'SSP Currency Fixed' as check_type,
    COUNT(*) = 0 as fixed
FROM users_business 
WHERE preferred_currency_code = 'SSP' 
AND preferred_currency_symbol = '£';

SELECT 'Migrations Applied' as check_type,
    COUNT(*) as count
FROM django_migrations
WHERE app = 'users' 
AND name IN ('0121_add_missing_currency_fields', 
             '0122_merge_20250818_0358',
             '0123_add_cached_tax_rate_fields');
EOF

echo ""
echo "To fix production database, run:"
echo ""
echo "  python manage.py dbshell < /tmp/fix_production_db.sql"
echo ""
echo "This will:"
echo "1. Add missing tax cache fields"
echo "2. Fix SSP currency symbols"
echo "3. Add missing CRM columns"
echo "4. Mark migrations as applied"
echo "5. Verify all fixes"
echo ""
echo "========================================"