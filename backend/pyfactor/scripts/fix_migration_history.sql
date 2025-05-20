-- SQL script to fix the migration history in the database
-- This script updates the applied timestamps of migrations to ensure they're in the correct order
-- The issue is that onboarding.0001_initial was applied before business.0001_initial and business.0002_initial

-- First, check the current migration history
SELECT app, name, applied
FROM django_migrations
WHERE app IN ('business', 'onboarding', 'hr')
ORDER BY applied;

-- Get the timestamp of the onboarding.0001_initial migration
SELECT app, name, applied
FROM django_migrations
WHERE app = 'onboarding' AND name = '0001_initial';

-- Get the timestamp of the business.0001_initial migration
SELECT app, name, applied
FROM django_migrations
WHERE app = 'business' AND name = '0001_initial';

-- Get the timestamp of the business.0002_initial migration
SELECT app, name, applied
FROM django_migrations
WHERE app = 'business' AND name = '0002_initial';

-- Get the timestamp of the hr.0001_initial migration
SELECT app, name, applied
FROM django_migrations
WHERE app = 'hr' AND name = '0001_initial';

-- Update the applied timestamp of the onboarding.0001_initial migration
-- to be after business.0002_initial
BEGIN;

-- Set the applied timestamp of business.0001_initial to be the earliest
UPDATE django_migrations
SET applied = NOW() - INTERVAL '30 minutes'
WHERE app = 'business' AND name = '0001_initial';

-- Set the applied timestamp of hr.0001_initial to be after business.0001_initial
UPDATE django_migrations
SET applied = NOW() - INTERVAL '20 minutes'
WHERE app = 'hr' AND name = '0001_initial';

-- Set the applied timestamp of business.0002_initial to be after hr.0001_initial
UPDATE django_migrations
SET applied = NOW() - INTERVAL '10 minutes'
WHERE app = 'business' AND name = '0002_initial';

-- Set the applied timestamp of onboarding.0001_initial to be after business.0002_initial
UPDATE django_migrations
SET applied = NOW()
WHERE app = 'onboarding' AND name = '0001_initial';

-- Check the updated migration history
SELECT app, name, applied
FROM django_migrations
WHERE app IN ('business', 'onboarding', 'hr')
ORDER BY applied;

COMMIT;