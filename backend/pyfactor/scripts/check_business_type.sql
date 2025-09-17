-- SQL query to check business type for support@dottapps.com
-- Run this in the Render database shell (psql)

-- Check the business type and simplified business type
SELECT 
    u.email,
    u.id as user_id,
    up.business_id,
    b.name as business_name,
    bd.business_type,
    bd.simplified_business_type,
    bd.business_category,
    bd.business_subcategory
FROM custom_auth_user u
JOIN users_userprofile up ON up.user_id = u.id
LEFT JOIN users_business b ON b.id = up.business_id
LEFT JOIN users_businessdetails bd ON bd.business_id = b.id
WHERE u.email = 'support@dottapps.com';

-- Also check what business types have menu enabled
SELECT DISTINCT simplified_business_type, COUNT(*) as count
FROM users_businessdetails
WHERE simplified_business_type IN ('RESTAURANT_CAFE', 'HOTEL_HOSPITALITY', 'GROCERY_MARKET', 'EVENT_PLANNING')
GROUP BY simplified_business_type
ORDER BY count DESC;

-- To update the business type if needed:
-- UPDATE users_businessdetails 
-- SET simplified_business_type = 'RESTAURANT_CAFE'
-- WHERE business_id = (SELECT business_id FROM users_userprofile WHERE user_id = (SELECT id FROM custom_auth_user WHERE email = 'support@dottapps.com'));