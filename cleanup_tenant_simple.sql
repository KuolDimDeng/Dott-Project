-- Simplified tenant cleanup SQL script
-- Delete tenant with ID: e53b800b-c4e1-5fd1-abc6-ba3a785c0102

-- Delete from tenant_users table (this is what's causing the constraint error)
DELETE FROM tenant_users 
WHERE tenant_id = 'e53b800b-c4e1-5fd1-abc6-ba3a785c0102';

-- Finally, delete the tenant record itself
DELETE FROM custom_auth_tenant
WHERE id = 'e53b800b-c4e1-5fd1-abc6-ba3a785c0102';

-- Verify tenant is gone
SELECT EXISTS(SELECT 1 FROM custom_auth_tenant WHERE id = 'e53b800b-c4e1-5fd1-abc6-ba3a785c0102'); 