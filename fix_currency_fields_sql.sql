-- Fix missing currency fields in production database
-- Run this SQL directly in production to add missing columns

-- Add preferred_currency_symbol if missing
ALTER TABLE users_businessdetails 
ADD COLUMN IF NOT EXISTS preferred_currency_symbol VARCHAR(10) DEFAULT '$';

-- Add currency_updated_at if missing
ALTER TABLE users_businessdetails 
ADD COLUMN IF NOT EXISTS currency_updated_at TIMESTAMP WITH TIME ZONE NULL;

-- Add accounting_standard if missing
ALTER TABLE users_businessdetails 
ADD COLUMN IF NOT EXISTS accounting_standard VARCHAR(10) DEFAULT 'IFRS';

-- Add accounting_standard_updated_at if missing
ALTER TABLE users_businessdetails 
ADD COLUMN IF NOT EXISTS accounting_standard_updated_at TIMESTAMP WITH TIME ZONE NULL;

-- Add show_usd_on_invoices if missing
ALTER TABLE users_businessdetails 
ADD COLUMN IF NOT EXISTS show_usd_on_invoices BOOLEAN DEFAULT TRUE;

-- Add show_usd_on_quotes if missing
ALTER TABLE users_businessdetails 
ADD COLUMN IF NOT EXISTS show_usd_on_quotes BOOLEAN DEFAULT TRUE;

-- Add show_usd_on_reports if missing
ALTER TABLE users_businessdetails 
ADD COLUMN IF NOT EXISTS show_usd_on_reports BOOLEAN DEFAULT FALSE;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'users_businessdetails' 
AND column_name IN (
    'preferred_currency_symbol',
    'currency_updated_at',
    'accounting_standard',
    'accounting_standard_updated_at',
    'show_usd_on_invoices',
    'show_usd_on_quotes',
    'show_usd_on_reports'
)
ORDER BY column_name;