-- Create the account_emailaddress table with UUID for user_id
CREATE TABLE account_emailaddress (
    id SERIAL PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    "primary" BOOLEAN NOT NULL DEFAULT FALSE,
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

-- Add content types for account models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('account', 'emailaddress'),
    ('account', 'emailconfirmation')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark account migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('account', '0001_initial', NOW()),
    ('account', '0002_email_max_length', NOW()),
    ('account', '0003_alter_emailaddress_create_unique_verified_email', NOW()),
    ('account', '0004_alter_emailaddress_drop_unique_email', NOW()),
    ('account', '0005_emailaddress_idx_upper_email', NOW())
ON CONFLICT DO NOTHING; 