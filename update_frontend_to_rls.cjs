#!/usr/bin/env node
/**
 * Frontend Code Migration: schema_name to tenant_id with RLS
 * 
 * This script updates Next.js code to use tenant_id with RLS instead of schema_name
 * It processes .js, .jsx, and .ts files in the frontend directory
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const FRONTEND_DIR = path.resolve(__dirname, 'frontend/pyfactor_next');
const BACKUP_DIR = path.resolve(__dirname, 'frontend_schema_backups');
const DRY_RUN = process.argv.includes('--dry-run');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Patterns to replace
const REPLACEMENTS = [
  // Information schema queries
  {
    pattern: /SELECT 1 FROM information_schema\.schemata WHERE schema_name = \$1/g,
    replacement: `-- RLS: No need to check tenant schema existence
      SELECT TRUE -- RLS handles tenant isolation`,
  },
  // Database schema queries
  {
    pattern: /SELECT schema_name[\s\n]*FROM information_schema\.schemata[\s\n]*WHERE schema_name LIKE 'tenant_%'/g,
    replacement: `-- RLS: Use tenant_id directly instead of schemas
      SELECT id AS tenant_id FROM custom_auth_tenant WHERE rls_enabled = TRUE`,
  },
  // Schema name in tenant creation
  {
    pattern: /schema_name: [`']?tenant_\${([^}]+)}\.replace\(\/-\/g, '_'\)[`']?/g,
    replacement: `/* RLS: No schema_name needed */
      rls_enabled: true`,
  },
  // Schema name in SQL queries
  {
    pattern: /schema_name VARCHAR\((\d+)\)[\s\n]*(NOT NULL)?[\s\n]*(UNIQUE)?/g,
    replacement: `/* RLS: schema_name deprecated, will be removed */
      schema_name VARCHAR($1) NULL /* deprecated */`,
  },
  // Schema references in table creation indexes
  {
    pattern: /CREATE INDEX IF NOT EXISTS idx_tenant_schema_name ON public\.custom_auth_tenant\(schema_name\);/g,
    replacement: `/* RLS: No need for schema_name index */
      -- CREATE INDEX IF NOT EXISTS idx_tenant_schema_name ON public.custom_auth_tenant(schema_name);`,
  },
  // Schema name for tenant routing
  {
    pattern: /schema_name: ['"]?([a-zA-Z0-9_]+)['"]?/g,
    replacement: `/* RLS: using tenant_id */ 
      tenant_id: tenant.id`,
  },
  // Schema in API requests
  {
    pattern: /schema: schema_name/g,
    replacement: `tenant_id: tenant.id /* RLS: using tenant_id for isolation */`,
  },
  // Database context setting
  {
    pattern: /WHERE schema_name = \$1/g,
    replacement: `/* RLS: using tenant_id */ WHERE id = $1`,
  },
  // Search paths (most important for RLS)
  {
    pattern: /SET search_path TO/g,
    replacement: `/* RLS: No need to set search_path with RLS */
      -- SET app.current_tenant_id using the next line instead
      SET app.current_tenant_id TO`,
  }
];

// Function to process a single file
function processFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  // Skip files that aren't JS/TS
  if (!['.js', '.jsx', '.ts', '.tsx'].includes(path.extname(filePath))) {
    return false;
  }
  
  // Read file content
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`Error reading file ${filePath}: ${err.message}`);
    return false;
  }
  
  // Create backup
  const relativePath = path.relative(FRONTEND_DIR, filePath);
  const backupPath = path.join(BACKUP_DIR, relativePath);
  
  if (!DRY_RUN) {
    try {
      // Ensure directory exists
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Write backup
      fs.writeFileSync(backupPath, content);
    } catch (err) {
      console.error(`Error creating backup for ${filePath}: ${err.message}`);
      return false;
    }
  }
  
  // Apply replacements
  let modified = false;
  let newContent = content;
  
  for (const replacement of REPLACEMENTS) {
    const { pattern, replacement: replacementText } = replacement;
    
    // Check if pattern exists in content
    if (pattern.test(newContent)) {
      modified = true;
      newContent = newContent.replace(pattern, replacementText);
    }
  }
  
  // Update file if modified and not dry run
  if (modified && !DRY_RUN) {
    try {
      fs.writeFileSync(filePath, newContent);
      console.log(`Updated: ${filePath}`);
    } catch (err) {
      console.error(`Error writing file ${filePath}: ${err.message}`);
      return false;
    }
  } else if (modified) {
    console.log(`Would update (dry run): ${filePath}`);
  }
  
  return modified;
}

// Function to walk directory and process files
function processDirectory(dir) {
  let filesProcessed = 0;
  let filesModified = 0;
  
  // Walk through directory recursively
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      // Skip node_modules and .git
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        filesProcessed++;
        if (processFile(fullPath)) {
          filesModified++;
        }
      }
    }
  }
  
  console.log(`Processing directory: ${dir}`);
  console.log(`Mode: ${DRY_RUN ? 'Dry Run (no changes made)' : 'Update Mode'}`);
  
  walk(dir);
  
  console.log(`\nSummary:`);
  console.log(`- Files processed: ${filesProcessed}`);
  console.log(`- Files to be modified: ${filesModified}`);
  
  if (DRY_RUN && filesModified > 0) {
    console.log(`\nRun without --dry-run to apply these changes`);
  }
}

// Special handler for EstimateManagement components
function fixEstimateManagementComponents() {
  const filePaths = [
    path.join(FRONTEND_DIR, 'src/app/dashboard/components/forms/EstimateManagement.js'),
    path.join(FRONTEND_DIR, 'src/app/dashboard/components/forms/EstimateManagement.js.backup'),
    path.join(FRONTEND_DIR, 'src/app/dashboard/components/forms/EstimateManagement.optimized.js'),
  ];
  
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) continue;
    
    console.log(`Special handling for: ${filePath}`);
    
    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Create backup
    const relativePath = path.relative(FRONTEND_DIR, filePath);
    const backupPath = path.join(BACKUP_DIR, relativePath);
    
    if (!DRY_RUN) {
      // Ensure directory exists
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Write backup
      fs.writeFileSync(backupPath, content);
    }
    
    // Update function signature from schema_name to tenant_id
    content = content.replace(
      /fetchEstimates = useCallback\(async \(schema_name\) => {/g, 
      `fetchEstimates = useCallback(async (tenant_id) => {
      // RLS: Changed from schema_name to tenant_id`
    );
    
    // Update validation logic
    content = content.replace(
      /if \(!schema_name\) {[\s\S]*?schema_name = ['"]default_schema['"];/g,
      `if (!tenant_id) {
        logger.warn('Missing tenant_id for fetchEstimates, using default');
        // Default tenant will be handled by RLS middleware
        tenant_id = null;`
    );
    
    // Update API calls
    content = content.replace(
      /schema: schema_name/g,
      `tenant_id: tenant_id`
    );
    
    // Update response handling
    content = content.replace(
      /const schemaName = response\.data\.schema_name [|][|] ['"]default_schema['"]/g,
      `const tenantId = response.data.tenant_id // RLS: Updated from schema_name`
    );
    
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated special file: ${filePath}`);
    } else {
      console.log(`Would update special file (dry run): ${filePath}`);
    }
  }
}

// Main execution
try {
  // Check if frontend directory exists
  if (!fs.existsSync(FRONTEND_DIR)) {
    console.error(`Frontend directory not found: ${FRONTEND_DIR}`);
    process.exit(1);
  }
  
  console.log('Starting frontend code migration from schema_name to tenant_id (RLS)...');
  
  // Process frontend directory
  processDirectory(FRONTEND_DIR);
  
  // Special handling for EstimateManagement components
  fixEstimateManagementComponents();
  
  console.log('\nMigration complete!');
  if (!DRY_RUN) {
    console.log(`Backups stored in: ${BACKUP_DIR}`);
  }
  
} catch (error) {
  console.error('Error during migration:', error);
  process.exit(1);
} 