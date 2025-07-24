-- Fix for staging database migrations
-- Creates a view for custom_auth_tenant that points to users_business

-- First, create the users_business table if it doesn't exist
-- This will be properly created by later migrations, but we need it now
CREATE TABLE IF NOT EXISTS users_business (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    business_num VARCHAR(6) UNIQUE,
    stripe_account_id VARCHAR(255) UNIQUE,
    stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
    stripe_charges_enabled BOOLEAN DEFAULT FALSE,
    stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
    stripe_customer_id VARCHAR(100),
    default_bank_token VARCHAR(100),
    ach_mandate_id VARCHAR(100)
);

-- Create a view that makes custom_auth_tenant point to users_business
CREATE OR REPLACE VIEW custom_auth_tenant AS
SELECT 
    id,
    name,
    owner_id::VARCHAR(255) as owner_id,
    name as schema_name,  -- Using name as schema_name for compatibility
    created_at,
    updated_at,
    TRUE as rls_enabled,
    created_at as rls_setup_date,
    TRUE as is_active
FROM users_business;

-- Create rule to make the view insertable/updatable
CREATE OR REPLACE RULE tenant_insert AS ON INSERT TO custom_auth_tenant
DO INSTEAD INSERT INTO users_business (id, name, owner_id, created_at, updated_at)
VALUES (NEW.id, NEW.name, NEW.owner_id::UUID, NEW.created_at, NEW.updated_at);

CREATE OR REPLACE RULE tenant_update AS ON UPDATE TO custom_auth_tenant
DO INSTEAD UPDATE users_business 
SET name = NEW.name, 
    owner_id = NEW.owner_id::UUID,
    updated_at = NEW.updated_at
WHERE id = OLD.id;

CREATE OR REPLACE RULE tenant_delete AS ON DELETE TO custom_auth_tenant
DO INSTEAD DELETE FROM users_business WHERE id = OLD.id;