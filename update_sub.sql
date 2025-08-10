-- Update subscription for jubacargovillage@outlook.com to enterprise
UPDATE users_subscription 
SET selected_plan = 'enterprise',
    is_active = true
FROM users_business b, users_userprofile up, custom_auth_user u
WHERE users_subscription.business_id = b.id
  AND b.id = up.business_id
  AND up.user_id = u.id
  AND u.email = 'jubacargovillage@outlook.com';

-- Verify the update
SELECT 
    u.email,
    b.name as business_name,
    s.selected_plan,
    s.is_active,
    s.billing_cycle
FROM custom_auth_user u
JOIN users_userprofile up ON u.id = up.user_id
JOIN users_business b ON up.business_id = b.id
LEFT JOIN users_subscription s ON b.id = s.business_id
WHERE u.email = 'jubacargovillage@outlook.com';
