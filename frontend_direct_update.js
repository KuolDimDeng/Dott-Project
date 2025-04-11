#!/usr/bin/env node
/**
 * Direct Frontend File Updates
 * 
 * This script directly updates the specific files listed by the user
 * to replace schema_name with tenant_id for RLS implementation
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Base directory for the project
const BASE_DIR = '/Users/kuoldeng/projectx';
const BACKUP_DIR = path.join(BASE_DIR, 'frontend_file_backups');

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Parse command line arguments
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE_YES = process.argv.includes('--yes');

// Files to update (from the provided list)
const FILES_TO_UPDATE = [
  'frontend/pyfactor_next/src/app/api/customers/route.js',
  'frontend/pyfactor_next/src/app/api/db/create-aws-tables/route.js',
  'frontend/pyfactor_next/src/app/api/debug/system-status/route.js',
  'frontend/pyfactor_next/src/app/api/dev/fix-tenant-schema/route.js',
  'frontend/pyfactor_next/src/app/api/estimates/route.js',
  'frontend/pyfactor_next/src/app/api/invoices/route.js',
  'frontend/pyfactor_next/src/app/api/onboarding/subscription/route.js',
  'frontend/pyfactor_next/src/app/api/profile/route.js',
  'frontend/pyfactor_next/src/app/api/services/route.js',
  'frontend/pyfactor_next/src/app/api/tenant/check-tenant-records/route.js',
  'frontend/pyfactor_next/src/app/api/tenant/check-tenants/route.js',
  'frontend/pyfactor_next/src/app/api/tenant/create/route.js',
  'frontend/pyfactor_next/src/app/api/tenant/create-table/route.js',
  'frontend/pyfactor_next/src/app/api/tenant/create-tenant-record/route.js',
  'frontend/pyfactor_next/src/app/api/tenant/ensure-db-record/route.js',
  'frontend/pyfactor_next/src/app/api/tenant/fix-tenant-id/route.js',
  'frontend/pyfactor_next/src/app/api/tenant/getOrCreate/route.js',
  'frontend/pyfactor_next/src/app/api/tenant/init/route.js',
  'frontend/pyfactor_next/src/app/api/tenant/init-db-env/route.js',
  'frontend/pyfactor_next/src/app/api/tenant/sync-databases/route.js',
  'frontend/pyfactor_next/src/app/api/tenant/sync-tenant-id/route.js',
  'frontend/pyfactor_next/src/app/api/tenant/verify/route.js',
  'frontend/pyfactor_next/src/app/api/tenant/verify-schema/route.js',
  'frontend/pyfactor_next/src/app/dashboard/components/forms/EstimateManagement.js',
  'frontend/pyfactor_next/src/app/dashboard/components/forms/EstimateManagement.js.backup',
  'frontend/pyfactor_next/src/app/dashboard/components/forms/EstimateManagement.optimized.js',
  'frontend/pyfactor_next/src/app/dashboard/components/forms/InvoiceDetails.js',
  'frontend/pyfactor_next/src/app/debug/database/page.jsx',
  'frontend/pyfactor_next/src/app/debug/system-status/page.jsx',
  'frontend/pyfactor_next/src/utils/db/database.js',
];

// Common replacements for all files
const COMMON_REPLACEMENTS = [
  // Information schema queries for checking schema existence
  {
    pattern: /SELECT 1 FROM information_schema\.schemata WHERE schema_name = \$1/g,
    replacement: `-- RLS: No need to check tenant schema existence
    SELECT TRUE -- RLS handles tenant isolation now through policies`
  },
  // schema_name parameter in WHERE clauses
  {
    pattern: /WHERE schema_name = \$1/g,
    replacement: `WHERE id = $1 -- RLS: Using tenant_id instead of schema_name`
  },
  // SELECT schema_name FROM information_schema
  {
    pattern: /SELECT schema_name[\s\n]*FROM information_schema\.schemata[\s\n]*WHERE schema_name LIKE 'tenant_%'/g,
    replacement: `-- RLS: Get tenant IDs directly instead of looking up schemas
    SELECT id, name FROM custom_auth_tenant WHERE rls_enabled = TRUE`
  },
  // schema_name to tenant_id in tenant/check-tenant-records
  {
    pattern: /SELECT id, name, schema_name, owner_id, created_at/g,
    replacement: `SELECT id, name, owner_id, created_at -- RLS: Removed schema_name`
  },
  // schema references in results
  {
    pattern: /schemas: (?:schema|.+)Result\.rows\.map\(row => row\.schema_name\)/g,
    replacement: `tenants: schemasResult.rows.map(row => ({ id: row.id, name: row.name })) /* RLS: Using tenant records */`
  },
  // schema_name property in tenant creation
  {
    pattern: /schema_name: [`']?tenant_\${([^}]+)}\.replace\(\/-\/g, ['"]_['"]\)[`']?/g,
    replacement: `/* RLS: Using tenant_id with RLS instead of schema_name */
    rls_enabled: true,
    rls_setup_date: new Date()`
  },
  // Table creation with schema_name
  {
    pattern: /schema_name VARCHAR\((\d+)\)[\s\n]*(NOT NULL)?[\s\n]*(UNIQUE)?/g,
    replacement: `/* RLS: schema_name deprecated */
    schema_name VARCHAR($1) NULL -- Kept for backward compatibility, will be removed`
  },
  // schema_name in response data
  {
    pattern: /schema_name: ([a-zA-Z0-9_.'"`{}$]+)/g,
    replacement: `/* RLS: tenant_id instead of schema_name */
    tenant_id: tenant.id`
  },
  // Removing schema_name from SQL SELECT lists
  {
    pattern: /(SELECT .+), schema_name(, .+)/g,
    replacement: `$1$2 /* RLS: Removed schema_name */`
  },
  // Setting search path (crucial for RLS)
  {
    pattern: /SET search_path TO .+/g, 
    replacement: `-- RLS: Use tenant context instead of search path
    SET app.current_tenant_id = tenant_id`
  }
];

