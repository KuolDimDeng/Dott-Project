/**
 * Version0051_fix_db_ssl_connection.mjs
 * 
 * This script fixes the PostgreSQL SSL connection issue by making SSL optional
 * for localhost connections while maintaining SSL for non-localhost connections.
 * 
 * Changes:
 * 1. Modifies the getDbConfig function in db-config.js to make SSL optional for localhost
 * 2. Adds conditional SSL configuration based on the host being connected to
 * 3. Creates a backup of the original file before making changes
 *
 * Version: 1.0.0
 * Created: 2025-05-03
 * Author: Claude
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define file paths
const dbConfigPath = path.join(__dirname, '../src/app/api/tenant/db-config.js');

// Define backup paths
const backupDir = path.join(__dirname, 'backups');
const timestamp = new Date().toISOString().replace(/:/g, '-');
const dbConfigBackupPath = path.join(backupDir, `db-config.js.backup-${timestamp}`);

// Create the backup directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Function to create a backup of the file
function backupFile(sourcePath, backupPath) {
  try {
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, backupPath);
      console.log(`✅ Backup created at ${backupPath}`);
      return true;
    } else {
      console.log(`❌ Source file not found: ${sourcePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to create backup: ${error.message}`);
    return false;
  }
}

// Function to update the script registry
function updateScriptRegistry(scriptName, description, status) {
  const registryPath = path.join(__dirname, 'script_registry.md');
  const timestamp = new Date().toISOString();
  
  let registryContent = '';
  
  try {
    if (fs.existsSync(registryPath)) {
      registryContent = fs.readFileSync(registryPath, 'utf8');
    } else {
      registryContent = '# Script Registry\n\n| Script Name | Description | Status | Timestamp |\n| ----------- | ----------- | ------ | --------- |\n';
    }
    
    // Add new entry to registry
    const newEntry = `| ${scriptName} | ${description} | ${status} | ${timestamp} |\n`;
    
    // Check if the entry already exists
    if (!registryContent.includes(scriptName)) {
      registryContent += newEntry;
    } else {
      // Update existing entry
      const lines = registryContent.split('\n');
      const updatedLines = lines.map(line => {
        if (line.includes(scriptName)) {
          return newEntry.trim();
        }
        return line;
      });
      registryContent = updatedLines.join('\n');
    }
    
    fs.writeFileSync(registryPath, registryContent);
    console.log(`✅ Script registry updated at ${registryPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to update script registry: ${error.message}`);
    return false;
  }
}

// Main function to fix the PostgreSQL SSL connection issue
async function fixDbSslConnection() {
  try {
    // Create a backup of the db-config.js file
    if (!backupFile(dbConfigPath, dbConfigBackupPath)) {
      console.error('❌ Aborting script execution due to backup failure');
      return;
    }
    
    // Read the current content of db-config.js
    let dbConfigContent = fs.readFileSync(dbConfigPath, 'utf8');
    
    // Modify the getDbConfig function to make SSL optional for localhost
    const oldConfigFunction = /export function getDbConfig\(\) \{[\s\S]+?return config;\s*\}/;
    const newConfigFunction = `export function getDbConfig() {
  console.log('Using AWS RDS database connection');
  
  // Base configuration using environment variables with fallbacks for AWS RDS
  const config = {
    user: process.env.RDS_USERNAME || process.env.DB_USER || process.env.DJANGO_DB_USER || 'dott_admin',
    password: process.env.RDS_PASSWORD || process.env.DB_PASSWORD || process.env.DJANGO_DB_PASSWORD || 'RRfXU6uPPUbBEg1JqGTJ',
    host: process.env.RDS_HOSTNAME || process.env.DB_HOST || process.env.DJANGO_DB_HOST || 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
    port: parseInt(process.env.RDS_PORT || process.env.DB_PORT || process.env.DJANGO_DB_PORT || DB_DEFAULTS.port, 10),
    database: process.env.RDS_DB_NAME || process.env.DB_NAME || process.env.DJANGO_DB_NAME || 'dott_main',
    // Connection settings
    connectionTimeoutMillis: DB_DEFAULTS.connectionTimeoutMillis,
    statement_timeout: DB_DEFAULTS.statement_timeout,
    max: DB_DEFAULTS.max,
    idleTimeoutMillis: DB_DEFAULTS.idleTimeoutMillis
  };
  
  // Log connection details (without password)
  console.log('AWS RDS connection details:', { 
    host: config.host, 
    database: config.database, 
    user: config.user,
    port: config.port
  });
  
  // Check if the host is localhost or 127.0.0.1
  const isLocalhost = config.host === 'localhost' || config.host === '127.0.0.1';
  
  // Determine SSL configuration based on the host
  // 1. If DB_USE_SSL is explicitly set to 'false', disable SSL
  // 2. If connecting to localhost, don't use SSL unless explicitly enabled
  // 3. Otherwise, enable SSL with rejectUnauthorized: false for AWS RDS
  const useSSL = process.env.DB_USE_SSL === 'false' ? false : 
                (isLocalhost ? process.env.DB_USE_SSL === 'true' : true);
  
  if (useSSL) {
    console.log('SSL enabled for database connection');
    config.ssl = {
      rejectUnauthorized: false // Allow self-signed certs for AWS RDS
    };
  } else {
    console.log('SSL disabled for database connection');
    // Don't set ssl property to ensure it's not used
  }
  
  return config;
}`;
    
    // Replace the getDbConfig function with the new version
    dbConfigContent = dbConfigContent.replace(oldConfigFunction, newConfigFunction);
    
    // Write the updated content back to the file
    fs.writeFileSync(dbConfigPath, dbConfigContent);
    console.log('✅ Updated db-config.js to make SSL optional for localhost connections');
    
    // Update script registry
    updateScriptRegistry(
      'Version0051_fix_db_ssl_connection.mjs',
      'Fixes PostgreSQL SSL connection issue by making SSL optional for localhost connections',
      'EXECUTED'
    );
    
    console.log('\n✅ Script execution completed successfully!');
    
    // Reminder for additional steps
    console.log('\n⚠️  IMPORTANT: You will need to:');
    console.log('1. Restart your Next.js server to apply the changes');
    console.log('2. If you still encounter SSL issues, set DB_USE_SSL=false in your .env or .env.local file');
    console.log('3. For production environments, always use SSL with properly configured certificates');
    
  } catch (error) {
    console.error(`❌ Error fixing database SSL connection: ${error.message}`);
    // Try to restore from backup if there was an error
    try {
      if (fs.existsSync(dbConfigBackupPath)) {
        fs.copyFileSync(dbConfigBackupPath, dbConfigPath);
        console.log('✅ Restored db-config.js from backup');
      }
    } catch (restoreError) {
      console.error(`❌ Failed to restore backup: ${restoreError.message}`);
    }
    
    // Update script registry with failure
    updateScriptRegistry(
      'Version0051_fix_db_ssl_connection.mjs',
      'Attempt to fix PostgreSQL SSL connection issue',
      'FAILED'
    );
  }
}

// Execute the function
fixDbSslConnection()
  .then(() => {
    console.log('Script execution complete');
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 