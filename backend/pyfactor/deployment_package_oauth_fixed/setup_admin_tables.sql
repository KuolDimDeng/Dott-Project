-- Create the admin log table with UUID for user_id
CREATE TABLE django_admin_log (
    id SERIAL PRIMARY KEY,
    action_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    object_id TEXT NULL,
    object_repr VARCHAR(200) NOT NULL,
    action_flag SMALLINT NOT NULL CHECK (action_flag >= 0),
    change_message TEXT NOT NULL,
    content_type_id INTEGER NULL REFERENCES django_content_type(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX django_admin_log_content_type_id ON django_admin_log(content_type_id);
CREATE INDEX django_admin_log_user_id ON django_admin_log(user_id);

-- Add content types for admin models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('admin', 'logentry')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark admin migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('admin', '0001_initial', NOW()),
    ('admin', '0002_logentry_remove_auto_add', NOW()),
    ('admin', '0003_logentry_add_action_flag_choices', NOW())
ON CONFLICT DO NOTHING; 