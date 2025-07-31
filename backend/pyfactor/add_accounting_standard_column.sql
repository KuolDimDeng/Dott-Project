-- Add accounting_standard column to BusinessDetails table if it doesn't exist
-- This is a hotfix for the logo upload issue

-- Check if the column exists first (PostgreSQL specific)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users_business_details' 
        AND column_name = 'accounting_standard'
    ) THEN
        -- Add the accounting_standard column
        ALTER TABLE users_business_details 
        ADD COLUMN accounting_standard VARCHAR(10) DEFAULT 'IFRS' NOT NULL;
        
        -- Add check constraint for valid values
        ALTER TABLE users_business_details 
        ADD CONSTRAINT users_business_details_accounting_standard_check 
        CHECK (accounting_standard IN ('IFRS', 'GAAP'));
        
        -- Add the accounting_standard_updated_at column
        ALTER TABLE users_business_details 
        ADD COLUMN accounting_standard_updated_at TIMESTAMPTZ NULL;
        
        RAISE NOTICE 'Added accounting_standard columns to users_business_details table';
    ELSE
        RAISE NOTICE 'accounting_standard column already exists in users_business_details table';
    END IF;
END $$;