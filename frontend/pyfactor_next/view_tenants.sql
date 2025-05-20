-- Query to get all tenant IDs with associated email and business name
SELECT 
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.created_at AS tenant_created,
    u.email AS owner_email,
    b.name AS business_name
FROM 
    custom_auth_tenant t
LEFT JOIN 
    custom_auth_user u ON t.owner_id = u.id
LEFT JOIN 
    users_business b ON b.tenant_id = t.id
ORDER BY 
    t.created_at DESC;
