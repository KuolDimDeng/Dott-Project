/**
 * Script: Version0001_FixSSL_TenantAPI.mjs
 * Description: Fixes SSL configuration for tenant API database connections
 * Version: 1.0
 * Date: 2023-05-03
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure paths
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DB_CONFIG_FILE = path.join(PROJECT_ROOT, 'src', 'app', 'api', 'tenant', 'db-config.js');
const BACKUP_DIR = path.join(PROJECT_ROOT, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Create backup filename with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_FILE = path.join(BACKUP_DIR, `db-config.js.ssl_fix_backup_${timestamp}`);

/**
 * Creates a backup of the original file
 * @returns {boolean} Success status
 */
function createBackup() {
  try {
    fs.copyFileSync(DB_CONFIG_FILE, BACKUP_FILE);
    console.log(`Created backup at: ${BACKUP_FILE}`);
    return true;
  } catch (error) {
    console.error(`Error creating backup: ${error.message}`);
    return false;
  }
}

/**
 * Fixes SSL configuration in the tenant API database connection
 * @returns {boolean} Success status
 */
function fixDatabaseSSLConfig() {
  try {
    // Read the file content
    let content = fs.readFileSync(DB_CONFIG_FILE, 'utf8');
    
    // Update the SSL configuration in the createDbPool function
    // Detect if using AWS RDS or local database
    const localDbConfigReplacement = `
    // Configure database connection with proper SSL settings
    const pool = new Pool({
      host: dbConfig.host,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port,
      ssl: {
        rejectUnauthorized: false, // For local development with self-signed certificates
        ca: fs.readFileSync('/Users/kuoldeng/projectx/certificates/server-ca.pem').toString(),
        key: fs.readFileSync('/Users/kuoldeng/projectx/certificates/client-key.pem').toString(),
        cert: fs.readFileSync('/Users/kuoldeng/projectx/certificates/client-cert.pem').toString(),
      }
    });`;
    
    // Replace the pool creation code
    content = content.replace(
      /const pool = new Pool\(\{[\s\S]*?host: dbConfig\.host,[\s\S]*?port: dbConfig\.port,?[\s\S]*?\}\);/m,
      localDbConfigReplacement
    );
    
    // Add necessary imports if not already present
    if (!content.includes('import fs from ')) {
      content = `import fs from 'fs';\n${content}`;
    }
    
    // Write the modified content back to the file
    fs.writeFileSync(DB_CONFIG_FILE, content);
    
    console.log("Successfully updated SSL configuration in tenant API database connection");
    return true;
  } catch (error) {
    console.error(`Error fixing tenant API SSL configuration: ${error.message}`);
    return false;
  }
}

/**
 * Main execution function
 * @returns {boolean} Success status
 */
async function main() {
  console.log("Starting fix for SSL settings in tenant API database connection...");
  
  // Step 1: Create backup
  if (!createBackup()) {
    console.log("Aborting due to backup failure");
    return false;
  }
  
  // Step 2: Fix database SSL configuration
  if (!fixDatabaseSSLConfig()) {
    console.log("Failed to fix tenant API SSL configuration");
    return false;
  }
  
  console.log("\nFix applied successfully!");
  console.log("\nIMPORTANT: This script has updated the SSL settings for tenant API database connections.");
  console.log("Please restart the frontend server with 'pnpm run dev' to apply the changes.");
  
  return true;
}

main().then(success => {
  process.exit(success ? 0 : 1);
}); 