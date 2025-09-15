-- Fix migration dependency issues
-- This script removes the problematic marketplace migration so it can be reapplied correctly

-- First, check what migrations are currently applied
SELECT * FROM django_migrations WHERE app = 'marketplace' ORDER BY id;
SELECT * FROM django_migrations WHERE app = 'couriers' ORDER BY id;

-- Remove the problematic marketplace migration that was applied out of order
DELETE FROM django_migrations
WHERE app = 'marketplace'
AND name = '0003_add_courier_integration';

-- Now you can run migrations normally
-- After running this SQL, exit dbshell and run:
-- python manage.py migrate couriers
-- python manage.py migrate marketplace
-- python manage.py migrate menu