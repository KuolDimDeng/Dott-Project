-- Script to verify and fix tenant schema structure
-- This script checks for the existence of required tables and constraints
-- and fixes any issues found

-- Usage:
-- 1. Connect to the database
-- 2. Set the search_path to the tenant schema: SET search_path TO tenant_schema_name;
-- 3. Run this script

-- Check if business_business table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = current_schema()
        AND table_name = 'business_business'
    ) THEN
        RAISE NOTICE 'Creating business_business table in schema %', current_schema();
        
        -- Create business_business table
        CREATE TABLE business_business (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            business_num VARCHAR(20),
            business_type VARCHAR(50) DEFAULT 'DEFAULT',
            business_subtype_selections JSONB DEFAULT '{}'::jsonb,
            country VARCHAR(2) DEFAULT 'US',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            legal_structure VARCHAR(50) DEFAULT 'SOLE_PROPRIETORSHIP',
            owner_id UUID NULL
        );
        
        RAISE NOTICE 'Created business_business table in schema %', current_schema();
    ELSE
        RAISE NOTICE 'business_business table already exists in schema %', current_schema();
    END IF;
END $$;

-- Check if users_userprofile table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = current_schema()
        AND table_name = 'users_userprofile'
    ) THEN
        RAISE NOTICE 'Creating users_userprofile table in schema %', current_schema();
        
        -- Create users_userprofile table
        CREATE TABLE users_userprofile (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL UNIQUE,
            business_id UUID NULL,
            email VARCHAR(255),
            first_name VARCHAR(255),
            last_name VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            metadata JSONB DEFAULT '{}'::jsonb,
            country VARCHAR(2) DEFAULT 'US',
            is_active BOOLEAN DEFAULT TRUE,
            is_business_owner BOOLEAN DEFAULT FALSE
        );
        
        RAISE NOTICE 'Created users_userprofile table in schema %', current_schema();
    ELSE
        RAISE NOTICE 'users_userprofile table already exists in schema %', current_schema();
    END IF;
END $$;

-- Check if foreign key constraint exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.table_constraints
        WHERE constraint_schema = current_schema()
        AND table_name = 'users_userprofile'
        AND constraint_name = 'users_userprofile_business_id_fk'
    ) THEN
        RAISE NOTICE 'Adding foreign key constraint to users_userprofile.business_id in schema %', current_schema();
        
        -- Add foreign key constraint
        ALTER TABLE users_userprofile
        ADD CONSTRAINT users_userprofile_business_id_fk
        FOREIGN KEY (business_id) REFERENCES business_business(id);
        
        RAISE NOTICE 'Added foreign key constraint to users_userprofile.business_id in schema %', current_schema();
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists on users_userprofile.business_id in schema %', current_schema();
    END IF;
END $$;

-- Check for orphaned profiles (profiles with business_id that doesn't exist in business_business)
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO orphaned_count
    FROM users_userprofile up
    LEFT JOIN business_business bb ON up.business_id = bb.id
    WHERE up.business_id IS NOT NULL AND bb.id IS NULL;
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE 'Found % orphaned profiles in schema %', orphaned_count, current_schema();
        
        -- Option 1: Set business_id to NULL for orphaned profiles
        -- UPDATE users_userprofile up
        -- SET business_id = NULL
        -- WHERE business_id IS NOT NULL
        -- AND NOT EXISTS (
        --     SELECT 1 FROM business_business bb WHERE bb.id = up.business_id
        -- );
        
        -- Option 2: Create placeholder businesses for orphaned profiles
        -- This is commented out because it requires more complex logic to implement in SQL
        -- It's better handled by the Python script
        
        RAISE NOTICE 'Please run the fix_business_schema_issue.py script to fix orphaned profiles';
    ELSE
        RAISE NOTICE 'No orphaned profiles found in schema %', current_schema();
    END IF;
END $$;

-- Verify column types
DO $$
DECLARE
    business_id_type TEXT;
BEGIN
    SELECT data_type
    INTO business_id_type
    FROM information_schema.columns
    WHERE table_schema = current_schema()
    AND table_name = 'users_userprofile'
    AND column_name = 'business_id';
    
    IF business_id_type IS NOT NULL AND business_id_type != 'uuid' THEN
        RAISE NOTICE 'Incorrect data type for users_userprofile.business_id: %. Should be uuid. Fixing...', business_id_type;
        
        -- Fix the data type
        ALTER TABLE users_userprofile
        ALTER COLUMN business_id TYPE uuid USING 
        CASE 
            WHEN business_id IS NULL THEN NULL
            ELSE business_id::text::uuid 
        END;
        
        RAISE NOTICE 'Fixed data type for users_userprofile.business_id in schema %', current_schema();
    ELSIF business_id_type = 'uuid' THEN
        RAISE NOTICE 'Correct data type for users_userprofile.business_id: uuid';
    ELSE
        RAISE NOTICE 'Column users_userprofile.business_id not found in schema %', current_schema();
    END IF;
END $$;

-- Summary
DO $$
BEGIN
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Schema verification complete for schema %', current_schema();
    RAISE NOTICE 'If any issues were found, they have been fixed or instructions were provided';
    RAISE NOTICE 'For complex fixes, please run the fix_business_schema_issue.py script';
    RAISE NOTICE '----------------------------------------';
END $$;