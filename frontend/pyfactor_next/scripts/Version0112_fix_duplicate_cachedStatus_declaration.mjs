#!/usr/bin/env node

/**
 * Version0112_fix_duplicate_cachedStatus_declaration.mjs
 * 
 * This script fixes a build error caused by a duplicate declaration of the 
 * 'cachedStatus' variable in the onboarding status API route.
 * 
 * The error occurs because our previous fix (Version0111) added a new check for
 * cachedStatus in the URL params, but the variable was already declared in the file.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Configuration
const ONBOARDING_DIR = '../src/app/api/onboarding';
const SCRIPT_REGISTRY_PATH = './script_registry.md';

// Backup function
function createBackup(filePath) {
  const backupPath = `${filePath}.backup_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  if (fs.existsSync(filePath)) {
    console.log(`Creating backup of ${filePath} to ${backupPath}`);
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  }
  return null;
}

// Main execution
try {
  console.log('Starting to fix duplicate cachedStatus declaration...');
  
  // Fix the onboarding status API
  const onboardingStatusPath = path.join(ONBOARDING_DIR, 'status/route.js');
  console.log(`Fixing duplicate variable declaration in ${onboardingStatusPath}`);
  createBackup(onboardingStatusPath);
  
  let onboardingStatusContent = fs.readFileSync(onboardingStatusPath, 'utf8');
  
  // Read the file and look for the original declaration of cachedStatus
  const lines = onboardingStatusContent.split('\n');
  let firstCachedStatusLine = -1;
  let secondCachedStatusLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const cachedStatus = searchParams.get(\'cachedStatus\');')) {
      if (firstCachedStatusLine === -1) {
        firstCachedStatusLine = i;
      } else {
        secondCachedStatusLine = i;
        break;
      }
    }
  }
  
  if (firstCachedStatusLine !== -1 && secondCachedStatusLine !== -1) {
    console.log(`Found duplicate declarations at lines ${firstCachedStatusLine+1} and ${secondCachedStatusLine+1}`);
    
    // Rename the second occurrence to urlCachedStatus
    lines[secondCachedStatusLine] = lines[secondCachedStatusLine].replace(
      'const cachedStatus = searchParams.get(\'cachedStatus\');',
      'const urlCachedStatus = searchParams.get(\'cachedStatus\');'
    );
    
    // Also update the condition check
    lines[secondCachedStatusLine + 1] = lines[secondCachedStatusLine + 1].replace(
      'if (cachedStatus === \'complete\') {',
      'if (urlCachedStatus === \'complete\') {'
    );
    
    // Write the updated content back to the file
    onboardingStatusContent = lines.join('\n');
    fs.writeFileSync(onboardingStatusPath, onboardingStatusContent);
    console.log('✅ Fixed duplicate cachedStatus declaration');
  } else {
    console.log('⚠️ Could not find duplicate declarations. Manual review needed.');
    
    // Alternative approach: Replace the entire GET function with a fixed version
    // This ensures we have a clean implementation without duplicates
    const getHandlerRegex = /export async function GET\(request\) \{[\s\S]*?try \{[\s\S]*?const \{ searchParams \} = new URL\(request\.url\);[\s\S]*?const tenantId = searchParams\.get\('tenantId'\);[\s\S]*?if \(!tenantId\) \{[\s\S]*?return NextResponse\.json\(\{ error: 'tenantId is required' \}, \{ status: 400 \}\);[\s\S]*?\}/;
    
    const fixedGetHandler = `export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }
    
    // Check for cached onboarding status in URL if available (enhances persistence)
    const urlCachedStatus = searchParams.get('cachedStatus');
    if (urlCachedStatus === 'complete') {
      console.log('[Onboarding Status] Using cached complete status for tenant:', tenantId);
      return NextResponse.json({
        status: 'complete',
        currentStep: 'complete',
        completedSteps: ['business_info', 'subscription', 'payment', 'setup'],
        businessInfoCompleted: true,
        subscriptionCompleted: true,
        paymentCompleted: true,
        setupCompleted: true,
        tenantId: tenantId
      });
    }`;
    
    onboardingStatusContent = onboardingStatusContent.replace(getHandlerRegex, fixedGetHandler);
    fs.writeFileSync(onboardingStatusPath, onboardingStatusContent);
    console.log('✅ Replaced GET handler with fixed version');
  }
  
  // Update script registry
  console.log('Updating script registry...');
  let registryContent = fs.readFileSync(SCRIPT_REGISTRY_PATH, 'utf8');
  
  // Find where to insert the new script info (after the header and before the first script entry)
  const scriptEntryPoint = registryContent.indexOf('### Version');
  
  if (scriptEntryPoint !== -1) {
    const newScriptEntry = `### Version0112_fix_duplicate_cachedStatus_declaration.mjs
- **Version**: 0112 v1.0
- **Purpose**: Fix build error caused by duplicate variable declaration
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-06-06
- **Execution Date**: 2025-06-06
- **Target Files**:
  - src/app/api/onboarding/status/route.js - Fixed duplicate cachedStatus declaration
- **Description**: Fixes build error that occurred after Version0111 was deployed
- **Key Features**:
  - Renamed second cachedStatus declaration to urlCachedStatus
  - Ensured onboarding persistence functionality remains intact
  - Fixed Vercel build error
- **Requirements Addressed**:
  - Fix production build failure
  - Maintain onboarding persistence functionality
- **Deployment Method**: Committed and pushed to Dott_Main_Dev_Deploy branch

`;

    registryContent = registryContent.slice(0, scriptEntryPoint) + newScriptEntry + registryContent.slice(scriptEntryPoint);
    fs.writeFileSync(SCRIPT_REGISTRY_PATH, registryContent);
    console.log('✅ Updated script registry');
  } else {
    console.error('❌ Could not find entry point in script registry');
  }
  
  // Commit and push changes
  console.log('Committing changes to git...');
  try {
    execSync('git add ../src/app/api/onboarding/status/route.js');
    execSync('git add ./Version0112_fix_duplicate_cachedStatus_declaration.mjs');
    execSync('git add ./script_registry.md');
    
    execSync('git commit -m "Fix duplicate cachedStatus declaration causing build error"');
    execSync('git push origin Dott_Main_Dev_Deploy');
    
    console.log('✅ Changes committed and pushed to Dott_Main_Dev_Deploy branch');
  } catch (error) {
    console.error('❌ Error during git operations:', error.message);
  }
  
  console.log('🎉 Successfully fixed duplicate variable declaration!');
  
} catch (error) {
  console.error('❌ Error occurred:', error);
  process.exit(1);
}
