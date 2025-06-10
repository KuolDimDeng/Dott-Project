#!/usr/bin/env node

/**
 * Version 0.043 - Fix Business Name Display in DashAppBar
 * 
 * This script fixes the business name showing "Loading..." in the dashboard:
 * 1. Updates useAuth0Data hook to extract business name from session
 * 2. Updates DashAppBar to properly fetch and display business name
 * 3. Ensures business name is retrieved from backend profile
 * 
 * @fixes business-name-loading
 * @affects frontend/pyfactor_next/src/hooks/useAuth0Data.js
 * @affects frontend/pyfactor_next/src/app/dashboard/components/DashAppBar.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(projectRoot, 'frontend', 'pyfactor_next');

async function createBackup(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const backupPath = filePath + '.backup_' + new Date().toISOString().replace(/[:.]/g, '-');
    await fs.writeFile(backupPath, content);
    console.log(`✅ Created backup: ${backupPath}`);
  } catch (error) {
    console.log(`⚠️  Could not create backup for ${filePath}`);
  }
}

async function updateUseAuth0DataHook() {
  console.log('🔧 Updating useAuth0Data hook to extract business name...');
  
  const hookPath = path.join(frontendDir, 'src', 'hooks', 'useAuth0Data.js');
  
  // Read current hook
  let content = await fs.readFile(hookPath, 'utf-8');
  
  // Create backup
  await createBackup(hookPath);
  
  // Add business name extraction in fetchAuth0Session
  content = content.replace(
    /\/\/ Set role from session\s*\n\s*setRole\(userData\.role\);/,
    `// Set role from session
          setRole(userData.role);
          
          // Extract business name from various possible locations
          const extractedBusinessName = 
            userData.businessName || 
            userData.business_name ||
            userData['custom:businessname'] ||
            sessionData.businessName ||
            sessionData.business_name ||
            null;
          
          if (extractedBusinessName) {
            setBusinessName(extractedBusinessName);
            logger.debug('[useAuth0Data] Extracted business name:', extractedBusinessName);
          }`
  );
  
  // Add fetchBusinessName function before the return statement
  const returnIndex = content.lastIndexOf('return {');
  const beforeReturn = content.substring(0, returnIndex);
  const afterReturn = content.substring(returnIndex);
  
  const fetchBusinessNameFunction = `
  // Fetch business name from backend if not in session
  const fetchBusinessName = useCallback(async () => {
    try {
      // First try profile endpoint
      const profileResponse = await fetch('/api/auth/profile');
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.businessName || profileData.business_name) {
          const name = profileData.businessName || profileData.business_name;
          setBusinessName(name);
          logger.debug('[useAuth0Data] Got business name from profile:', name);
          return name;
        }
      }
      
      // Then try user endpoint
      const userResponse = await fetch('/api/user/current');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.business_name || userData.businessName) {
          const name = userData.business_name || userData.businessName;
          setBusinessName(name);
          logger.debug('[useAuth0Data] Got business name from user endpoint:', name);
          return name;
        }
      }
    } catch (error) {
      logger.error('[useAuth0Data] Error fetching business name:', error);
    }
    return null;
  }, []);

  // Fetch business name when user is loaded
  useEffect(() => {
    if (user && !businessName) {
      fetchBusinessName();
    }
  }, [user, businessName, fetchBusinessName]);

`;

  content = beforeReturn + fetchBusinessNameFunction + afterReturn;
  
  // Update the return statement to include businessName
  content = content.replace(
    /return {\s*user,\s*isLoading,\s*error,\s*role,/,
    `return {
    user,
    isLoading,
    error,
    role,
    businessName,`
  );
  
  await fs.writeFile(hookPath, content);
  console.log('✅ Updated useAuth0Data hook');
}

async function updateDashAppBar() {
  console.log('📊 Updating DashAppBar to properly use business name...');
  
  const dashAppBarPath = path.join(frontendDir, 'src', 'app', 'dashboard', 'components', 'DashAppBar.js');
  
  // Read current file
  let content = await fs.readFile(dashAppBarPath, 'utf-8');
  
  // Create backup
  await createBackup(dashAppBarPath);
  
  // Fix the useAuth0Data destructuring to include businessName
  content = content.replace(
    /const { user: auth0User, role: auth0Role } = useAuth0Data\(\);/,
    'const { user: auth0User, role: auth0Role, businessName: auth0BusinessName } = useAuth0Data();'
  );
  
  // Update the business name display to check profile data
  content = content.replace(
    /<span className="font-semibold">{businessName \|\| fetchedBusinessName \|\| auth0BusinessName \|\| 'Loading\.\.\.'}<\/span>/g,
    `<span className="font-semibold">{businessName || fetchedBusinessName || auth0BusinessName || profileData?.businessName || profileData?.business_name || 'Loading...'}</span>`
  );
  
  content = content.replace(
    /<span>{businessName \|\| fetchedBusinessName \|\| auth0BusinessName \|\| 'Loading\.\.\.'}<\/span>/g,
    `<span>{businessName || fetchedBusinessName || auth0BusinessName || profileData?.businessName || profileData?.business_name || 'Loading...'}</span>`
  );
  
  await fs.writeFile(dashAppBarPath, content);
  console.log('✅ Updated DashAppBar component');
}

async function main() {
  console.log('🚀 Starting Business Name Display Fix - Version 0.043');
  console.log('=' .repeat(50));
  
  try {
    // Update useAuth0Data hook
    await updateUseAuth0DataHook();
    
    // Update DashAppBar component
    await updateDashAppBar();
    
    console.log('\n✅ Business name display has been fixed!');
    console.log('=' .repeat(50));
    console.log('\n📋 Summary of changes:');
    console.log('1. ✅ Updated useAuth0Data hook to extract business name from session');
    console.log('2. ✅ Added fetchBusinessName function to get it from backend');
    console.log('3. ✅ Updated DashAppBar to properly use auth0BusinessName');
    console.log('4. ✅ Added fallback to profileData for business name');
    console.log('\n🎯 The business name should now display properly instead of "Loading..."');
    
  } catch (error) {
    console.error('\n❌ Error during business name fix:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);