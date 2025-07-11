-- EMPLOYEE DATABASE CHECK (dbshell version)
-- Run these queries in the Django dbshell: python manage.py dbshell

-- 1. Check total employees
SELECT COUNT(*) as total_employees FROM hr_employee;

-- 2. List all employees with business details
SELECT 
    e.id, 
    e.employee_number, 
    e.business_id, 
    e.email, 
    e.first_name, 
    e.last_name,
    e.active,
    e.created_at,
    b.name as business_name
FROM hr_employee e
LEFT JOIN users_business b ON e.business_id = b.id
ORDER BY e.created_at DESC;

-- 3. Check support@dottapps.com user details
SELECT id, email, business_id 
FROM custom_auth_user 
WHERE email = 'support@dottapps.com';

-- 4. Check employees for support@dottapps.com's business
-- Replace <business_id> with the actual business_id from the previous query
SELECT COUNT(*) as employee_count
FROM hr_employee 
WHERE business_id = (
    SELECT business_id 
    FROM custom_auth_user 
    WHERE email = 'support@dottapps.com'
);

-- 5. List employees for support@dottapps.com's business
SELECT 
    id, 
    employee_number, 
    email, 
    first_name || ' ' || last_name as full_name,
    active,
    created_at
FROM hr_employee 
WHERE business_id = (
    SELECT business_id 
    FROM custom_auth_user 
    WHERE email = 'support@dottapps.com'
)
ORDER BY created_at DESC;

-- 6. Check business details for support@dottapps.com
SELECT 
    b.id as business_id, 
    b.name as business_name,
    b.owner_id,
    u.email as owner_email
FROM users_business b
JOIN custom_auth_user u ON b.owner_id = u.id
WHERE b.id = (
    SELECT business_id 
    FROM custom_auth_user 
    WHERE email = 'support@dottapps.com'
);

-- 7. Check all businesses and their employee counts
SELECT 
    b.id, 
    b.name,
    b.owner_id,
    COUNT(e.id) as employee_count
FROM users_business b
LEFT JOIN hr_employee e ON b.id = e.business_id
GROUP BY b.id, b.name, b.owner_id
ORDER BY b.name;

-- 8. Check if there are any business_id mismatches
-- This finds employees whose business_id doesn't match any business
SELECT 
    e.id,
    e.employee_number,
    e.email,
    e.business_id as employee_business_id,
    'No matching business' as issue
FROM hr_employee e
WHERE NOT EXISTS (
    SELECT 1 FROM users_business b WHERE b.id = e.business_id
);

-- 9. Check the most recently created employees
SELECT 
    id,
    employee_number,
    business_id,
    email,
    first_name || ' ' || last_name as name,
    created_at,
    updated_at
FROM hr_employee
ORDER BY created_at DESC
LIMIT 5;

-- 10. Debug: Check if employees are being saved with NULL business_id
SELECT 
    COUNT(*) as null_business_count
FROM hr_employee 
WHERE business_id IS NULL;

-- 11. Check the hr_employee table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'hr_employee'
ORDER BY ordinal_position;