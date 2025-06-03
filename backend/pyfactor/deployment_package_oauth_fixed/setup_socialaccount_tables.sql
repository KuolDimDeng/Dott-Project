
-- Drop existing Social Account tables if they exist
DROP TABLE IF EXISTS socialaccount_socialtoken CASCADE;
DROP TABLE IF EXISTS socialaccount_socialaccount CASCADE;
DROP TABLE IF EXISTS socialaccount_socialapp_sites CASCADE;
DROP TABLE IF EXISTS socialaccount_socialapp CASCADE;

-- Create the socialaccount_socialapp table
CREATE TABLE socialaccount_socialapp (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(30) NOT NULL,
    name VARCHAR(40) NOT NULL,
    client_id VARCHAR(191) NOT NULL,
    secret VARCHAR(191) NOT NULL,
    key VARCHAR(191) NOT NULL
);

-- Create the socialaccount_socialapp_sites table
CREATE TABLE socialaccount_socialapp_sites (
    id SERIAL PRIMARY KEY,
    socialapp_id INTEGER NOT NULL REFERENCES socialaccount_socialapp(id) ON DELETE CASCADE,
    site_id INTEGER NOT NULL REFERENCES django_site(id) ON DELETE CASCADE,
    UNIQUE (socialapp_id, site_id)
);

-- Create the socialaccount_socialaccount table
CREATE TABLE socialaccount_socialaccount (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(30) NOT NULL,
    uid VARCHAR(191) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE NOT NULL,
    date_joined TIMESTAMP WITH TIME ZONE NOT NULL,
    extra_data TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    UNIQUE (provider, uid)
);

-- Create the socialaccount_socialtoken table
CREATE TABLE socialaccount_socialtoken (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL,
    token_secret VARCHAR(200) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    account_id INTEGER NOT NULL REFERENCES socialaccount_socialaccount(id) ON DELETE CASCADE,
    app_id INTEGER NOT NULL REFERENCES socialaccount_socialapp(id) ON DELETE CASCADE,
    UNIQUE (account_id, app_id)
);

-- Add content types for Social Account models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('socialaccount', 'socialapp'),
    ('socialaccount', 'socialtoken'),
    ('socialaccount', 'socialaccount'),
    ('socialaccount', 'socialapp_sites')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Social Account migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('socialaccount', '0001_initial', NOW()),
    ('socialaccount', '0002_token_max_lengths', NOW()),
    ('socialaccount', '0003_extra_data_default_dict', NOW())
ON CONFLICT DO NOTHING;
