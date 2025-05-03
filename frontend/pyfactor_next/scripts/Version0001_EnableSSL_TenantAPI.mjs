/**
 * Script: Version0001_EnableSSL_TenantAPI.mjs
 * Description: Modifies the tenant API database connection to properly handle SSL connections
 * Version: 1.0
 * Date: 2023-05-03
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths configuration
const TARGET_FILES = [
  {
    path: path.resolve(__dirname, '../src/app/api/tenant/db-config.js'),
    description: 'Tenant API Database Configuration'
  },
  {
    path: path.resolve(__dirname, '../src/app/api/tenant/ensure-db-record/route.js'),
    description: 'Tenant API Ensure Database Record Route'
  },
  {
    path: path.resolve(__dirname, '../src/app/api/tenant/initialize-tenant/route.js'),
    description: 'Tenant API Initialize Tenant Route'
  }
];

const BACKUP_PATH = path.resolve(__dirname, 'backups');
const BACKUP_DATE = new Date().toISOString().replace(/:/g, '-');
const CERT_DIR = '/Users/kuoldeng/projectx/certificates'; // Use the existing certificates directory

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_PATH)) {
  fs.mkdirSync(BACKUP_PATH, { recursive: true });
  console.log(`Created backup directory: ${BACKUP_PATH}`);
}

// Function to create backup of files
function createBackups() {
  try {
    TARGET_FILES.forEach(file => {
      if (fs.existsSync(file.path)) {
        const fileName = path.basename(file.path);
        const backupFilePath = path.join(BACKUP_PATH, `${fileName}.ssl_backup_${BACKUP_DATE}`);
        
        // Read the original file content
        const fileContent = fs.readFileSync(file.path, 'utf8');
        
        // Write the backup file
        fs.writeFileSync(backupFilePath, fileContent);
        console.log(`Backup created for ${file.description}: ${backupFilePath}`);
      } else {
        console.log(`File not found: ${file.path}`);
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error creating backups:', error);
    return false;
  }
}

// Function to update the database configuration to handle SSL
function updateDbConfig() {
  try {
    const dbConfigPath = TARGET_FILES[0].path;
    if (fs.existsSync(dbConfigPath)) {
      let content = fs.readFileSync(dbConfigPath, 'utf8');
      
      // Check if we need to modify the file
      if (content.includes('ssl: false') || !content.includes('ssl:')) {
        // Update PostgreSQL pool configuration to enable SSL
        // Using the absolute path to the existing certificates
        const poolConfig = `
  // Create a new pool with the connection parameters
  const pool = new Pool({
    host,
    database,
    user,
    password,
    port,
    ssl: {
      rejectUnauthorized: false, // For self-signed certificates, set to true in production with proper certs
      ca: fs.readFileSync('${CERT_DIR}/server-ca.pem').toString(),
      key: fs.readFileSync('${CERT_DIR}/client-key.pem').toString(),
      cert: fs.readFileSync('${CERT_DIR}/client-cert.pem').toString(),
    },
    max: 5, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 10000, // How long to wait for a connection to become available
  });`;
        
        // Replace the existing pool configuration
        content = content.replace(/\/\/ Create a new pool[\s\S]+?}\);/, poolConfig);
        
        // Add fs and path imports if they don't exist
        if (!content.includes('import fs from ')) {
          content = content.replace('import { Pool } from', 'import fs from \'fs\';\nimport path from \'path\';\nimport { Pool } from');
        }
        
        // Write the updated content back to the file
        fs.writeFileSync(dbConfigPath, content);
        console.log(`Updated SSL configuration in: ${dbConfigPath}`);
      } else {
        console.log(`SSL already configured in: ${dbConfigPath}`);
      }
    } else {
      console.log(`File not found: ${dbConfigPath}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating DB config:', error);
    return false;
  }
}

// Function to check certificate files
function checkCertificateFiles() {
  try {
    const requiredFiles = ['server-ca.pem', 'client-cert.pem', 'client-key.pem'];
    const missingFiles = [];
    
    // Check if directory exists
    if (!fs.existsSync(CERT_DIR)) {
      console.error(`Certificate directory ${CERT_DIR} does not exist!`);
      return false;
    }
    
    // Check for each required file
    for (const file of requiredFiles) {
      const filePath = path.join(CERT_DIR, file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
      }
    }
    
    if (missingFiles.length > 0) {
      console.warn(`Warning: The following certificate files are missing in ${CERT_DIR}:`);
      for (const file of missingFiles) {
        console.warn(`  - ${file}`);
      }
      console.warn('Please make sure these files exist before restarting the server.');
    } else {
      console.log(`All required certificate files found in ${CERT_DIR}`);
    }
    
    return missingFiles.length === 0;
  } catch (error) {
    console.error('Error checking certificate files:', error);
    return false;
  }
}

// Main execution
(async function() {
  console.log('Starting script to enable SSL for tenant API database connections...');
  
  // Step 1: Create backups
  const backupsCreated = createBackups();
  if (!backupsCreated) {
    console.error('Failed to create backups. Aborting.');
    process.exit(1);
  }
  
  // Step 2: Check certificate files
  console.log(`Using certificates from: ${CERT_DIR}`);
  checkCertificateFiles();
  
  // Step 3: Update DB configuration
  const dbConfigUpdated = updateDbConfig();
  if (!dbConfigUpdated) {
    console.error('Failed to update database configuration. Aborting.');
    process.exit(1);
  }
  
  console.log('\nSSL configuration updated successfully!');
  console.log('\nIMPORTANT: Using certificate files from the following directory:');
  console.log(`  - ${CERT_DIR}`);
  console.log('\nRequired certificate files:');
  console.log(`  - ${path.join(CERT_DIR, 'server-ca.pem')}`);
  console.log(`  - ${path.join(CERT_DIR, 'client-cert.pem')}`);
  console.log(`  - ${path.join(CERT_DIR, 'client-key.pem')}`);
  console.log('\nAfter confirming all files are present, restart the frontend server with \'pnpm run dev\'');
  
  console.log('\nScript completed successfully!');
  console.log('Don\'t forget to update the script_registry.md to mark this script as "Executed"');
})(); 