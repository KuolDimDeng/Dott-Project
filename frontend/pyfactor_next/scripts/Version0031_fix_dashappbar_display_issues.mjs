#!/usr/bin/env node

/**
 * Version 0031: Fix DashAppBar business name and user initials display
 * 
 * Problem:
 * 1. Business name is not displaying in the dashboard header
 * 2. User initials are showing email first letter instead of full name initials
 * 
 * Solution:
 * 1. Simplify business name retrieval to use Auth0 data properly
 * 2. Fix generateInitialsFromNames to properly use Auth0 user full name
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// File paths
const filesToFix = {
  dashAppBar: path.join(projectRoot, 'src/app/dashboard/components/DashAppBar.js')
};

async function createBackup(filePath) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup_${timestamp}`;
    await fs.copyFile(filePath, backupPath);
    console.log(`✅ Created backup: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error(`❌ Failed to create backup for ${filePath}:`, error);
    throw error;
  }
}

async function fixDashAppBar() {
  console.log('📝 Fixing DashAppBar component...');
  
  const content = await fs.readFile(filesToFix.dashAppBar, 'utf-8');
  
  // Fix 1: Simplify the generateInitialsFromNames function to properly handle Auth0 user data
  let updatedContent = content.replace(
    /\/\/ Simple utility function to generate user initials[\s\S]*?return 'U'; \/\/ Default fallback\s*};/,
    `// Simple utility function to generate user initials
  const generateInitialsFromNames = (firstName, lastName, email, fullName) => {
    // If we have explicit first and last names, use them
    if (firstName && lastName) {
      return \`\${firstName.charAt(0).toUpperCase()}\${lastName.charAt(0).toUpperCase()}\`;
    }
    
    // If we have a full name, split it and use first and last parts
    if (fullName) {
      const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);
      if (nameParts.length >= 2) {
        return \`\${nameParts[0].charAt(0).toUpperCase()}\${nameParts[nameParts.length - 1].charAt(0).toUpperCase()}\`;
      } else if (nameParts.length === 1) {
        // Single name, use first two letters if available
        return nameParts[0].length >= 2 
          ? \`\${nameParts[0].charAt(0).toUpperCase()}\${nameParts[0].charAt(1).toUpperCase()}\`
          : nameParts[0].charAt(0).toUpperCase();
      }
    }
    
    // If we only have firstName or lastName
    if (firstName) {
      return firstName.length >= 2 
        ? \`\${firstName.charAt(0).toUpperCase()}\${firstName.charAt(1).toUpperCase()}\`
        : firstName.charAt(0).toUpperCase();
    }
    if (lastName) {
      return lastName.length >= 2 
        ? \`\${lastName.charAt(0).toUpperCase()}\${lastName.charAt(1).toUpperCase()}\`
        : lastName.charAt(0).toUpperCase();
    }
    
    // Last resort: use email
    if (email) {
      const emailName = email.split('@')[0];
      return emailName.length >= 2 
        ? \`\${emailName.charAt(0).toUpperCase()}\${emailName.charAt(1).toUpperCase()}\`
        : emailName.charAt(0).toUpperCase();
    }
    
    return 'U'; // Default fallback
  };`
  );

  // Fix 2: Update the call to generateInitialsFromNames to include the full name
  updatedContent = updatedContent.replace(
    /initials = generateInitialsFromNames\(\s*auth0User\.given_name,\s*auth0User\.family_name,\s*auth0User\.email\s*\);/g,
    `initials = generateInitialsFromNames(
          auth0User.given_name, 
          auth0User.family_name, 
          auth0User.email,
          auth0User.name
        );`
  );

  // Fix 3: Update the user initials effect to properly use Auth0 data
  updatedContent = updatedContent.replace(
    /const initials = generateInitialsFromNames\(auth0User\.given_name, auth0User\.family_name, auth0User\.email\);/g,
    `const initials = generateInitialsFromNames(
        auth0User.given_name, 
        auth0User.family_name, 
        auth0User.email,
        auth0User.name
      );`
  );

  // Fix 4: Simplify business name display in the render method
  updatedContent = updatedContent.replace(
    /<span className="font-semibold">{businessName \|\| fetchedBusinessName \|\| ''}<\/span>/g,
    `<span className="font-semibold">{businessName || fetchedBusinessName || auth0BusinessName || 'Loading...'}</span>`
  );

  // Fix 5: Also update the business name in the dropdown menu
  updatedContent = updatedContent.replace(
    /<span>{businessName \|\| fetchedBusinessName \|\| ''}<\/span>/g,
    `<span>{businessName || fetchedBusinessName || auth0BusinessName || 'Loading...'}</span>`
  );

  // Fix 6: Update the mobile business name display
  updatedContent = updatedContent.replace(
    /{\(businessName \|\| fetchedBusinessName\) \? `\${businessName \|\| fetchedBusinessName}:` : ''}/g,
    `{(businessName || fetchedBusinessName || auth0BusinessName) ? \`\${businessName || fetchedBusinessName || auth0BusinessName}:\` : ''}`
  );

  await fs.writeFile(filesToFix.dashAppBar, updatedContent, 'utf-8');
  console.log('✅ Fixed DashAppBar component');
}

async function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.md');
  const date = new Date().toISOString().split('T')[0];
  const entry = `\n## Version0031_fix_dashappbar_display_issues\n- **Date**: ${date}\n- **Status**: Completed\n- **Purpose**: Fix business name display and user initials in DashAppBar\n- **Changes**:\n  - Enhanced generateInitialsFromNames to properly handle full names\n  - Fixed user initials to use full name instead of just email\n  - Added fallbacks for business name display\n  - Updated all business name references to include Auth0 data\n- **Files Modified**:\n  - src/app/dashboard/components/DashAppBar.js\n`;

  try {
    await fs.appendFile(registryPath, entry);
    console.log('✅ Updated script registry');
  } catch (error) {
    console.error('❌ Failed to update script registry:', error);
  }
}

async function main() {
  console.log('🚀 Starting Version0031_fix_dashappbar_display_issues script...\n');

  try {
    // Create backup
    console.log('📦 Creating backup...');
    await createBackup(filesToFix.dashAppBar);

    // Apply fixes
    console.log('\n🔧 Applying fixes...');
    await fixDashAppBar();

    // Update registry
    await updateScriptRegistry();

    console.log('\n✅ All fixes applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Test the dashboard to verify business name displays correctly');
    console.log('2. Verify user initials show full name initials (e.g., "JD" for "John Doe")');
    console.log('3. Check both desktop and mobile views');
    console.log('4. Commit and push changes to trigger Vercel deployment');

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();