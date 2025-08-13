#!/bin/bash

echo "Run this SQL in the Render shell to fix the POS issue:"
echo ""
echo "python manage.py dbshell"
echo ""
cat << 'EOF'
-- Add missing business_id column to finance_journalentryline
ALTER TABLE finance_journalentryline 
ADD COLUMN IF NOT EXISTS business_id UUID;

-- Add foreign key constraint
ALTER TABLE finance_journalentryline
ADD CONSTRAINT finance_journalentryline_business_id_fk 
FOREIGN KEY (business_id) 
REFERENCES users_business(id) 
DEFERRABLE INITIALLY DEFERRED;

-- Create index for performance
CREATE INDEX IF NOT EXISTS finance_journalentryline_business_id_idx 
ON finance_journalentryline(business_id);

-- Update existing records with business_id from journal_entry
UPDATE finance_journalentryline jel
SET business_id = je.business_id
FROM finance_journalentry je
WHERE jel.journal_entry_id = je.id
AND jel.business_id IS NULL;

-- Verify the structure
\d finance_journalentryline

-- Check if we have values
SELECT COUNT(*) as total_records,
       COUNT(tenant_id) as with_tenant,
       COUNT(business_id) as with_business
FROM finance_journalentryline;
EOF