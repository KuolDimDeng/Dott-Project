#!/bin/bash

echo "🚀 Applying database fix to production..."

# Create SQL script that can be run directly on production
cat > /tmp/fix_pos_tenant_id.sql << 'EOF'
-- Fix missing tenant_id column in finance_journalentryline table
DO $$
BEGIN
    -- Check if column exists
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
        
        RAISE NOTICE '✅ Successfully added tenant_id column to finance_journalentryline';
    ELSE
        RAISE NOTICE '✅ tenant_id column already exists in finance_journalentryline';
    END IF;
END $$;

-- Verify the structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'finance_journalentryline'
ORDER BY ordinal_position;
EOF

echo "
📋 Database fix SQL generated at: /tmp/fix_pos_tenant_id.sql

To apply this fix to production:

1. Connect to the production database
2. Run the SQL script: \\i /tmp/fix_pos_tenant_id.sql

Or run via Django management command on the backend service:
python manage.py fix_journal_entry_tenant

The fix will:
✅ Add missing tenant_id column to finance_journalentryline
✅ Create index for performance
✅ Update existing records with correct tenant_id
✅ Verify the table structure

This will resolve the POS sale completion error immediately.
"