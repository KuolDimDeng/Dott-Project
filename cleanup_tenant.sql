-- Tenant cleanup SQL script
-- Delete tenant with ID: e53b800b-c4e1-5fd1-abc6-ba3a785c0102

BEGIN;

-- Delete from tenant_users table (this is what's causing the constraint error)
DELETE FROM tenant_users 
WHERE tenant_id = 'e53b800b-c4e1-5fd1-abc6-ba3a785c0102';

-- Delete from custom_auth_tenant_users
DELETE FROM custom_auth_tenant_users 
WHERE tenant_id = 'e53b800b-c4e1-5fd1-abc6-ba3a785c0102';

-- Delete any auth_group_permissions for this tenant
DELETE FROM auth_group_permissions 
WHERE group_id IN (
    SELECT id FROM auth_group 
    WHERE name LIKE '%e53b800b-c4e1-5fd1-abc6-ba3a785c0102%'
);

-- Delete any auth_groups for this tenant
DELETE FROM auth_group 
WHERE name LIKE '%e53b800b-c4e1-5fd1-abc6-ba3a785c0102%';

-- Delete from custom_auth_user_teams where team belongs to this tenant
DELETE FROM custom_auth_user_teams
WHERE team_id IN (
    SELECT id FROM custom_auth_team
    WHERE tenant_id = 'e53b800b-c4e1-5fd1-abc6-ba3a785c0102'
);

-- Delete any teams associated with this tenant
DELETE FROM custom_auth_team
WHERE tenant_id = 'e53b800b-c4e1-5fd1-abc6-ba3a785c0102';

-- Delete any users specifically associated with this tenant
-- (not deleting accounts completely, just tenant association)
UPDATE custom_auth_user
SET tenant_id = NULL
WHERE tenant_id = 'e53b800b-c4e1-5fd1-abc6-ba3a785c0102';

-- Finally, delete the tenant record itself
DELETE FROM custom_auth_tenant
WHERE id = 'e53b800b-c4e1-5fd1-abc6-ba3a785c0102';

-- Verify tenant is gone
SELECT EXISTS(SELECT 1 FROM custom_auth_tenant WHERE id = 'e53b800b-c4e1-5fd1-abc6-ba3a785c0102');

COMMIT; 