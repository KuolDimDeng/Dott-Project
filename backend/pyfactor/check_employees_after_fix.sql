-- Check employees after fixing business_id

-- 1. Check if any employees exist for the Dott business
SELECT COUNT(*) as employee_count
FROM hr_employee 
WHERE business_id = '8432ed61-16c8-4242-94fc-4c7e25ed5d07';

-- 2. List all employees for the Dott business (if any)
SELECT 
    id,
    employee_number,
    email,
    first_name || ' ' || last_name as name,
    active,
    created_at
FROM hr_employee 
WHERE business_id = '8432ed61-16c8-4242-94fc-4c7e25ed5d07'
ORDER BY created_at DESC;

-- 3. Check ALL employees in the database (to see if they were created with wrong business_id)
SELECT 
    id,
    employee_number,
    business_id,
    email,
    first_name || ' ' || last_name as name,
    created_at
FROM hr_employee
ORDER BY created_at DESC
LIMIT 10;

-- 4. Double-check your user now has correct business_id
SELECT 
    u.id,
    u.email,
    u.business_id as user_business_id,
    b.id as business_id,
    b.name as business_name
FROM custom_auth_user u
JOIN users_business b ON u.business_id = b.id
WHERE u.email = 'support@dottapps.com';