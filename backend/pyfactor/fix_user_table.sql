-- Drop any tables that might reference custom_auth_user
DROP TABLE IF EXISTS account_emailaddress CASCADE;
DROP TABLE IF EXISTS socialaccount_socialaccount CASCADE;
DROP TABLE IF EXISTS custom_auth_user_groups CASCADE;
DROP TABLE IF EXISTS custom_auth_user_user_permissions CASCADE;

-- Drop the user table
DROP TABLE IF EXISTS custom_auth_user CASCADE;

-- Create the user table with UUID primary key
CREATE TABLE custom_auth_user (
    id UUID PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE NULL,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    first_name VARCHAR(150) NOT NULL DEFAULT '',
    last_name VARCHAR(150) NOT NULL DEFAULT '',
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    email VARCHAR(254) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    cognito_sub VARCHAR(255) NULL,
    phone_number VARCHAR(20) NULL,
    tenant_id UUID NULL REFERENCES custom_auth_tenant(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX idx_user_email ON custom_auth_user(email);
CREATE INDEX idx_user_tenant ON custom_auth_user(tenant_id);

-- Recreate permission tables
CREATE TABLE custom_auth_user_groups (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES auth_group(id) ON DELETE CASCADE,
    UNIQUE (user_id, group_id)
);

CREATE TABLE custom_auth_user_user_permissions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES auth_permission(id) ON DELETE CASCADE,
    UNIQUE (user_id, permission_id)
);

-- Mark migrations as applied in django_migrations
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('custom_auth', '0001_initial', NOW())
ON CONFLICT DO NOTHING; 