#!/usr/bin/env node

/**
 * Database Cleanup Script
 * 
 * WARNING: This script will DELETE ALL DATA from your RDS database!
 * It resets the entire database and applies RLS policies.
 * 
 * Use only in development/testing environments!
 */

const readline = require('readline');
const { Client } = require('pg');
require('dotenv').config();

// Text colors for console
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

// Check for RLS-only mode flag
const RLS_ONLY_MODE = process.argv.includes('--rls-only');

// Warning message
console.log(`${RED}
============================================================
WARNING: This script will RESET your AWS RDS database!
============================================================
${YELLOW}
This is a destructive operation that cannot be undone.
It will:
- Drop the public schema and recreate it
- Reset RLS policies${!RLS_ONLY_MODE ? '\n- Drop all tenant schemas' : ''}
- Set up proper permissions

${RLS_ONLY_MODE ? 'Running in RLS-ONLY mode: No schemas will be created, only RLS policies.' : ''}

This should ONLY be used in development/testing environments.
${RESET}`);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for confirmation
rl.question(`\n${RED}Type "RESET DATABASE" to confirm this operation: ${RESET}`, async (answer) => {
  if (answer !== 'RESET DATABASE') {
    console.log(`\n${YELLOW}Operation cancelled.${RESET}`);
    rl.close();
    return;
  }
  
  console.log(`\n${YELLOW}Starting database reset...${RESET}`);
  
  let client;
  try {
    // Get database connection details from environment variables
    const dbConfig = {
      host: 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
      port: 5432,
      database: 'dott_main',
      user: 'dott_admin',
      password: 'RRfXU6uPPUbBEg1JqGTJ',
      ssl: { rejectUnauthorized: false }
    };
    
    // Connect to database
    console.log('Connecting to AWS RDS database...');
    console.log(`Host: ${dbConfig.host}, Database: ${dbConfig.database}`);
    client = new Client(dbConfig);
    await client.connect();
    
    console.log('Connected to database:', dbConfig.host, dbConfig.database);
    
    // Only look for tenant schemas if not in RLS-only mode
    let tenantSchemas = [];
    if (!RLS_ONLY_MODE) {
      // STEP 1: Find all tenant schemas before dropping the public schema
      console.log('Finding tenant schemas...');
      const schemasResult = await client.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%'
      `);
      
      tenantSchemas = schemasResult.rows.map(row => row.schema_name);
      console.log(`Found ${tenantSchemas.length} tenant schemas`);
    } else {
      console.log('RLS-only mode: Skipping tenant schema operations');
    }
    
    // STEP 2: Drop the public schema (similar to reset_db.py)
    console.log('Dropping public schema...');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
    
    // STEP 3: Recreate the public schema
    console.log('Creating public schema...');
    await client.query('CREATE SCHEMA public;');
    
    // STEP 4: Grant privileges (similar to reset_db.py)
    console.log('Granting privileges...');
    await client.query('GRANT ALL ON SCHEMA public TO PUBLIC;');
    
    // Additional grants for specific roles if needed
    try {
      await client.query('GRANT ALL ON SCHEMA public TO dott_admin;');
    } catch (error) {
      console.log('Note: dott_admin role does not exist, skipping grant');
    }
    
    // STEP 5: Drop all tenant schemas if not in RLS-only mode
    if (!RLS_ONLY_MODE && tenantSchemas.length > 0) {
      console.log('Dropping tenant schemas...');
      for (const schema of tenantSchemas) {
        try {
          console.log(`Dropping schema "${schema}"...`);
          await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE;`);
        } catch (error) {
          console.error(`Error dropping schema ${schema}: ${error.message}`);
        }
      }
    }
    
    // STEP 6: Set up RLS policy functions and triggers
    console.log('Setting up RLS policy functions...');
    
    // Create the RLS policy function
    await client.query(`
      CREATE OR REPLACE FUNCTION public.tenant_isolation_policy(tenant_id text)
      RETURNS boolean AS $$
      BEGIN
        -- If no tenant ID is set, block access
        IF current_setting('app.current_tenant_id', TRUE) IS NULL THEN
          RETURN FALSE;
        END IF;
        
        -- Check if the requested tenant matches the current tenant
        RETURN tenant_id = current_setting('app.current_tenant_id', TRUE);
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create tables that will need RLS
    console.log('Creating base tables with RLS...');
    
    // Create custom_auth_tenant table with schema_name as nullable
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.custom_auth_tenant (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        owner_id TEXT,
        schema_name TEXT UNIQUE NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        rls_enabled BOOLEAN DEFAULT TRUE,
        rls_setup_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        deactivated_at TIMESTAMP WITH TIME ZONE NULL,
        is_recoverable BOOLEAN NULL,
        setup_status TEXT NULL,
        last_health_check TIMESTAMP WITH TIME ZONE NULL
      );
    `);
    
    // Add comment to schema_name
    await client.query(`
      COMMENT ON COLUMN public.custom_auth_tenant.schema_name IS 'Deprecated: Only used for backward compatibility. RLS is the preferred isolation method.';
    `);
    
    // Create tenant_users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.tenant_users (
        tenant_id UUID REFERENCES custom_auth_tenant(id),
        user_id TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id)
      );
    `);
    
    // Enable RLS on tables
    console.log('Enabling RLS on tables...');
    await client.query(`ALTER TABLE public.custom_auth_tenant ENABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;`);
    
    // Create RLS policies
    console.log('Creating RLS policies...');
    await client.query(`
      CREATE POLICY tenant_isolation_policy ON public.custom_auth_tenant
        USING (tenant_isolation_policy(id));
    `);
    
    await client.query(`
      CREATE POLICY tenant_isolation_policy ON public.tenant_users
        USING (tenant_isolation_policy(tenant_id));
    `);

    // Create database parameter for tenant isolation
    console.log('Setting up database tenant context parameter...');
    try {
      await client.query(`ALTER DATABASE ${dbConfig.database} SET app.current_tenant_id = 'unset';`);
    } catch (error) {
      console.error(`Error setting database parameter: ${error.message}`);
    }
    
    console.log(`\n${GREEN}Database reset completed successfully!${RESET}`);
    console.log(`\n${YELLOW}IMPORTANT: This script has only created the basic tenant tables.${RESET}`);
    console.log(`\n${YELLOW}You need to run Django migrations to recreate the remaining tables (${RED}99 tables${YELLOW} in total).${RESET}`);
    console.log(`\n${YELLOW}To complete the setup, run:${RESET}`);
    console.log(`\n${GREEN}cd backend/pyfactor${RESET}`);
    console.log(`${GREEN}python manage.py migrate${RESET}`);
    
  } catch (error) {
    console.error(`\n${RED}Error during database reset: ${error.message}${RESET}`);
  } finally {
    // Close the client connection
    if (client) {
      await client.end();
    }
    
    // Close readline interface
    rl.close();
  }
}); 