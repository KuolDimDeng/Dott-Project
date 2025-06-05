-- Fix Business Tables Script
-- This script creates the missing users_business and related tables

-- Create the users_business table to match the current Business model
CREATE TABLE IF NOT EXISTS users_business (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    business_num VARCHAR(6) UNIQUE,
    tenant_id UUID
);

-- Create the users_business_details table to match BusinessDetails model  
CREATE TABLE IF NOT EXISTS users_business_details (
    business_id UUID PRIMARY KEY REFERENCES users_business(id) ON DELETE CASCADE,
    business_type VARCHAR(50),
    business_subtype_selections JSONB DEFAULT '{}',
    legal_structure VARCHAR(50) DEFAULT 'SOLE_PROPRIETORSHIP',
    date_founded DATE,
    country VARCHAR(2) DEFAULT 'US',
    tenant_id UUID
);

-- Create the users_businessmember table to match BusinessMember model
CREATE TABLE IF NOT EXISTS users_businessmember (
    id BIGSERIAL PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    business_id UUID NOT NULL REFERENCES users_business(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    tenant_id UUID
);

-- Create unique constraint for business-user pair
ALTER TABLE users_businessmember DROP CONSTRAINT IF EXISTS users_businessmember_business_id_user_id_key;
ALTER TABLE users_businessmember ADD CONSTRAINT users_businessmember_business_id_user_id_key UNIQUE (business_id, user_id);

-- Create the users_menu_privilege table to match UserMenuPrivilege model
CREATE TABLE IF NOT EXISTS users_menu_privilege (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_items JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    business_member_id BIGINT NOT NULL REFERENCES users_businessmember(id) ON DELETE CASCADE,
    created_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL
);

-- Create the users_subscription table to match Subscription model  
CREATE TABLE IF NOT EXISTS users_subscription (
    id BIGSERIAL PRIMARY KEY,
    selected_plan VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    end_date DATE,
    billing_cycle VARCHAR(20) NOT NULL,
    business_id UUID NOT NULL REFERENCES users_business(id) ON DELETE CASCADE,
    tenant_id UUID
);

-- Update users_userprofile table if needed (checking if columns exist)
DO $$ 
BEGIN
    -- Add business_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users_userprofile' AND column_name='business_id') THEN
        ALTER TABLE users_userprofile ADD COLUMN business_id UUID REFERENCES users_business(id) ON DELETE SET NULL;
    END IF;
    
    -- Add tenant_id column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users_userprofile' AND column_name='tenant_id') THEN
        ALTER TABLE users_userprofile ADD COLUMN tenant_id UUID;
    END IF;
    
    -- Add is_business_owner column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users_userprofile' AND column_name='is_business_owner') THEN
        ALTER TABLE users_userprofile ADD COLUMN is_business_owner BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add setup fields if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users_userprofile' AND column_name='setup_status') THEN
        ALTER TABLE users_userprofile ADD COLUMN setup_status VARCHAR(20) DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users_userprofile' AND column_name='setup_started_at') THEN
        ALTER TABLE users_userprofile ADD COLUMN setup_started_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users_userprofile' AND column_name='setup_completed_at') THEN
        ALTER TABLE users_userprofile ADD COLUMN setup_completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users_userprofile' AND column_name='setup_error') THEN
        ALTER TABLE users_userprofile ADD COLUMN setup_error TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users_userprofile' AND column_name='setup_task_id') THEN
        ALTER TABLE users_userprofile ADD COLUMN setup_task_id VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users_userprofile' AND column_name='metadata') THEN
        ALTER TABLE users_userprofile ADD COLUMN metadata JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users_userprofile' AND column_name='shopify_access_token') THEN
        ALTER TABLE users_userprofile ADD COLUMN shopify_access_token VARCHAR(255);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_business_tenant_id ON users_business(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_business_owner_id ON users_business(owner_id);
CREATE INDEX IF NOT EXISTS idx_users_business_details_tenant_id ON users_business_details(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_businessmember_business_id ON users_businessmember(business_id);
CREATE INDEX IF NOT EXISTS idx_users_businessmember_user_id ON users_businessmember(user_id);
CREATE INDEX IF NOT EXISTS idx_users_businessmember_tenant_id ON users_businessmember(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_business_id ON users_subscription(business_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tenant_id ON users_subscription(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_userprofile_business_id ON users_userprofile(business_id);
CREATE INDEX IF NOT EXISTS idx_users_userprofile_tenant_id ON users_userprofile(tenant_id);

-- Insert content types if they don't exist
INSERT INTO django_content_type (app_label, model) 
VALUES 
    ('users', 'business'),
    ('users', 'businessdetails'), 
    ('users', 'businessmember'),
    ('users', 'userprofile'),
    ('users', 'usermenurivilege'),
    ('users', 'subscription')
ON CONFLICT (app_label, model) DO NOTHING;

PRINT 'Business tables created successfully!'; 