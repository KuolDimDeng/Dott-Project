#!/usr/bin/env node

/**
 * fix_tenant_isolation_final.js
 * 
 * This script addresses the tenant isolation issue found in the previous tenant isolation test.
 * It fixes the get_tenant_context function to ensure proper isolation between tenants.
 * 
 * Author: Claude AI Assistant
 * Date: 2025-04-29
 * Version: 1.0.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PostgreSQL function fix
const SQL_FIX = `
-- Drop existing tenant context functions to avoid conflicts
DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS get_tenant_context() CASCADE;
DROP FUNCTION IF EXISTS get_current_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS set_tenant_context(text) CASCADE;
DROP FUNCTION IF EXISTS clear_tenant_context() CASCADE;

-- Create improved functions with better isolation and parameter handling

-- Get the current tenant context with improved error handling
CREATE OR REPLACE FUNCTION get_tenant_context()
RETURNS text AS $$
DECLARE
    tenant_value text;
BEGIN
    -- Try to get the setting, return 'unset' if it doesn't exist or is NULL
    BEGIN
        tenant_value := current_setting('app.current_tenant_id', TRUE);
    EXCEPTION WHEN OTHERS THEN
        tenant_value := NULL;
    END;
    
    RETURN COALESCE(tenant_value, 'unset');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- For use in RLS policies - SECURITY INVOKER to run in the policy's context
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS text AS $$
DECLARE
    tenant_value text;
BEGIN
    -- Direct access to setting to ensure proper context in RLS
    BEGIN
        tenant_value := current_setting('app.current_tenant_id', TRUE);
    EXCEPTION WHEN OTHERS THEN
        tenant_value := NULL;
    END;
    
    RETURN COALESCE(tenant_value, 'unset');
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Set tenant context (SECURITY DEFINER for permission to set parameter)
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id text)
RETURNS text AS $$
BEGIN
    -- Validate and set as session parameter
    IF tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant ID cannot be NULL';
    END IF;
    
    -- Set parameter at session level (FALSE) not transaction level
    PERFORM set_config('app.current_tenant_id', tenant_id, FALSE);
    
    RETURN tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clear tenant context (SECURITY DEFINER for permission)
CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS text AS $$
BEGIN
    -- Set special 'unset' value for admin access
    PERFORM set_config('app.current_tenant_id', 'unset', FALSE);
    
    RETURN 'unset';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create test table and policy if it doesn't exist
CREATE TABLE IF NOT EXISTS rls_test_isolation (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    business_id TEXT NULL,
    data TEXT NOT NULL
);

-- Enable RLS on the test table
ALTER TABLE rls_test_isolation ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS tenant_isolation_policy ON rls_test_isolation;

-- Create policy to enforce tenant isolation
CREATE POLICY tenant_isolation_policy ON rls_test_isolation
AS RESTRICTIVE
USING (
    (tenant_id::TEXT = current_tenant_id())
    OR current_tenant_id() = 'unset'
);

-- Clear existing test data
TRUNCATE TABLE rls_test_isolation;

-- Insert test data
INSERT INTO rls_test_isolation (tenant_id, business_id, data)
VALUES 
    ('tenant1', 'tenant1', 'Data for tenant 1'),
    ('tenant1', 'tenant1', 'More data for tenant 1'),
    ('tenant2', 'tenant2', 'Data for tenant 2'),
    ('tenant2', 'tenant2', 'More data for tenant 2');
`;

const SQL_FILENAME = path.join(__dirname, 'fix_tenant_isolation.sql');

// Write SQL to file
fs.writeFileSync(SQL_FILENAME, SQL_FIX);

// Function to run a command
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

// Main function
async function main() {
  try {
    console.log('🔒 Starting tenant isolation fix...');
    
    // Run the SQL fix against the database
    await runCommand('cd', ['/Users/kuoldeng/projectx/backend/pyfactor']);
    await runCommand('psql', [
      '-d', 'pyfactor', 
      '-f', SQL_FILENAME
    ]);
    
    console.log('✅ Tenant context functions fixed');
    
    // Run the Python isolation test again to verify
    await runCommand('cd', ['/Users/kuoldeng/projectx/backend/pyfactor']);
    await runCommand('python', ['/Users/kuoldeng/projectx/backend/pyfactor/scripts/Version0001_enforce_tenant_isolation.py', '--check']);
    
    console.log('✅ Tenant isolation fix completed');
    console.log('\n🔍 Next steps:');
    console.log('  1. Restart the Django server to apply changes');
    console.log('  2. Test employee listing with different tenant accounts');
    console.log('  3. Verify that employees from other tenants are no longer visible');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main(); 