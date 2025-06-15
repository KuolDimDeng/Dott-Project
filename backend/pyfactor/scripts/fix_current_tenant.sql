-- Fix the current tenant name for admin@dottapps.com
-- This specifically fixes the issue where the tenant name is showing as "John Doe's Business" instead of "Juba Cargo"

-- First, let's see the current state
SELECT 
    u.email,
    t.id as tenant_id,
    t.name as current_tenant_name,
    b.name as business_name_from_onboarding
FROM custom_auth_user u
JOIN custom_auth_tenant t ON u.tenant_id = t.id
LEFT JOIN onboarding_onboardingprogress op ON op.user_id = u.id
LEFT JOIN users_business b ON b.id = op.business_id
WHERE u.email = 'admin@dottapps.com';

-- Update the tenant name to match the business name from onboarding
UPDATE custom_auth_tenant t
SET name = 'Juba Cargo'
FROM custom_auth_user u
WHERE u.tenant_id = t.id
  AND u.email = 'admin@dottapps.com';

-- Verify the update
SELECT 
    u.email,
    t.id as tenant_id,
    t.name as updated_tenant_name
FROM custom_auth_user u
JOIN custom_auth_tenant t ON u.tenant_id = t.id
WHERE u.email = 'admin@dottapps.com';