
-- Drop existing Users tables if they exist
DROP TABLE IF EXISTS users_userprofile CASCADE;
DROP TABLE IF EXISTS users_business CASCADE;
DROP TABLE IF EXISTS users_businessmember CASCADE;
DROP TABLE IF EXISTS users_notification CASCADE;

-- Create the users_business table
CREATE TABLE users_business (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    founded_date DATE,
    website VARCHAR(200),
    description TEXT,
    logo VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create the users_userprofile table
CREATE TABLE users_userprofile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bio TEXT,
    profile_picture VARCHAR(255),
    phone_number VARCHAR(20),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    job_title VARCHAR(100),
    department VARCHAR(100),
    date_of_birth DATE,
    preferred_language VARCHAR(10),
    timezone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    business_id UUID REFERENCES users_business(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the users_businessmember table
CREATE TABLE users_businessmember (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL,
    joined_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES users_business(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL
);

-- Create the users_notification table
CREATE TABLE users_notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    notification_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL
);

-- Add content types for Users models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('users', 'userprofile'),
    ('users', 'business'),
    ('users', 'businessmember'),
    ('users', 'notification')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Users migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('users', '0001_initial', NOW())
ON CONFLICT DO NOTHING;
