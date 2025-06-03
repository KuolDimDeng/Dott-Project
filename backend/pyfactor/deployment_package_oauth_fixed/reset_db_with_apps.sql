-- Create extension for UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS account_emailaddress CASCADE;
DROP TABLE IF EXISTS account_emailconfirmation CASCADE;
DROP TABLE IF EXISTS auth_group_permissions CASCADE;
DROP TABLE IF EXISTS auth_group CASCADE;
DROP TABLE IF EXISTS auth_permission CASCADE;
DROP TABLE IF EXISTS custom_auth_user_groups CASCADE;
DROP TABLE IF EXISTS custom_auth_user_user_permissions CASCADE;
DROP TABLE IF EXISTS custom_auth_user CASCADE;
DROP TABLE IF EXISTS custom_auth_tenant CASCADE;
DROP TABLE IF EXISTS django_content_type CASCADE;
DROP TABLE IF EXISTS django_migrations CASCADE;
DROP TABLE IF EXISTS django_session CASCADE;
DROP TABLE IF EXISTS django_site CASCADE;

-- Create the tenant table first
CREATE TABLE custom_auth_tenant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id VARCHAR(255) NULL,
    schema_name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rls_enabled BOOLEAN DEFAULT TRUE,
    rls_setup_date TIMESTAMP WITH TIME ZONE NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create the django_content_type table
CREATE TABLE django_content_type (
    id SERIAL PRIMARY KEY,
    app_label VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    UNIQUE (app_label, model)
);

-- Create the django_site table
CREATE TABLE django_site (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(100) NOT NULL,
    name VARCHAR(50) NOT NULL,
    UNIQUE (domain)
);

-- Insert default site
INSERT INTO django_site (id, domain, name) 
VALUES (1, 'example.com', 'example.com')
ON CONFLICT DO NOTHING;

-- Create the auth_permission table
CREATE TABLE auth_permission (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    content_type_id INTEGER NOT NULL REFERENCES django_content_type(id) ON DELETE CASCADE,
    codename VARCHAR(100) NOT NULL,
    UNIQUE (content_type_id, codename)
);

-- Create the auth_group table
CREATE TABLE auth_group (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL
);

-- Create the auth_group_permissions table
CREATE TABLE auth_group_permissions (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES auth_group(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES auth_permission(id) ON DELETE CASCADE,
    UNIQUE (group_id, permission_id)
);

-- Create the custom_auth_user table with UUID primary key
CREATE TABLE custom_auth_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE NULL,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    email VARCHAR(254) NOT NULL UNIQUE,
    first_name VARCHAR(150) NOT NULL DEFAULT '',
    last_name VARCHAR(150) NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    email_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    confirmation_token UUID NOT NULL DEFAULT gen_random_uuid(),
    is_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
    stripe_customer_id VARCHAR(255) NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'OWNER',
    occupation VARCHAR(50) NOT NULL DEFAULT 'OWNER',
    tenant_id UUID NULL REFERENCES custom_auth_tenant(id) ON DELETE SET NULL,
    cognito_sub VARCHAR(36) NULL
);

-- Create indexes on custom_auth_user
CREATE INDEX idx_user_tenant ON custom_auth_user(tenant_id);
CREATE INDEX idx_user_email ON custom_auth_user(email);

-- Create custom_auth_user_user_permissions table
CREATE TABLE custom_auth_user_user_permissions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES auth_permission(id) ON DELETE CASCADE,
    UNIQUE (user_id, permission_id)
);

-- Create custom_auth_user_groups table
CREATE TABLE custom_auth_user_groups (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES auth_group(id) ON DELETE CASCADE,
    UNIQUE (user_id, group_id)
);

-- Create the django_migrations table
CREATE TABLE django_migrations (
    id SERIAL PRIMARY KEY,
    app VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create the django_session table
CREATE TABLE django_session (
    session_key VARCHAR(40) PRIMARY KEY,
    session_data TEXT NOT NULL,
    expire_date TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create the account_emailaddress table with UUID for user_id
CREATE TABLE account_emailaddress (
    id SERIAL PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    primary BOOLEAN NOT NULL DEFAULT FALSE,
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE
);

-- Create index for account_emailaddress
CREATE INDEX idx_emailaddress_user ON account_emailaddress(user_id);
CREATE INDEX idx_emailaddress_email ON account_emailaddress(email);

-- Create the account_emailconfirmation table
CREATE TABLE account_emailconfirmation (
    id SERIAL PRIMARY KEY,
    created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    sent TIMESTAMP WITH TIME ZONE NULL,
    key VARCHAR(64) UNIQUE NOT NULL,
    email_address_id INTEGER NOT NULL REFERENCES account_emailaddress(id) ON DELETE CASCADE
);

-- Create index for account_emailconfirmation
CREATE INDEX idx_emailconfirmation_emailaddr ON account_emailconfirmation(email_address_id);
CREATE INDEX idx_emailconfirmation_key ON account_emailconfirmation(key);

-- Insert content types for auth models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('auth', 'permission'),
    ('auth', 'group'),
    ('custom_auth', 'user'),
    ('custom_auth', 'tenant'),
    ('account', 'emailaddress'),
    ('account', 'emailconfirmation'),
    ('sessions', 'session'),
    ('sites', 'site')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('contenttypes', '0001_initial', NOW()),
    ('contenttypes', '0002_remove_content_type_name', NOW()),
    ('contenttypes', '0003_initial_structure', NOW()),
    ('auth', '0001_initial', NOW()),
    ('auth', '0002_alter_permission_name_max_length', NOW()),
    ('auth', '0003_alter_user_email_max_length', NOW()),
    ('auth', '0004_alter_user_username_opts', NOW()),
    ('auth', '0005_alter_user_last_login_null', NOW()),
    ('auth', '0006_require_contenttypes_0002', NOW()),
    ('auth', '0007_alter_validators_add_error_messages', NOW()),
    ('auth', '0008_alter_user_username_max_length', NOW()),
    ('auth', '0009_alter_user_last_name_max_length', NOW()),
    ('auth', '0010_alter_group_name_max_length', NOW()),
    ('auth', '0011_update_proxy_permissions', NOW()),
    ('auth', '0012_alter_user_first_name_max_length', NOW()),
    ('auth', '0013_initial_structure', NOW()),
    ('custom_auth', '0001_initial', NOW()),
    ('account', '0001_initial', NOW()),
    ('account', '0002_email_max_length', NOW()),
    ('sites', '0001_initial', NOW()),
    ('sites', '0002_alter_domain_unique', NOW()),
    ('sessions', '0001_initial', NOW())
ON CONFLICT DO NOTHING; 