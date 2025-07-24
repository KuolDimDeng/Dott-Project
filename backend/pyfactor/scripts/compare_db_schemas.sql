-- Script to compare staging vs production database schemas
-- Run this to see what's different between environments

-- 1. Check custom_auth_tenant structure in current database
\echo '=== CURRENT DATABASE: custom_auth_tenant structure ==='
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'custom_auth_tenant' 
ORDER BY ordinal_position;

-- 2. Check if it's a view or table
\echo '\n=== Is custom_auth_tenant a view? ==='
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'custom_auth_tenant';

-- 3. Check users_business structure (underlying table)
\echo '\n=== users_business table structure ==='
\d+ users_business

-- 4. Check custom_auth_user structure
\echo '\n=== custom_auth_user structure ==='
SELECT 
    column_name, 
    data_type, 
    is_nullable
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

-- 5. Check smart_insights tables
\echo '\n=== Smart Insights tables ==='
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'smart_insights%'
ORDER BY table_name;

-- 6. List all missing migrations
\echo '\n=== Unapplied migrations ==='
SELECT app, name 
FROM django_migrations 
WHERE app IN ('custom_auth', 'smart_insights')
ORDER BY app, name;