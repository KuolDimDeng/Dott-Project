-- Create the authtoken_token table with UUID for user_id
CREATE TABLE authtoken_token (
    key VARCHAR(40) PRIMARY KEY,
    created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    UNIQUE (user_id)
);

-- Add content types for authtoken models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('authtoken', 'token')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark authtoken migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('authtoken', '0001_initial', NOW()),
    ('authtoken', '0002_auto_20160226_1747', NOW()),
    ('authtoken', '0003_tokenproxy', NOW())
ON CONFLICT DO NOTHING; 