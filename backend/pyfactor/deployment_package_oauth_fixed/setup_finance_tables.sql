
-- Drop existing Finance tables if they exist
DROP TABLE IF EXISTS finance_transaction CASCADE;
DROP TABLE IF EXISTS finance_account CASCADE;
DROP TABLE IF EXISTS finance_accounttype CASCADE;
DROP TABLE IF EXISTS finance_accountreconciliation CASCADE;

-- Create the finance_accounttype table
CREATE TABLE finance_accounttype (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    account_type_id INTEGER UNIQUE NULL,
    UNIQUE (name, account_type_id)
);

-- Create the finance_account table
CREATE TABLE finance_account (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100),
    description TEXT,
    balance DECIMAL(19, 4) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    account_type_id INTEGER NOT NULL REFERENCES finance_accounttype(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL
);

-- Create the finance_transaction table
CREATE TABLE finance_transaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    reference_number VARCHAR(100),
    transaction_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    from_account_id UUID NULL REFERENCES finance_account(id) ON DELETE SET NULL,
    to_account_id UUID NULL REFERENCES finance_account(id) ON DELETE SET NULL,
    created_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the finance_accountreconciliation table
CREATE TABLE finance_accountreconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    beginning_balance DECIMAL(19, 4) NOT NULL,
    ending_balance DECIMAL(19, 4) NOT NULL,
    is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    reconciled_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    account_id UUID NOT NULL REFERENCES finance_account(id) ON DELETE CASCADE,
    reconciled_by_id UUID NULL REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    approved_by_id UUID NULL REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    reviewed_by_id UUID NULL REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Add content types for Finance models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('finance', 'accounttype'),
    ('finance', 'account'),
    ('finance', 'transaction'),
    ('finance', 'accountreconciliation')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Finance migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('finance', '0001_initial', NOW())
ON CONFLICT DO NOTHING;

-- Insert default account types
INSERT INTO finance_accounttype (name, account_type_id) VALUES 
('Asset', 1),
('Liability', 2),
('Equity', 3),
('Revenue', 4),
('Expense', 5)
ON CONFLICT DO NOTHING;
