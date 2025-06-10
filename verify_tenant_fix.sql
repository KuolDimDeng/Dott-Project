-- Verification script to check tenant IDs are fixed

-- 1. Check for any remaining invalid tenant IDs
SELECT 
    'Invalid Tenant IDs' as check_type,
    COUNT(*) as count
FROM onboarding_onboardingprogress
WHERE tenant_id = '00000000-0000-0000-0000-00000000000d'
   OR tenant_id::text LIKE '00000000-0000-0000-0000-000000000%';

-- 2. Check kdeng@dottapps.com specifically
SELECT 
    'kdeng@dottapps.com Status' as check_type,
    u.email,
    u.id as user_id,
    u.tenant_id as user_tenant_id,
    op.tenant_id as progress_tenant_id,
    t.id as owned_tenant_id,
    t.name as tenant_name,
    op.onboarding_status,
    op.setup_completed
FROM custom_auth_user u
LEFT JOIN onboarding_onboardingprogress op ON op.user_id = u.id
LEFT JOIN custom_auth_tenant t ON t.owner_id = u.id
WHERE u.email = 'kdeng@dottapps.com';

-- 3. Check all users with completed onboarding have valid tenants
SELECT 
    'Completed Users Missing Tenants' as check_type,
    COUNT(*) as count
FROM onboarding_onboardingprogress op
LEFT JOIN custom_auth_tenant t ON t.id = op.tenant_id
WHERE op.onboarding_status = 'complete'
  AND op.setup_completed = true
  AND (op.tenant_id IS NULL OR t.id IS NULL);

-- 4. Check for any mismatched tenant relationships
SELECT 
    'Mismatched Tenant Relationships' as check_type,
    u.email,
    u.tenant_id as user_tenant,
    op.tenant_id as progress_tenant,
    t.id as owned_tenant
FROM custom_auth_user u
JOIN onboarding_onboardingprogress op ON op.user_id = u.id
LEFT JOIN custom_auth_tenant t ON t.owner_id = u.id
WHERE (u.tenant_id != op.tenant_id)
   OR (u.tenant_id != t.id AND t.id IS NOT NULL)
   OR (op.tenant_id != t.id AND t.id IS NOT NULL)
LIMIT 10;