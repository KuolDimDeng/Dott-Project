-- Fix support@dottapps.com business_id immediately

-- 1. Update the user's business_id to match the existing Dott business
UPDATE custom_auth_user 
SET business_id = '8432ed61-16c8-4242-94fc-4c7e25ed5d07'
WHERE email = 'support@dottapps.com';

-- 2. Verify the update
SELECT 
    id,
    email,
    business_id,
    '8432ed61-16c8-4242-94fc-4c7e25ed5d07' as expected_business_id,
    CASE 
        WHEN business_id = '8432ed61-16c8-4242-94fc-4c7e25ed5d07' 
        THEN '✅ FIXED' 
        ELSE '❌ NOT FIXED' 
    END as status
FROM custom_auth_user
WHERE email = 'support@dottapps.com';

-- 3. Now check if any employees exist for the correct business
SELECT COUNT(*) as employee_count
FROM hr_employee 
WHERE business_id = '8432ed61-16c8-4242-94fc-4c7e25ed5d07';

-- 4. List all employees for the Dott business
SELECT 
    id,
    employee_number,
    email,
    first_name || ' ' || last_name as name,
    created_at
FROM hr_employee 
WHERE business_id = '8432ed61-16c8-4242-94fc-4c7e25ed5d07'
ORDER BY created_at DESC;