
-- Drop existing CRM tables if they exist
DROP TABLE IF EXISTS crm_activity CASCADE;
DROP TABLE IF EXISTS crm_contact CASCADE;
DROP TABLE IF EXISTS crm_customer CASCADE;
DROP TABLE IF EXISTS crm_lead CASCADE;
DROP TABLE IF EXISTS crm_note CASCADE;

-- Create the crm_contact table
CREATE TABLE crm_contact (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(20),
    company VARCHAR(100),
    job_title VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create the crm_lead table
CREATE TABLE crm_lead (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(50) NOT NULL,
    source VARCHAR(50),
    value DECIMAL(19, 4),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    contact_id UUID NOT NULL REFERENCES crm_contact(id) ON DELETE CASCADE,
    assigned_to_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the crm_customer table
CREATE TABLE crm_customer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    contact_id UUID NOT NULL REFERENCES crm_contact(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL
);

-- Create the crm_activity table
CREATE TABLE crm_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    contact_id UUID REFERENCES crm_contact(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES crm_lead(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES crm_customer(id) ON DELETE CASCADE,
    assigned_to_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the crm_note table
CREATE TABLE crm_note (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    contact_id UUID REFERENCES crm_contact(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES crm_lead(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES crm_customer(id) ON DELETE CASCADE,
    created_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Add content types for CRM models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('crm', 'contact'),
    ('crm', 'lead'),
    ('crm', 'customer'),
    ('crm', 'activity'),
    ('crm', 'note')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark CRM migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('crm', '0001_initial', NOW()),
    ('crm', '0002_initial', NOW())
ON CONFLICT DO NOTHING;
