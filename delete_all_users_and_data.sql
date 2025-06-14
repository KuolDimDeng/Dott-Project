-- Script to delete all users and associated data
-- WARNING: This will permanently delete all data!

-- First, disable RLS temporarily to ensure we can delete everything
ALTER TABLE api_tenant DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_employee DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_billinginfo DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_employeepayrollinfo DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_tenantprofile DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_bankaccount DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_auth_user DISABLE ROW LEVEL SECURITY;

-- Delete all data in the correct order to respect foreign key constraints
DELETE FROM api_employeepayrollinfo;
DELETE FROM api_employee;
DELETE FROM api_billinginfo;
DELETE FROM api_tenantprofile;
DELETE FROM api_bankaccount;
DELETE FROM api_tenant;
DELETE FROM custom_auth_user;

-- Re-enable RLS
ALTER TABLE api_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_billinginfo ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_employeepayrollinfo ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_tenantprofile ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_bankaccount ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_auth_user ENABLE ROW LEVEL SECURITY;

-- Reset sequences to start from 1 (for tables that use sequences)
-- Note: UUID tables don't need sequence resets

-- Verify deletion
SELECT 'Users remaining:', COUNT(*) FROM custom_auth_user;
SELECT 'Tenants remaining:', COUNT(*) FROM api_tenant;
SELECT 'Employees remaining:', COUNT(*) FROM api_employee;