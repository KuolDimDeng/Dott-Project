-- Script to add rls_setup_date column to custom_auth_tenant table

DO $$
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'custom_auth_tenant'
          AND column_name = 'rls_setup_date'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE custom_auth_tenant 
        ADD COLUMN rls_setup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        RAISE NOTICE 'Added rls_setup_date column to custom_auth_tenant table';
    ELSE
        RAISE NOTICE 'rls_setup_date column already exists';
    END IF;
    
    -- Update the migration script section to handle the case where column doesn't exist
    UPDATE custom_auth_tenant
    SET rls_enabled = TRUE
    WHERE rls_enabled IS NULL OR rls_enabled = FALSE;
    
    RAISE NOTICE 'Updated tenants to use RLS';
END$$; 