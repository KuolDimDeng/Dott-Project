-- Verify all required tables exist in staging database

-- Check smart_insights tables
\echo '=== Smart Insights Tables ==='
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'smart_insights%'
ORDER BY table_name;

-- Check if all required columns exist in custom_auth_user
\echo '\n=== Custom Auth User Columns ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'custom_auth_user' 
AND column_name IN (
    'onboarding_completed_at', 
    'is_deleted', 
    'deleted_at',
    'deletion_reason',
    'deletion_feedback',
    'deletion_initiated_by'
)
ORDER BY ordinal_position;

-- Check tenant table structure
\echo '\n=== Tenant Table Structure ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'custom_auth_tenant'
ORDER BY ordinal_position;

-- Check for django_site table
\echo '\n=== Django Site Table ==='
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'django_site'
) as django_site_exists;