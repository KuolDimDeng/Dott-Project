-- Create the tenant table first
CREATE TABLE IF NOT EXISTS custom_auth_tenant (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id VARCHAR(255) NULL,
    schema_name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rls_enabled BOOLEAN DEFAULT TRUE,
    rls_setup_date TIMESTAMP WITH TIME ZONE NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create the auth_group table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth_group (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL
);

-- Create the auth_permission table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth_permission (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    content_type_id INTEGER NOT NULL, 
    codename VARCHAR(100) NOT NULL,
    UNIQUE (content_type_id, codename)
);

-- Create the django_content_type table if it doesn't exist
CREATE TABLE IF NOT EXISTS django_content_type (
    id SERIAL PRIMARY KEY,
    app_label VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    UNIQUE (app_label, model)
);

-- Create UUID extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create auth_group_permissions table
CREATE TABLE IF NOT EXISTS auth_group_permissions (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES auth_group(id),
    permission_id INTEGER NOT NULL REFERENCES auth_permission(id),
    CONSTRAINT auth_group_permissions_group_id_permission_id_key UNIQUE (group_id, permission_id)
);

-- Create content types for auth models if needed
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('auth', 'permission'),
    ('auth', 'group'),
    ('custom_auth', 'user'),
    ('custom_auth', 'tenant')
ON CONFLICT (app_label, model) DO NOTHING;

-- Create custom_auth_user table
CREATE TABLE IF NOT EXISTS custom_auth_user (
    id UUID PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE NULL,
    is_superuser BOOLEAN NOT NULL DEFAULT false,
    email VARCHAR(254) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL DEFAULT '',
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_staff BOOLEAN NOT NULL DEFAULT false,
    date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    email_confirmed BOOLEAN NOT NULL DEFAULT false,
    confirmation_token UUID NOT NULL DEFAULT gen_random_uuid(),
    is_onboarded BOOLEAN NOT NULL DEFAULT false,
    stripe_customer_id VARCHAR(255) NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'OWNER',
    occupation VARCHAR(50) NOT NULL DEFAULT 'OWNER',
    tenant_id UUID NULL,
    cognito_sub VARCHAR(36) NULL
);

-- Create indexes on custom_auth_user
CREATE INDEX IF NOT EXISTS idx_user_tenant ON custom_auth_user(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_email ON custom_auth_user(email);

-- Create custom_auth_user_user_permissions table
CREATE TABLE IF NOT EXISTS custom_auth_user_user_permissions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES custom_auth_user(id),
    permission_id INTEGER NOT NULL REFERENCES auth_permission(id),
    CONSTRAINT custom_auth_user_user_permissions_user_id_permission_id_key UNIQUE (user_id, permission_id)
);

-- Create custom_auth_user_groups table
CREATE TABLE IF NOT EXISTS custom_auth_user_groups (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES custom_auth_user(id),
    group_id INTEGER NOT NULL REFERENCES auth_group(id),
    CONSTRAINT custom_auth_user_groups_user_id_group_id_key UNIQUE (user_id, group_id)
); 