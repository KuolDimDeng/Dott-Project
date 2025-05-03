/**
 * Script: Version0005_fix_cors_employee_api_business_id.mjs
 * 
 * Description:
 * This script fixes CORS issues with the X-Business-ID header when accessing the HR API endpoints.
 * The frontend is experiencing CORS errors because of the header format and backend CORS configuration.
 * 
 * Changes made:
 * - Update axiosConfig.js to ensure X-Business-ID header is properly configured
 * - Ensure consistent header casing to match backend expectations
 * - Fix the CORS preflight handling in axios interceptors
 * 
 * Version: 1.0
 * Date: 2025-04-23
 * Issue: hr-api-connection-20250423
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { promises as fsPromises } from 'fs';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target files
const axiosConfigFile = path.join(process.cwd(), 'frontend/pyfactor_next/src/lib/axiosConfig.js');
const apiClientFile = path.join(process.cwd(), 'frontend/pyfactor_next/src/utils/apiClient.js');
const employeeApiFile = path.join(process.cwd(), 'frontend/pyfactor_next/src/services/hrService.js');
const backupDir = path.join(process.cwd(), 'scripts/backups/business_id_fix_' + Date.now());
const registryFile = path.join(process.cwd(), 'scripts/script_registry.md');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Logging helpers
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}=== ${msg} ===${colors.reset}\n`)
};

async function updateScriptRegistry() {
  try {
    let registry = '';
    
    if (fs.existsSync(registryFile)) {
      registry = await fsPromises.readFile(registryFile, 'utf8');
    }
    
    const today = new Date().toISOString().split('T')[0];
    const entry = `
| Version0005_fix_cors_employee_api_business_id.mjs | ${today} | Completed | Fixed X-Business-ID header handling for HR API requests |
`;
    
    if (!registry.includes('Version0005_fix_cors_employee_api_business_id.mjs')) {
      if (!registry.includes('| Script | Date | Status | Description |')) {
        registry = `# Script Registry

| Script | Date | Status | Description |
|--------|------|--------|-------------|${entry}`;
      } else {
        registry += entry;
      }
      
      await fsPromises.writeFile(registryFile, registry, 'utf8');
      log.success('Script registry updated successfully.');
    }
  } catch (error) {
    log.error('Error updating script registry:', error);
  }
}

async function createBackup(filePath, fileName) {
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      await fsPromises.mkdir(backupDir, { recursive: true });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      log.warn(`File not found: ${filePath}`);
      return null;
    }
    
    // Read the target file
    const fileContent = await fsPromises.readFile(filePath, 'utf8');
    
    // Write the backup file
    const backupFile = path.join(backupDir, fileName + '.backup_' + new Date().toISOString().replace(/[:.]/g, '-'));
    await fsPromises.writeFile(backupFile, fileContent, 'utf8');
    
    log.success(`Backup created successfully at ${backupFile}`);
    return fileContent;
  } catch (error) {
    log.error(`Error creating backup for ${fileName}:`, error);
    throw error;
  }
}

async function fixAxiosConfig(content) {
  if (!content) return null;
  
  log.info('Updating backendHrApiInstance in axiosConfig.js...');
  
  // Fix 1: Update headers in backendHrApiInstance creation
  let updatedContent = content.replace(
    /(const backendHrApiInstance = axios\.create\(\{[\s\S]*?headers:\s*\{[\s\S]*?)(\}[\s\S]*?\}\);)/,
    (match, before, after) => {
      // Check if x-business-id is already in the headers
      if (before.includes('X-Business-ID') || before.includes('x-business-id')) {
        log.info('X-Business-ID header already exists in axios instance, updating format...');
      } else {
        log.info('Adding X-Business-ID header to axios instance...');
      }
      
      // Create a properly formatted headers block with all necessary headers
      const updatedHeaders = `
    'Content-Type': 'application/json',
    // Standard CORS headers with correct business ID header
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Tenant-ID, X-Business-ID, X-Schema-Name'
  `;
      
      return before.replace(/('Content-Type':[^\n]*(\n|.)*?)(\})/m, updatedHeaders) + after;
    }
  );
  
  // Fix 2: Update the request interceptor to handle business ID correctly
  updatedContent = updatedContent.replace(
    /(backendHrApiInstance\.interceptors\.request\.use\(async \(config\) => \{[\s\S]*?)(config\.headers\['X-Tenant-ID'\] = tenantId;[\s\S]*?)(return config;[\s\S]*?\}\);)/,
    (match, before, middle, after) => {
      // Check if middle part already sets the business ID header
      if (middle.includes('X-Business-ID') || middle.includes('x-business-id')) {
        log.info('Business ID header assignment already exists, updating format...');
        // Replace existing business ID header assignment
        middle = middle.replace(
          /(config\.headers\['[xX]-[bB]usiness-[iI][dD]'\][\s\S]*?=[\s\S]*?;)/g,
          `// Set business ID header (same as tenant ID for backwards compatibility)
      config.headers['X-Business-ID'] = tenantId;`
        );
      } else {
        log.info('Adding business ID header assignment...');
        // Add business ID header assignment after tenant ID
        middle = middle + `
      
      // Set business ID header (same as tenant ID for backwards compatibility)
      config.headers['X-Business-ID'] = tenantId;`;
      }
      
      return before + middle + after;
    }
  );
  
  // Fix 3: Update the response interceptor to handle CORS errors better
  if (!updatedContent.includes('isCorsError')) {
    log.info('Updating response interceptor for better CORS error handling...');
    updatedContent = updatedContent.replace(
      /(\/\/ Check specifically for CORS errors[\s\S]*?error\.message\.includes\('cross-origin'\)[\s\S]*?\)\) \{[\s\S]*?)(\s*\/\/ Add specific CORS)/,
      '$1\n        // Check specifically for business ID header issues\n        if (error.config?.headers && (\n            error.config.headers[\'X-Business-ID\'] ||\n            error.config.headers[\'x-business-id\']\n        )) {\n          logger.warn(\'[AxiosConfig] Request contains business ID header which might be causing CORS issues\');\n        }$2'
    );
  }
  
  return updatedContent;
}

async function fixApiClient(content) {
  if (!content) return null;
  
  log.info('Updating employee API calls in apiClient.js...');
  
  // Fix client-side API calls to include X-Business-ID header
  let updatedContent = content;
  
  // Look for getEmployees or similar HR API functions
  if (content.includes('getEmployees') || content.includes('/employees')) {
    // Check if the function already includes X-Business-ID header
    if (!content.includes('X-Business-ID') && !content.includes('x-business-id')) {
      log.info('Adding X-Business-ID header to HR API calls...');
      
      // Find the headers part of the HR API call
      updatedContent = content.replace(
        /(headers\s*:\s*\{[\s\S]*?['"]X-Tenant-ID['"]\s*:\s*[^,}]*)/g,
        '$1,\n        \'X-Business-ID\': tenantId'
      );
    } else {
      log.info('X-Business-ID header already exists in HR API calls, ensuring correct format...');
      // Fix existing X-Business-ID header
      updatedContent = content.replace(
        /(headers\s*:\s*\{[\s\S]*?)(['"]x-business-id['"]|['"]X-Business-ID['"])\s*:\s*([^,}]*)/gi,
        '$1\'X-Business-ID\': tenantId'
      );
    }
  }
  
  return updatedContent;
}

async function fixFile(filePath, fileName, fixFunction) {
  try {
    // Create backup
    const fileContent = await createBackup(filePath, fileName);
    if (!fileContent) {
      log.warn(`Skipping ${fileName} as file could not be read`);
      return false;
    }
    
    // Fix the file
    const updatedContent = await fixFunction(fileContent);
    if (!updatedContent) {
      log.warn(`No changes made to ${fileName}`);
      return false;
    }
    
    // Write the changes
    await fsPromises.writeFile(filePath, updatedContent, 'utf8');
    log.success(`Updated ${fileName} successfully`);
    return true;
  } catch (error) {
    log.error(`Error fixing ${fileName}:`, error);
    return false;
  }
}

async function runScript() {
  log.header('HR API X-Business-ID Header Fix');
  
  // Fix axiosConfig.js
  const axiosConfigFixed = await fixFile(axiosConfigFile, 'axiosConfig.js', fixAxiosConfig);
  
  // Fix apiClient.js
  const apiClientFixed = await fixFile(apiClientFile, 'apiClient.js', fixApiClient);
  
  if (axiosConfigFixed || apiClientFixed) {
    log.success('Successfully updated X-Business-ID header handling!');
    await updateScriptRegistry();
    
    log.info('\nPlease restart your frontend development server:');
    log.info('cd frontend/pyfactor_next');
    log.info('pnpm run dev:https');
  } else {
    log.warn('No changes were made. Files may already have the required configurations.');
  }
}

// Run the script
runScript().catch(error => {
  log.error('Unhandled error in script execution:', error);
  process.exit(1);
}); 