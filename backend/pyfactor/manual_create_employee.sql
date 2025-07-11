-- Manually create an employee to test if the UI can fetch it

-- Insert a test employee directly into the database
INSERT INTO hr_employee (
    id,
    employee_number,
    business_id,
    first_name,
    last_name,
    email,
    phone_number,
    employment_type,
    department,
    job_title,
    active,
    hire_date,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'EMP-' || LPAD(CAST(FLOOR(RANDOM() * 100000) AS TEXT), 5, '0'),
    '8432ed61-16c8-4242-94fc-4c7e25ed5d07',  -- Dott business ID
    'Test',
    'Employee',
    'test.employee@dottapps.com',
    '555-0123',
    'FT',
    'Engineering',
    'Software Engineer',
    true,
    CURRENT_DATE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Verify the employee was created
SELECT 
    id,
    employee_number,
    email,
    first_name || ' ' || last_name as name,
    department,
    job_title,
    created_at
FROM hr_employee
WHERE business_id = '8432ed61-16c8-4242-94fc-4c7e25ed5d07'
ORDER BY created_at DESC;