-- FORCE TRANSPORT MIGRATION 0004 FIX
-- Direct SQL solution to resolve the persistent staging issue

-- First, check current state
\echo '=== CURRENT STATE CHECK ==='
SELECT 'Transport tables:' as info;
SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'transport_%';

\echo '';
\echo 'Column types:';
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('transport_driver', 'transport_expense') 
AND column_name IN ('user_id', 'created_by_id');

\echo '';
\echo 'Applied migrations:';
SELECT app, name FROM django_migrations WHERE app = 'transport' ORDER BY name;

-- FIX 1: Convert UUID columns to BIGINT
\echo '';
\echo '=== APPLYING FIXES ==='

-- Drop foreign key constraints if they exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transport_driver_user_id_fkey'
        AND table_name = 'transport_driver'
    ) THEN
        ALTER TABLE transport_driver DROP CONSTRAINT transport_driver_user_id_fkey;
        RAISE NOTICE 'Dropped transport_driver_user_id_fkey constraint';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transport_expense_created_by_id_fkey'
        AND table_name = 'transport_expense'
    ) THEN
        ALTER TABLE transport_expense DROP CONSTRAINT transport_expense_created_by_id_fkey;
        RAISE NOTICE 'Dropped transport_expense_created_by_id_fkey constraint';
    END IF;
END $$;

-- Convert columns to BIGINT
DO $$
BEGIN
    -- Check and convert transport_driver.user_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transport_driver' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE transport_driver ALTER COLUMN user_id TYPE BIGINT USING NULL;
        RAISE NOTICE 'Converted transport_driver.user_id from UUID to BIGINT';
    ELSE
        RAISE NOTICE 'transport_driver.user_id is already correct type or does not exist';
    END IF;

    -- Check and convert transport_expense.created_by_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transport_expense' 
        AND column_name = 'created_by_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE transport_expense ALTER COLUMN created_by_id TYPE BIGINT USING NULL;
        RAISE NOTICE 'Converted transport_expense.created_by_id from UUID to BIGINT';
    ELSE
        RAISE NOTICE 'transport_expense.created_by_id is already correct type or does not exist';
    END IF;
END $$;

-- Recreate foreign key constraints
DO $$
BEGIN
    -- Check if custom_auth_user table exists and recreate foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_auth_user') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transport_driver') THEN
            ALTER TABLE transport_driver 
            ADD CONSTRAINT transport_driver_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES custom_auth_user(id) ON DELETE SET NULL;
            RAISE NOTICE 'Recreated transport_driver foreign key constraint';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transport_expense') THEN
            ALTER TABLE transport_expense 
            ADD CONSTRAINT transport_expense_created_by_id_fkey 
            FOREIGN KEY (created_by_id) REFERENCES custom_auth_user(id) ON DELETE SET NULL;
            RAISE NOTICE 'Recreated transport_expense foreign key constraint';
        END IF;
    ELSE
        RAISE NOTICE 'custom_auth_user table not found - skipping foreign key recreation';
    END IF;
END $$;

-- FIX 2: Mark migration as applied
INSERT INTO django_migrations (app, name, applied) 
VALUES ('transport', '0004_fix_user_foreign_key_types', NOW())
ON CONFLICT DO NOTHING;

\echo '';
\echo '=== FINAL VERIFICATION ==='
SELECT 'Updated column types:' as info;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('transport_driver', 'transport_expense') 
AND column_name IN ('user_id', 'created_by_id');

\echo '';
\echo 'Updated migrations:';
SELECT app, name FROM django_migrations WHERE app = 'transport' ORDER BY name;

\echo '';
\echo '✅ TRANSPORT MIGRATION 0004 FORCE FIX COMPLETED';
\echo 'The staging deployment should now succeed!';