-- Fix business_id mismatch for support@dottapps.com

-- 1. First, let's see the correct table name for tenants
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%tenant%' 
AND table_schema = 'public';

-- 2. Check user details (without created_at since it doesn't exist)
SELECT 
    id,
    email,
    business_id,
    tenant_id,
    onboarding_completed
FROM custom_auth_user
WHERE email = 'support@dottapps.com';

-- 3. Check who owns the Dott business
SELECT 
    u.id,
    u.email,
    u.business_id,
    b.id as dott_business_id,
    b.name as business_name
FROM custom_auth_user u
CROSS JOIN users_business b
WHERE b.name = 'Dott'
AND u.id = b.owner_id;

-- 4. UPDATE support@dottapps.com to use the correct business_id (Dott)
-- This will fix the issue immediately
UPDATE custom_auth_user 
SET business_id = '8432ed61-16c8-4242-94fc-4c7e25ed5d07'
WHERE email = 'support@dottapps.com';

-- 5. Verify the update
SELECT 
    id,
    email,
    business_id,
    '8432ed61-16c8-4242-94fc-4c7e25ed5d07' as expected_business_id
FROM custom_auth_user
WHERE email = 'support@dottapps.com';

-- 6. Now any employees you create should appear
-- Let's also check if there's a tenant table
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_name IN (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name LIKE '%tenant%' 
    AND table_schema = 'public'
)
ORDER BY table_name, ordinal_position;