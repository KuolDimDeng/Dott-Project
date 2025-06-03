
-- Drop existing Taxes tables if they exist
DROP TABLE IF EXISTS taxes_taxpayment CASCADE;
DROP TABLE IF EXISTS taxes_taxform CASCADE;
DROP TABLE IF EXISTS taxes_taxauthority CASCADE;

-- Create the taxes_taxauthority table
CREATE TABLE taxes_taxauthority (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    jurisdiction VARCHAR(100) NOT NULL,
    tax_id_format VARCHAR(100),
    website VARCHAR(255),
    contact_email VARCHAR(254),
    contact_phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create the taxes_taxform table
CREATE TABLE taxes_taxform (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_number VARCHAR(50) NOT NULL,
    form_name VARCHAR(255) NOT NULL,
    tax_year INTEGER NOT NULL,
    filing_status VARCHAR(50),
    due_date DATE,
    extended_due_date DATE,
    status VARCHAR(50) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    attachment VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    authority_id UUID NOT NULL REFERENCES taxes_taxauthority(id) ON DELETE CASCADE,
    prepared_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    verified_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the taxes_taxpayment table
CREATE TABLE taxes_taxpayment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_date DATE NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    confirmation_number VARCHAR(100),
    payment_period_start DATE,
    payment_period_end DATE,
    is_estimated BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tax_form_id UUID REFERENCES taxes_taxform(id) ON DELETE SET NULL,
    authority_id UUID NOT NULL REFERENCES taxes_taxauthority(id) ON DELETE CASCADE,
    created_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    account_id UUID REFERENCES finance_account(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Add content types for Taxes models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('taxes', 'taxauthority'),
    ('taxes', 'taxform'),
    ('taxes', 'taxpayment')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Taxes migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('taxes', '0001_initial', NOW())
ON CONFLICT DO NOTHING;
