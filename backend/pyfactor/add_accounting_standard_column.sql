-- Add missing columns to BusinessDetails table
-- This is a hotfix for the logo upload issue caused by missing migrations

-- Check and add accounting_standard column
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
        
        RAISE NOTICE 'Added accounting_standard column to users_business_details table';
    ELSE
        RAISE NOTICE 'accounting_standard column already exists in users_business_details table';
    END IF;
    
    -- Check and add accounting_standard_updated_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users_business_details' 
        AND column_name = 'accounting_standard_updated_at'
    ) THEN
        ALTER TABLE users_business_details 
        ADD COLUMN accounting_standard_updated_at TIMESTAMPTZ NULL;
        
        RAISE NOTICE 'Added accounting_standard_updated_at column to users_business_details table';
    ELSE
        RAISE NOTICE 'accounting_standard_updated_at column already exists';
    END IF;
    
    -- Check and add inventory_valuation_method column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users_business_details' 
        AND column_name = 'inventory_valuation_method'
    ) THEN
        -- Add the inventory_valuation_method column
        ALTER TABLE users_business_details 
        ADD COLUMN inventory_valuation_method VARCHAR(20) DEFAULT 'WEIGHTED_AVERAGE' NOT NULL;
        
        -- Add check constraint for valid values
        ALTER TABLE users_business_details 
        ADD CONSTRAINT users_business_details_inventory_valuation_check 
        CHECK (inventory_valuation_method IN ('FIFO', 'LIFO', 'WEIGHTED_AVERAGE'));
        
        RAISE NOTICE 'Added inventory_valuation_method column to users_business_details table';
    ELSE
        RAISE NOTICE 'inventory_valuation_method column already exists';
    END IF;
END $$;

-- Update Django migrations table to mark migration 0024 as applied
-- This prevents Django from trying to apply it again
INSERT INTO django_migrations (app, name, applied)
VALUES ('users', '0024_add_accounting_standard', NOW())
ON CONFLICT (app, name) DO NOTHING;