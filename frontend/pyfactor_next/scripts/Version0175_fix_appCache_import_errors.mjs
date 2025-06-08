#!/usr/bin/env node

/**
 * Version 0175: Fix AppCache Import Errors
 * 
 * This script addresses the specific appCache errors identified in the Vercel build logs:
 * 1. SignInForm.js: Duplicate appCache imports
 * 2. DashboardClient.js: Incorrect import path
 * 3. DashAppBar.js: Duplicate appCache imports
 * 4. DashboardLoader.js: Invalid assignment to appCache.get()
 * 5. auth.js: 'use client' directive not at top of file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Create backup of file before modifying
function createBackup(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.backup_${new Date().toISOString().replace(/:/g, '').split('.')[0]}`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Created backup: ${backupPath}`);
  }
}

// Fix SignInForm.js - Remove duplicate imports
function fixSignInForm() {
  console.log('🔧 Fixing SignInForm.js...');
  const filePath = path.join(projectRoot, 'src/app/auth/components/SignInForm.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Ensure 'use client' is at the top
  content = content.replace(/'use client';?/g, '');
  content = "'use client';\n\n" + content;
  
  // Remove duplicate imports - keep only one import for appCache
  if (content.includes("import { appCache } from '../utils/appCache';") && 
      content.includes("import appCache from '../utils/appCache';")) {
    content = content.replace("import { appCache } from '../utils/appCache';", "");
  }
  
  // Fix any amplify import that might be causing issues
  content = content.replace(
    /import \{ signInWithConfig as amplifySignIn, signInWithRedirect, directOAuthSignIn, signIn \} from ['"]config\/amplifyUnified['"];/g,
    "import { signInWithConfig as amplifySignIn, signInWithRedirect, directOAuthSignIn, signIn } from '../../config/amplifyUnified';"
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed SignInForm.js`);
}

// Fix DashboardClient.js - Fix import path
function fixDashboardClient() {
  console.log('🔧 Fixing DashboardClient.js...');
  const filePath = path.join(projectRoot, 'src/app/dashboard/DashboardClient.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Ensure 'use client' is at the top
  content = content.replace(/'use client';?/g, '');
  content = "'use client';\n\n" + content;
  
  // Fix import path - make sure it points to the correct location
  content = content.replace(
    /import appCache from ['"]\.\.\/utils\/appCache['"];/g,
    "import appCache from '../../utils/appCache';"
  );
  
  content = content.replace(
    /import appCache from ['"]\.\.\/\.\.\/utils\/appCache['"];/g,
    "import appCache from '../../utils/appCache';"
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed DashboardClient.js`);
}

// Fix DashAppBar.js - Fix duplicate imports
function fixDashAppBar() {
  console.log('🔧 Fixing DashAppBar.js...');
  const filePath = path.join(projectRoot, 'src/app/dashboard/components/DashAppBar.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Ensure 'use client' is at the top
  content = content.replace(/'use client';?/g, '');
  content = "'use client';\n\n" + content;
  
  // Fix duplicate imports
  if (content.includes("import { appCache } from '../../../utils/appCache';") && 
      content.includes("import appCache from '../../../utils/appCache';")) {
    content = content.replace("import { appCache } from '../../../utils/appCache';", "");
  }
  
  // Make sure we have the correct import path
  content = content.replace(
    /import appCache from ['"]\.\.\/utils\/appCache['"];/g,
    "import appCache from '../../../utils/appCache';"
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed DashAppBar.js`);
}

// Fix DashboardLoader.js - Fix invalid assignments
function fixDashboardLoader() {
  console.log('🔧 Fixing DashboardLoader.js...');
  const filePath = path.join(projectRoot, 'src/components/DashboardLoader.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix invalid assignment to appCache.get()
  content = content.replace(
    /appCache\.get\('tenant\.id'\)\s*=\s*tenantIdMeta;/g,
    "appCache.set('tenant.id', tenantIdMeta);"
  );
  
  content = content.replace(
    /appCache\.get\('tenant\.id'\)\s*=\s*tenantId;/g,
    "appCache.set('tenant.id', tenantId);"
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed DashboardLoader.js`);
}

// Fix auth.js - Move 'use client' to top
function fixAuthJs() {
  console.log('🔧 Fixing auth.js...');
  const filePath = path.join(projectRoot, 'src/hooks/auth.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Move 'use client' to top of file
  content = content.replace(/'use client';?/g, '');
  content = "'use client';\n\n" + content;
  
  // Remove duplicate imports
  if (content.includes("import appCache from '../utils/appCache';") && 
      content.includes("import { appCache } from '../utils/appCache';")) {
    content = content.replace("import { appCache } from '../utils/appCache';", "");
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed auth.js`);
}

// Run all fixes
async function runFixes() {
  // Fix each file
  fixSignInForm();
  fixDashboardClient();
  fixDashAppBar();
  fixDashboardLoader();
  fixAuthJs();
  
  console.log('\n✅ All appCache import errors fixed!');
}

// Execute
runFixes().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
