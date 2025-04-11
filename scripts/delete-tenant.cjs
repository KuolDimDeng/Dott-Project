#!/usr/bin/env node

/**
 * Tenant Deletion Script (CommonJS version)
 * 
 * This script allows deleting specific tenants without resetting the entire database
 * It can delete a single tenant by ID or all tenants while preserving system tables
 */

const readline = require('readline');
const { Client } = require('pg');
require('dotenv').config();

// Text colors for console
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

// Parse command line arguments
const args = process.argv.slice(2);
const tenantId = args.length > 0 && !args[0].startsWith('--') ? args[0] : null;
const deleteAllTenants = args.includes('--all');

// Warning message
console.log(`${RED}
============================================================
      TENANT DELETION SCRIPT (CommonJS version)
============================================================
${YELLOW}
This is a destructive operation that cannot be undone.
It will:
- ${deleteAllTenants ? 'Delete ALL tenants' : tenantId ? `Delete tenant with ID: ${tenantId}` : 'No tenant specified. Use a tenant ID or --all flag.'}
- Keep system tables and database structure intact
- Preserve RLS policies

This should ONLY be used in development/testing environments.
${RESET}`);

// Exit if no tenant ID or --all flag provided
if (!tenantId && !deleteAllTenants) {
  console.log(`
Usage:
  node delete-tenant.cjs <tenant-id>    # Delete a specific tenant
  node delete-tenant.cjs --all          # Delete all tenants
  `);
  process.exit(1);
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for confirmation
const confirmMessage = deleteAllTenants 
  ? "DELETE ALL TENANTS" 
  : `DELETE TENANT ${tenantId}`;

rl.question(`\n${RED}Type "${confirmMessage}" to confirm this operation: ${RESET}`, async (answer) => {
  if (answer !== confirmMessage) {
    console.log(`\n${YELLOW}Operation cancelled.${RESET}`);
    rl.close();
    return;
  }
  
  console.log(`\n${YELLOW}Starting tenant deletion...${RESET}`);
  
  let client;
  try {
    // Get database connection details from environment variables or use defaults
    const dbConfig = {
      host: process.env.DB_HOST || 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'dott_main',
      user: process.env.DB_USER || 'dott_admin',
      password: process.env.DB_PASSWORD || 'RRfXU6uPPUbBEg1JqGTJ',
      ssl: { rejectUnauthorized: false }
    };
    
    // Connect to database
    console.log('Connecting to database...');
    console.log(`Host: ${dbConfig.host}, Database: ${dbConfig.database}`);
    client = new Client(dbConfig);
    await client.connect();
    
    console.log('Connected to database:', dbConfig.host, dbConfig.database);
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Get the list of tables with tenant_id column
    console.log('Finding tables with tenant_id column...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'tenant_id' 
      AND table_schema = 'public'
    `);
    
    const tenantTables = tablesResult.rows.map(row => row.table_name);
    console.log(`Found ${tenantTables.length} tables with tenant_id column`);
    
    // If deleting all tenants, get the list of tenant IDs first
    let tenantsToDelete = [];
    if (deleteAllTenants) {
      const tenantsResult = await client.query(`
        SELECT id, name FROM custom_auth_tenant
      `);
      tenantsToDelete = tenantsResult.rows;
      console.log(`Found ${tenantsToDelete.length} tenants to delete`);
    } else {
      // Check if the specified tenant exists
      const tenantResult = await client.query(`
        SELECT id, name FROM custom_auth_tenant WHERE id = $1
      `, [tenantId]);
      
      if (tenantResult.rows.length === 0) {
        console.log(`\n${RED}Error: Tenant with ID ${tenantId} not found.${RESET}`);
        await client.query('ROLLBACK');
        client.end();
        rl.close();
        return;
      }
      
      tenantsToDelete = tenantResult.rows;
    }
    
    // Delete each tenant's data
    for (const tenant of tenantsToDelete) {
      console.log(`\n${YELLOW}Deleting tenant: ${tenant.name} (${tenant.id})${RESET}`);
      
      // Delete from all tables with tenant_id
      for (const table of tenantTables) {
        try {
          // Skip the custom_auth_tenant table initially - we'll handle it last
          if (table === 'custom_auth_tenant') continue;
          
          const result = await client.query(`
            DELETE FROM "${table}" WHERE tenant_id = $1
          `, [tenant.id]);
          
          console.log(`Deleted ${result.rowCount} rows from ${table}`);
        } catch (error) {
          console.error(`Error deleting from ${table}:`, error.message);
        }
      }
      
      // Finally delete from custom_auth_tenant
      try {
        const result = await client.query(`
          DELETE FROM custom_auth_tenant WHERE id = $1
        `, [tenant.id]);
        
        console.log(`Deleted tenant record from custom_auth_tenant`);
      } catch (error) {
        console.error(`Error deleting tenant record:`, error.message);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`\n${GREEN}Tenant deletion completed successfully!${RESET}`);
    
  } catch (error) {
    console.error(`\n${RED}Error during tenant deletion: ${error.message}${RESET}`);
    
    // Rollback transaction on error
    if (client) {
      try {
        await client.query('ROLLBACK');
        console.log(`Transaction rolled back due to error.`);
      } catch (rollbackError) {
        console.error(`Error during rollback: ${rollbackError.message}`);
      }
    }
  } finally {
    // Close the client connection
    if (client) {
      await client.end();
    }
    
    // Close readline interface
    rl.close();
  }
}); 