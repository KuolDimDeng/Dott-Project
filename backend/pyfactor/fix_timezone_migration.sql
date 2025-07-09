-- Fix timezone migration conflict
-- This marks the problematic migration as applied and allows the correct migration to run

-- Mark the problematic users migration as applied (fake it)
INSERT INTO django_migrations (app, name, applied) 
VALUES ('users', '0009_add_user_timezone', NOW())
ON CONFLICT (app, name) DO NOTHING;

-- Show current migration status
SELECT app, name, applied FROM django_migrations 
WHERE (app = 'users' AND name = '0009_add_user_timezone') 
   OR (app = 'custom_auth' AND name = '0002_add_user_timezone')
ORDER BY app, name;