-- Direct SQL script to fix invalid tenant IDs in OnboardingProgress
-- This fixes the specific issue where tenant_id was set to user ID (integer) 
-- creating invalid UUIDs like '00000000-0000-0000-0000-00000000000d'

-- First, let's see what we're dealing with
SELECT 
    op.id,
    op.user_id,
    u.email,
    op.tenant_id as invalid_tenant_id,
    t.id as correct_tenant_id,
    t.name as tenant_name
FROM onboarding_onboardingprogress op
JOIN custom_auth_user u ON op.user_id = u.id
LEFT JOIN custom_auth_tenant t ON t.owner_id = u.id
WHERE op.tenant_id = '00000000-0000-0000-0000-00000000000d'
   OR op.tenant_id::text LIKE '00000000-0000-0000-0000-000000000%';

-- Fix the invalid tenant_ids by matching with the correct tenant
UPDATE onboarding_onboardingprogress op
SET tenant_id = t.id
FROM custom_auth_user u
JOIN custom_auth_tenant t ON t.owner_id = u.id
WHERE op.user_id = u.id
  AND (op.tenant_id = '00000000-0000-0000-0000-00000000000d'
       OR op.tenant_id::text LIKE '00000000-0000-0000-0000-000000000%');

-- For users who completed onboarding but don't have a tenant, create one
INSERT INTO custom_auth_tenant (id, name, owner_id, is_active, rls_enabled, created_on)
SELECT 
    gen_random_uuid(),
    COALESCE(u.first_name || '''s Business', split_part(u.email, '@', 1) || '''s Business'),
    u.id,
    true,
    true,
    NOW()
FROM onboarding_onboardingprogress op
JOIN custom_auth_user u ON op.user_id = u.id
LEFT JOIN custom_auth_tenant t ON t.owner_id = u.id
WHERE t.id IS NULL
  AND op.onboarding_status = 'complete'
  AND op.setup_completed = true;

-- Now update OnboardingProgress for those newly created tenants
UPDATE onboarding_onboardingprogress op
SET tenant_id = t.id
FROM custom_auth_user u
JOIN custom_auth_tenant t ON t.owner_id = u.id
WHERE op.user_id = u.id
  AND op.tenant_id IS NULL;

-- Also ensure user.tenant is set correctly
UPDATE custom_auth_user u
SET tenant_id = t.id
FROM custom_auth_tenant t
WHERE t.owner_id = u.id
  AND u.tenant_id IS NULL;

-- Verify the fixes
SELECT 
    op.id,
    u.email,
    op.tenant_id,
    t.name as tenant_name,
    op.onboarding_status,
    op.setup_completed
FROM onboarding_onboardingprogress op
JOIN custom_auth_user u ON op.user_id = u.id
LEFT JOIN custom_auth_tenant t ON t.id = op.tenant_id
WHERE u.email = 'kdeng@dottapps.com';