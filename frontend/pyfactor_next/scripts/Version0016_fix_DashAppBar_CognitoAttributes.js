/**
 * Version0016_fix_DashAppBar_CognitoAttributes.js
 * 
 * Script to update the DashAppBar component to properly use the CognitoAttributes utility
 * Version: 1.0.0
 * Date: 2025-05-06
 * 
 * This script modifies the DashAppBar component to use the CognitoAttributes utility
 * for accessing Cognito user attributes, ensuring consistent naming and preventing
 * attribute casing errors when retrieving business name and user initials.
 */

import fs from 'fs';
import path from 'path';

// Configuration
const config = {
  targetFile: '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/DashAppBar.js',
  backupDir: '/Users/kuoldeng/projectx/scripts/backups',
  logFile: '/Users/kuoldeng/projectx/scripts/script_logs.txt'
};

// Logger
const logger = {
  log: function(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage);
    fs.appendFileSync(config.logFile, logMessage);
  },
  error: function(message, error) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: ${message} - ${error}\n`;
    console.error(errorMessage);
    fs.appendFileSync(config.logFile, errorMessage);
  }
};

/**
 * Creates a backup of the target file
 */
function createBackup(filePath) {
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(config.backupDir)) {
      fs.mkdirSync(config.backupDir, { recursive: true });
    }
    
    // Generate backup file name with timestamp
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupFile = path.join(config.backupDir, `${fileName}.backup-${timestamp}`);
    
    // Copy the file
    fs.copyFileSync(filePath, backupFile);
    logger.log(`Created backup of ${filePath} at ${backupFile}`);
    
    return backupFile;
  } catch (error) {
    logger.error(`Failed to create backup of ${filePath}`, error);
    throw error;
  }
}

/**
 * Updates imports to include CognitoAttributes
 */
function updateImports(content) {
  try {
    // Check if CognitoAttributes is already imported
    if (content.includes("import CognitoAttributes from '@/utils/CognitoAttributes'")) {
      logger.log('CognitoAttributes import already exists');
      return content;
    }
    
    // Find the last import statement
    const importRegex = /^import .+ from ['"].+['"];?$/gm;
    const matches = [...content.matchAll(importRegex)];
    
    if (matches.length === 0) {
      logger.error('No import statements found in the file');
      return content;
    }
    
    const lastImport = matches[matches.length - 1];
    const lastImportEndIndex = lastImport.index + lastImport[0].length;
    
    // Insert CognitoAttributes import after the last import
    const updatedContent = 
      content.substring(0, lastImportEndIndex) + 
      "\nimport CognitoAttributes from '@/utils/CognitoAttributes';" +
      content.substring(lastImportEndIndex);
    
    logger.log('Added CognitoAttributes import');
    return updatedContent;
  } catch (error) {
    logger.error('Failed to update imports', error);
    return content;
  }
}

/**
 * Updates the business name retrieval logic to use CognitoAttributes
 */
function updateBusinessNameRetrieval(content) {
  try {
    // Update generation of business name
    const businessNamePattern = /const effectiveBusinessName = useMemo\(\(\) => \{[^}]+\}, \[.+\]\);/s;
    
    const updatedBusinessNameCode = `const effectiveBusinessName = useMemo(() => {
    // Use CognitoAttributes utility to get business name
    if (userAttributes) {
      const businessName = CognitoAttributes.getValue(userAttributes, CognitoAttributes.BUSINESS_NAME);
      if (businessName && businessName !== 'undefined' && businessName !== 'null') {
        return businessName;
      }
    }
    
    // Fallbacks
    if (userData?.businessName) return userData.businessName;
    if (profileData?.businessName) return profileData.businessName;
    if (typeof window !== 'undefined' && window.__APP_CACHE?.tenant?.businessName) {
      return window.__APP_CACHE.tenant.businessName;
    }
    
    return '';
  }, [userAttributes, userData, profileData]);`;
    
    let updatedContent = content;
    if (businessNamePattern.test(content)) {
      updatedContent = content.replace(businessNamePattern, updatedBusinessNameCode);
      logger.log('Updated business name retrieval to use CognitoAttributes');
    } else {
      logger.log('Could not find effectiveBusinessName to update, skipping');
    }
    
    return updatedContent;
  } catch (error) {
    logger.error('Failed to update business name retrieval', error);
    return content;
  }
}

/**
 * Updates the user initials generation logic to use CognitoAttributes
 */
function updateUserInitialsGeneration(content) {
  try {
    // Replace the initials rendering in the avatar with CognitoAttributes.getUserInitials
    const avatarInitialsPattern = /{userInitials \|\| \(userAttributes && generateInitialsFromNames\([^)]+\)\) \|\| '\?'}/g;
    
    const updatedAvatarInitialsCode = `{userInitials || (userAttributes && CognitoAttributes.getUserInitials(userAttributes)) || '?'}`;
    
    let updatedContent = content.replace(avatarInitialsPattern, updatedAvatarInitialsCode);
    
    logger.log('Updated user avatar initials to use CognitoAttributes.getUserInitials');
    
    // Now update the fetchCorrectUserDetails function to use CognitoAttributes
    const fetchDetailsPattern = /const initials = generateInitialsFromNames\(firstName, lastName, email\);/g;
    
    const updatedInitialsCode = `const initials = CognitoAttributes.getUserInitials(attributes);`;
    
    updatedContent = updatedContent.replace(fetchDetailsPattern, updatedInitialsCode);
    
    logger.log('Updated fetchCorrectUserDetails to use CognitoAttributes.getUserInitials');
    
    // Update the fetchAttributes function
    const fetchAttributesPattern = /const initials = generateInitialsFromNames\(firstName, lastName, email\);/g;
    
    updatedContent = updatedContent.replace(fetchAttributesPattern, updatedInitialsCode);
    
    logger.log('Updated fetchAttributes to use CognitoAttributes.getUserInitials');
    
    return updatedContent;
  } catch (error) {
    logger.error('Failed to update user initials generation', error);
    return content;
  }
}

/**
 * Update attribute access to use CognitoAttributes.getValue instead of direct access
 */
function updateAttributeAccess(content) {
  try {
    // Replace direct tenant ID access with CognitoAttributes.getTenantId
    const tenantIdPattern = /attributes\['custom:tenant_ID'\] \|\| attributes\['custom:businessid'\]/g;
    
    const updatedTenantIdCode = `CognitoAttributes.getValue(attributes, CognitoAttributes.TENANT_ID) || CognitoAttributes.getValue(attributes, CognitoAttributes.BUSINESS_ID)`;
    
    let updatedContent = content.replace(tenantIdPattern, updatedTenantIdCode);
    
    logger.log('Updated tenant ID access to use CognitoAttributes');
    
    // Update business name attribute access
    const businessNamePattern = /attributes\['custom:businessname'\] \|\| \s*attributes\['custom:tenant_name'\] \|\| \s*attributes\['custom:business_name'\] \|\| \s*''/g;
    
    const updatedBusinessNameCode = `CognitoAttributes.getValue(attributes, CognitoAttributes.BUSINESS_NAME, '')`;
    
    updatedContent = updatedContent.replace(businessNamePattern, updatedBusinessNameCode);
    
    logger.log('Updated business name access to use CognitoAttributes');
    
    // Update subscription plan attribute access
    const subscriptionPlanPattern = /attributes\['custom:subplan'\] \|\| \s*attributes\['custom:subscription_plan'\] \|\| \s*attributes\['custom:subscription'\] \|\| \s*'free'/g;
    
    const updatedSubscriptionPlanCode = `CognitoAttributes.getValue(attributes, CognitoAttributes.SUBSCRIPTION_PLAN, 'free')`;
    
    updatedContent = updatedContent.replace(subscriptionPlanPattern, updatedSubscriptionPlanCode);
    
    logger.log('Updated subscription plan access to use CognitoAttributes');
    
    return updatedContent;
  } catch (error) {
    logger.error('Failed to update attribute access', error);
    return content;
  }
}

/**
 * Updates name display logic to use CognitoAttributes
 */
function updateNameDisplay(content) {
  try {
    // Find and replace the complex name display in user dropdown
    const nameDisplayPattern = /\{userAttributes\?\.\['given_name'\] && userAttributes\?\.\['family_name'\] \? [^:]+: [^}]+\}/s;
    
    // Simplified replacement using CognitoAttributes
    const updatedNameDisplayCode = `{userAttributes ? 
          (CognitoAttributes.getValue(userAttributes, CognitoAttributes.GIVEN_NAME) && CognitoAttributes.getValue(userAttributes, CognitoAttributes.FAMILY_NAME) ?
            \`\${CognitoAttributes.getValue(userAttributes, CognitoAttributes.GIVEN_NAME)} \${CognitoAttributes.getValue(userAttributes, CognitoAttributes.FAMILY_NAME)}\` :
            userData?.name || (userData?.firstName && userData?.lastName ? 
              \`\${userData.firstName} \${userData.lastName}\` : userData?.firstName || userData?.email?.split('@')[0] || 'Guest')) :
          'Guest'}`;
    
    let updatedContent = content;
    if (nameDisplayPattern.test(content)) {
      updatedContent = content.replace(nameDisplayPattern, updatedNameDisplayCode);
      logger.log('Updated name display to use CognitoAttributes');
    } else {
      logger.log('Could not find name display pattern to update, skipping');
    }
    
    return updatedContent;
  } catch (error) {
    logger.error('Failed to update name display', error);
    return content;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    logger.log(`Starting script: Version0016_fix_DashAppBar_CognitoAttributes.js`);
    
    // Validate file exists
    if (!fs.existsSync(config.targetFile)) {
      throw new Error(`Target file not found: ${config.targetFile}`);
    }
    
    // Create backup before making changes
    const backupFile = createBackup(config.targetFile);
    
    // Read file content
    const content = fs.readFileSync(config.targetFile, 'utf8');
    
    // Apply updates in sequence
    let updatedContent = content;
    updatedContent = updateImports(updatedContent);
    updatedContent = updateBusinessNameRetrieval(updatedContent);
    updatedContent = updateUserInitialsGeneration(updatedContent);
    updatedContent = updateAttributeAccess(updatedContent);
    updatedContent = updateNameDisplay(updatedContent);
    
    // Only write if content has changed
    if (updatedContent !== content) {
      fs.writeFileSync(config.targetFile, updatedContent);
      logger.log(`Successfully updated ${config.targetFile}`);
      logger.log(`Backup saved at ${backupFile}`);
    } else {
      logger.log('No changes were necessary to the file.');
    }
    
    logger.log('Script completed successfully.');
    return { success: true, message: 'DashAppBar successfully updated to use CognitoAttributes utility' };
  } catch (error) {
    logger.error('Script execution failed', error);
    return { success: false, message: `Script failed: ${error.message}` };
  }
}

// Execute the script
main().then(result => {
  console.log(result.message);
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 