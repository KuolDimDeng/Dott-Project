-- Script to fix tenant names that are showing as "User's Business"
-- This updates tenant names to match the actual business names from onboarding

-- First, let's see what we have
SELECT 
    t.id as tenant_id,
    t.name as current_tenant_name,
    b.name as actual_business_name,
    u.email as user_email
FROM custom_auth_tenant t
JOIN custom_auth_user u ON u.tenant_id = t.id
JOIN onboarding_onboardingprogress op ON op.user_id = u.id
LEFT JOIN users_business b ON b.id = op.business_id
WHERE t.name LIKE '%''s Business%'
   OR t.name != b.name;

-- Update tenant names to match the actual business names
UPDATE custom_auth_tenant t
SET name = b.name
FROM custom_auth_user u
JOIN onboarding_onboardingprogress op ON op.user_id = u.id
JOIN users_business b ON b.id = op.business_id
WHERE u.tenant_id = t.id
  AND b.name IS NOT NULL
  AND b.name != ''
  AND (t.name LIKE '%''s Business%' OR t.name != b.name);

-- Verify the update
SELECT 
    t.id as tenant_id,
    t.name as updated_tenant_name,
    u.email as user_email
FROM custom_auth_tenant t
JOIN custom_auth_user u ON u.tenant_id = t.id
ORDER BY t.created_at DESC;