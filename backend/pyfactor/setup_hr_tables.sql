
-- Drop existing HR tables if they exist
DROP TABLE IF EXISTS hr_employee CASCADE;
DROP TABLE IF EXISTS hr_department CASCADE;
DROP TABLE IF EXISTS hr_payroll CASCADE;

-- Create the hr_department table
CREATE TABLE hr_department (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create the hr_employee table
CREATE TABLE hr_employee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(20),
    position VARCHAR(100),
    hire_date DATE,
    employment_type VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    department_id UUID REFERENCES hr_department(id) ON DELETE SET NULL,
    user_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create the hr_payroll table
CREATE TABLE hr_payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    payment_date DATE NOT NULL,
    gross_amount DECIMAL(19, 4) NOT NULL,
    net_amount DECIMAL(19, 4) NOT NULL,
    tax_amount DECIMAL(19, 4) NOT NULL,
    employee_id UUID NOT NULL REFERENCES hr_employee(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Add content types for HR models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('hr', 'department'),
    ('hr', 'employee'),
    ('hr', 'payroll')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark HR migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('hr', '0001_initial', NOW())
ON CONFLICT DO NOTHING;