// Special replacements for EstimateManagement components
const ESTIMATE_REPLACEMENTS = [
  // Function signature
  {
    pattern: /fetchEstimates = useCallback\(async \(schema_name\) =>/g,
    replacement: `fetchEstimates = useCallback(async (tenant_id) => // RLS: Using tenant_id instead of schema_name`
  },
  // Parameter validation
  {
    pattern: /if \(!schema_name\) {[\s\S]*?schema_name = ['"]default_schema['"];[\s\S]*?}/g,
    replacement: `if (!tenant_id) {
      logger.warn('Missing tenant_id for fetchEstimates');
      // RLS middleware will handle default tenant
    }`
  },
  // API request parameters
  {
    pattern: /schema: schema_name/g,
    replacement: `tenant_id: tenant_id // RLS: Using tenant_id instead of schema_name`
  },
  // Response handling
  {
    pattern: /const schemaName = response\.data\.schema_name [|][|] ['"]default_schema['"]/g,
    replacement: `const tenantId = response.data.tenant_id // RLS: Using tenant_id instead of schema_name`
  }
];

// Function to check if a file exists
function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

// Create a backup of the file
function backupFile(filePath) {
  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `${fileName}.${timestamp}.bak`);
  
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`Backup created: ${backupPath}`);
    return true;
  } catch (err) {
    console.error(`Failed to create backup for ${filePath}: ${err.message}`);
    return false;
  }
}

// Process a single file
async function processFile(filePath) {
  console.log(`\nProcessing: ${filePath}`);
  
  // Verify file exists
  const fullPath = path.join(BASE_DIR, filePath);
  if (!fileExists(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    return false;
  }
  
  // Read file content
  let content;
  try {
    content = fs.readFileSync(fullPath, 'utf8');
  } catch (err) {
    console.error(`Error reading file: ${err.message}`);
    return false;
  }
  
  // Create backup if not dry run
  if (!DRY_RUN) {
    if (!backupFile(fullPath)) {
      if (!FORCE_YES) {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          rl.question('Failed to create backup. Continue anyway? (y/N): ', resolve);
        });
        
        rl.close();
        
        if (answer.toLowerCase() !== 'y') {
          console.log('Skipping file due to backup failure');
          return false;
        }
      }
    }
  }
  
  // Apply replacements
  let newContent = content;
  let modified = false;
  
  // Choose replacement set based on file path
  const replacements = 
    filePath.includes('EstimateManagement') 
      ? [...COMMON_REPLACEMENTS, ...ESTIMATE_REPLACEMENTS]
      : COMMON_REPLACEMENTS;
  
  // Apply all replacements
  for (const replacement of replacements) {
    if (replacement.pattern.test(newContent)) {
      newContent = newContent.replace(replacement.pattern, replacement.replacement);
      modified = true;
    }
  }
  
  // Write changes if modified and not dry run
  if (modified) {
    if (DRY_RUN) {
      console.log('Would update file (dry run)');
    } else {
      try {
        fs.writeFileSync(fullPath, newContent);
        console.log('Updated file successfully');
      } catch (err) {
        console.error(`Failed to write file: ${err.message}`);
        return false;
      }
    }
  } else {
    console.log('No changes needed for this file');
  }
  
  return modified;
}

// Process all files
async function processAllFiles() {
  console.log('Starting direct file updates for RLS migration');
  console.log(`Mode: ${DRY_RUN ? 'Dry Run (no changes will be made)' : 'Update'}`);
  
  let processed = 0;
  let modified = 0;
  let failed = 0;
  
  for (const file of FILES_TO_UPDATE) {
    processed++;
    const result = await processFile(file);
    
    if (result === true) {
      modified++;
    } else if (result === false) {
      failed++;
    }
  }
  
  console.log('\nSummary:');
  console.log(`Files processed: ${processed}`);
  console.log(`Files modified: ${modified}`);
  console.log(`Files failed: ${failed}`);
  
  if (DRY_RUN && modified > 0) {
    console.log('\nRun without --dry-run to apply these changes');
  }
}

// Main execution
processAllFiles().catch(err => {
  console.error('Error in process:', err);
  process.exit(1);
}); 