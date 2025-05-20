-- Drop existing banking tables if they exist
DROP TABLE IF EXISTS banking_banktransaction CASCADE;
DROP TABLE IF EXISTS banking_plaiditem CASCADE;
DROP TABLE IF EXISTS banking_tinkitem CASCADE;
DROP TABLE IF EXISTS banking_bankaccount CASCADE;

-- Create the banking_bankaccount table with UUID for user_id
CREATE TABLE banking_bankaccount (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100),
    account_type VARCHAR(100),
    balance DECIMAL(19, 4) NOT NULL,
    currency VARCHAR(3),
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL,
    user_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL
);

-- Create the banking_banktransaction table 
CREATE TABLE banking_banktransaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(255),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT,
    amount DECIMAL(19, 4) NOT NULL,
    transaction_type VARCHAR(50),
    category VARCHAR(100),
    merchant_name VARCHAR(255),
    pending BOOLEAN NOT NULL DEFAULT FALSE,
    tenant_id UUID NOT NULL,
    account_id UUID REFERENCES banking_bankaccount(id) ON DELETE CASCADE
);

-- Create the banking_plaiditem table with UUID for user_id
CREATE TABLE banking_plaiditem (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_token VARCHAR(255) NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    institution_id VARCHAR(100),
    institution_name VARCHAR(255),
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create the banking_tinkitem table with UUID for user_id
CREATE TABLE banking_tinkitem (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_token VARCHAR(255) NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    institution_id VARCHAR(100),
    institution_name VARCHAR(255),
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
); 