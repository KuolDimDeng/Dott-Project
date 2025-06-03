
-- Drop existing Token Blacklist tables if they exist
DROP TABLE IF EXISTS token_blacklist_outstandingtoken CASCADE;
DROP TABLE IF EXISTS token_blacklist_blacklistedtoken CASCADE;

-- Create the token_blacklist_outstandingtoken table
CREATE TABLE token_blacklist_outstandingtoken (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    jti VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE
);

-- Create the token_blacklist_blacklistedtoken table
CREATE TABLE token_blacklist_blacklistedtoken (
    id SERIAL PRIMARY KEY,
    blacklisted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    token_id INTEGER NOT NULL UNIQUE REFERENCES token_blacklist_outstandingtoken(id) ON DELETE CASCADE
);

-- Add content types for Token Blacklist models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('token_blacklist', 'outstandingtoken'),
    ('token_blacklist', 'blacklistedtoken')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Token Blacklist migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('token_blacklist', '0001_initial', NOW()),
    ('token_blacklist', '0002_outstandingtoken_jti_hex', NOW()),
    ('token_blacklist', '0003_auto_20171017_2007', NOW()),
    ('token_blacklist', '0004_auto_20171017_2013', NOW()),
    ('token_blacklist', '0005_remove_outstandingtoken_jti', NOW()),
    ('token_blacklist', '0006_auto_20171017_2113', NOW()),
    ('token_blacklist', '0007_auto_20171017_2214', NOW()),
    ('token_blacklist', '0008_migrate_to_bigautofield', NOW()),
    ('token_blacklist', '0010_fix_migrate_to_bigautofield', NOW()),
    ('token_blacklist', '0011_linearizes_history', NOW()),
    ('token_blacklist', '0012_alter_outstandingtoken_user', NOW())
ON CONFLICT DO NOTHING;
