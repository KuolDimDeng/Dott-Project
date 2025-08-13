#!/bin/bash

echo "🚀 Deploying POS fixes to production..."

cd /Users/kuoldeng/projectx

# Commit and push the frontend fix
echo "📦 Committing frontend POS stock quantity fix..."
git add frontend/pyfactor_next/src/app/dashboard/components/pos/POSSystemInline.js
git commit -m "Fix POS stock quantity check - use quantity_in_stock field consistently"

# Create database migration script for production
cat > /tmp/fix_journal_entry_production.sql << 'EOF'
-- Check if tenant_id column exists and add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'finance_journalentryline' 
        AND column_name = 'tenant_id'
    ) THEN
        -- Add tenant_id column
        ALTER TABLE finance_journalentryline 
        ADD COLUMN tenant_id UUID;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_finance_journalentryline_tenant_id 
        ON finance_journalentryline(tenant_id);
        
        -- Update existing records to set tenant_id from business relationship
        UPDATE finance_journalentryline jel
        SET tenant_id = b.tenant_id
        FROM users_business b
        WHERE jel.business_id = b.id
        AND jel.tenant_id IS NULL;
        
        RAISE NOTICE 'Successfully added tenant_id column to finance_journalentryline';
    ELSE
        RAISE NOTICE 'tenant_id column already exists in finance_journalentryline';
    END IF;
END $$;

-- Verify the fix
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'finance_journalentryline'
ORDER BY ordinal_position;
EOF

echo "📤 Pushing changes to repository..."
git push origin staging

echo "
✅ POS fixes deployed!

📋 Next steps:
1. The frontend fix has been pushed and will deploy automatically
2. Run this SQL on the production database to fix the tenant_id issue:

cat /tmp/fix_journal_entry_production.sql

3. Monitor the POS system for proper operation

Frontend fix: Stock quantity now correctly checks quantity_in_stock field
Database fix: Adds missing tenant_id column to finance_journalentryline table
"