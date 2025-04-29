/**
 * @file Version0006_fix_Benefits_Radio_Buttons_And_Owner_Access.cjs
 * @description Script to fix radio buttons in ManageBenefits.js and ensure owners can access all tabs in Benefits Management
 * @version 1.0.0
 * @date 2025-04-28
 * 
 * This script addresses two issues:
 * 1. The radio buttons in ManageBenefits.js have 'checked' properties without onChange handlers, causing React warnings
 * 2. Ensures that users with the owner role ('custom:userrole' = 'owner') can properly access all tabs in Benefits Management
 * 
 * FILES MODIFIED:
 * - /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/benefits/tabs/ManageBenefits.js
 * - /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/BenefitsManagement.js
 * 
 * CHANGES MADE:
 * - Add state management for radio button selections in ManageBenefits.js
 * - Add onChange handlers for all radio inputs
 * - Update the role checking logic in BenefitsManagement.js to also check 'custom:userrole' attribute
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// Script registry entry
const SCRIPT_INFO = {
  name: 'Version0006_fix_Benefits_Radio_Buttons_And_Owner_Access',
  description: 'Fix radio buttons in ManageBenefits.js and ensure owners can access all tabs in Benefits Management',
  version: '1.0.0',
  status: 'pending',
  created: new Date().toISOString(),
  executedAt: null
};

// File paths
const MANAGE_BENEFITS_PATH = '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/benefits/tabs/ManageBenefits.js';
const BENEFITS_MANAGEMENT_PATH = '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/BenefitsManagement.js';
const BACKUP_DIR = '/Users/kuoldeng/projectx/frontend_file_backups';
const SCRIPT_REGISTRY_PATH = '/Users/kuoldeng/projectx/scripts/script-registry.json';

/**
 * Creates a backup of the file before modifying it
 * @param {string} filePath - Path to the file to back up
 * @returns {Promise<string>} - Path to the backup file
 */
async function backupFile(filePath) {
  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = path.join(BACKUP_DIR, `${fileName}.backup-${timestamp}`);
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  await fs.promises.copyFile(filePath, backupPath);
  console.log(`Created backup of ${fileName} at ${backupPath}`);
  return backupPath;
}

/**
 * Updates the script registry with the execution status
 * @param {string} status - Execution status
 * @param {string} error - Error message if any
 */
async function updateScriptRegistry(status, error = null) {
  try {
    let registry = [];
    
    // Create registry file if it doesn't exist
    if (!fs.existsSync(SCRIPT_REGISTRY_PATH)) {
      fs.writeFileSync(SCRIPT_REGISTRY_PATH, JSON.stringify([], null, 2));
    }
    
    // Read existing registry
    const registryContent = await readFileAsync(SCRIPT_REGISTRY_PATH, 'utf8');
    registry = JSON.parse(registryContent);
    
    // Update or add entry
    const scriptEntry = { ...SCRIPT_INFO, status, executedAt: new Date().toISOString() };
    if (error) {
      scriptEntry.error = error;
    }
    
    const existingIndex = registry.findIndex(entry => entry.name === SCRIPT_INFO.name);
    if (existingIndex >= 0) {
      registry[existingIndex] = scriptEntry;
    } else {
      registry.push(scriptEntry);
    }
    
    // Write updated registry
    await writeFileAsync(SCRIPT_REGISTRY_PATH, JSON.stringify(registry, null, 2));
    console.log(`Updated script registry with status: ${status}`);
  } catch (err) {
    console.error('Error updating script registry:', err);
  }
}

/**
 * Fix the ManageBenefits.js file to add onChange handlers to radio inputs
 */
async function fixManageBenefits() {
  try {
    console.log('Creating backup of ManageBenefits.js...');
    await backupFile(MANAGE_BENEFITS_PATH);
    
    console.log('Reading ManageBenefits.js...');
    const content = await readFileAsync(MANAGE_BENEFITS_PATH, 'utf8');
    
    // Fix 1: Add new state for selected radio options
    let updatedContent = content.replace(
      /const \[selectedBenefits, setSelectedBenefits\] = useState\({[\s\S]*?\}\);/,
      `const [selectedBenefits, setSelectedBenefits] = useState({
    health: true,
    dental: true,
    vision: true,
    retirement: true,
    lifeInsurance: false,
    disability: false
  });
  
  // Add state for selected plan options
  const [selectedPlans, setSelectedPlans] = useState({
    healthPlan: 'basic',
    dentalPlan: 'basic',
    visionPlan: 'basic',
    coverageType: 'individual'
  });`
    );
    
    // Fix 2: Add handler for radio button changes
    updatedContent = updatedContent.replace(
      /const handleToggleBenefit = \(benefit\) => {[\s\S]*?};/,
      `const handleToggleBenefit = (benefit) => {
    setSelectedBenefits({
      ...selectedBenefits,
      [benefit]: !selectedBenefits[benefit]
    });
  };
  
  // Add handler for radio button changes
  const handlePlanChange = (planType, value) => {
    setSelectedPlans({
      ...selectedPlans,
      [planType]: value
    });
  };`
    );
    
    // Fix 3: Update health plan radio buttons
    updatedContent = updatedContent.replace(
      /<input\s+id="health-basic"\s+name="health-plan"\s+type="radio"\s+checked={true}\s+className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"\s+\/>/,
      `<input
                    id="health-basic"
                    name="health-plan"
                    type="radio"
                    checked={selectedPlans.healthPlan === 'basic'}
                    onChange={() => handlePlanChange('healthPlan', 'basic')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />`
    );
    
    updatedContent = updatedContent.replace(
      /<input\s+id="health-standard"\s+name="health-plan"\s+type="radio"\s+className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"\s+\/>/,
      `<input
                    id="health-standard"
                    name="health-plan"
                    type="radio"
                    checked={selectedPlans.healthPlan === 'standard'}
                    onChange={() => handlePlanChange('healthPlan', 'standard')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />`
    );
    
    updatedContent = updatedContent.replace(
      /<input\s+id="health-premium"\s+name="health-plan"\s+type="radio"\s+className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"\s+\/>/,
      `<input
                    id="health-premium"
                    name="health-plan"
                    type="radio"
                    checked={selectedPlans.healthPlan === 'premium'}
                    onChange={() => handlePlanChange('healthPlan', 'premium')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />`
    );
    
    // Fix 4: Update coverage type radio buttons
    updatedContent = updatedContent.replace(
      /<input\s+id="individual"\s+name="coverage-type"\s+type="radio"\s+checked={true}\s+className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"\s+\/>/,
      `<input
                        id="individual"
                        name="coverage-type"
                        type="radio"
                        checked={selectedPlans.coverageType === 'individual'}
                        onChange={() => handlePlanChange('coverageType', 'individual')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />`
    );
    
    updatedContent = updatedContent.replace(
      /<input\s+id="family"\s+name="coverage-type"\s+type="radio"\s+className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"\s+\/>/,
      `<input
                        id="family"
                        name="coverage-type"
                        type="radio"
                        checked={selectedPlans.coverageType === 'family'}
                        onChange={() => handlePlanChange('coverageType', 'family')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />`
    );
    
    // Fix 5: Update dental plan radio buttons
    updatedContent = updatedContent.replace(
      /<input\s+id="dental-basic"\s+name="dental-plan"\s+type="radio"\s+checked={true}\s+className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"\s+\/>/,
      `<input
                    id="dental-basic"
                    name="dental-plan"
                    type="radio"
                    checked={selectedPlans.dentalPlan === 'basic'}
                    onChange={() => handlePlanChange('dentalPlan', 'basic')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />`
    );
    
    updatedContent = updatedContent.replace(
      /<input\s+id="dental-premium"\s+name="dental-plan"\s+type="radio"\s+className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"\s+\/>/,
      `<input
                    id="dental-premium"
                    name="dental-plan"
                    type="radio"
                    checked={selectedPlans.dentalPlan === 'premium'}
                    onChange={() => handlePlanChange('dentalPlan', 'premium')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />`
    );
    
    // Fix 6: Update vision plan radio buttons
    updatedContent = updatedContent.replace(
      /<input\s+id="vision-basic"\s+name="vision-plan"\s+type="radio"\s+checked={true}\s+className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"\s+\/>/,
      `<input
                    id="vision-basic"
                    name="vision-plan"
                    type="radio"
                    checked={selectedPlans.visionPlan === 'basic'}
                    onChange={() => handlePlanChange('visionPlan', 'basic')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />`
    );
    
    updatedContent = updatedContent.replace(
      /<input\s+id="vision-premium"\s+name="vision-plan"\s+type="radio"\s+className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"\s+\/>/,
      `<input
                    id="vision-premium"
                    name="vision-plan"
                    type="radio"
                    checked={selectedPlans.visionPlan === 'premium'}
                    onChange={() => handlePlanChange('visionPlan', 'premium')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />`
    );
    
    // Fix 7: Fix the selected attribute issue in 401k dropdown
    updatedContent = updatedContent.replace(
      /<option selected value="5">5% of salary<\/option>/,
      `<option value="5" defaultValue>5% of salary</option>`
    );
    
    console.log('Writing updated content to ManageBenefits.js...');
    await writeFileAsync(MANAGE_BENEFITS_PATH, updatedContent);
    
    console.log('Successfully updated ManageBenefits.js');
    return true;
  } catch (error) {
    console.error('Error fixing ManageBenefits.js:', error);
    throw error;
  }
}

/**
 * Fix the BenefitsManagement.js file to ensure owners can access all tabs
 */
async function fixBenefitsManagement() {
  try {
    console.log('Creating backup of BenefitsManagement.js...');
    await backupFile(BENEFITS_MANAGEMENT_PATH);
    
    console.log('Reading BenefitsManagement.js...');
    const content = await readFileAsync(BENEFITS_MANAGEMENT_PATH, 'utf8');
    
    // Fix 1: Update the role checking logic to also check for 'custom:userrole' attribute
    const updatedContent = content.replace(
      /const userRoles = userInfo\['custom:roles'\] \|\| '';/,
      `const userRoles = userInfo['custom:roles'] || '';
          const userRole = userInfo['custom:userrole'] || '';`
    ).replace(
      /const isUserOwner = userRoles\.includes\('owner'\) \|\| userRoles\.includes\('admin'\);/,
      `const isUserOwner = userRoles.includes('owner') || userRoles.includes('admin') || userRole === 'owner';`
    ).replace(
      /const userRoles = cachedUserData\['custom:roles'\] \|\| '';/,
      `const userRoles = cachedUserData['custom:roles'] || '';
            const userRole = cachedUserData['custom:userrole'] || '';`
    ).replace(
      /const isUserOwner = userRoles\.includes\('owner'\) \|\| userRoles\.includes\('admin'\);/g,
      `const isUserOwner = userRoles.includes('owner') || userRoles.includes('admin') || userRole === 'owner';`
    );
    
    console.log('Writing updated content to BenefitsManagement.js...');
    await writeFileAsync(BENEFITS_MANAGEMENT_PATH, updatedContent);
    
    console.log('Successfully updated BenefitsManagement.js');
    return true;
  } catch (error) {
    console.error('Error fixing BenefitsManagement.js:', error);
    throw error;
  }
}

/**
 * Main function to execute the script
 */
async function main() {
  try {
    console.log('Starting script execution...');
    
    // Fix ManageBenefits.js first
    console.log('Fixing ManageBenefits.js...');
    await fixManageBenefits();
    
    // Then fix BenefitsManagement.js
    console.log('Fixing BenefitsManagement.js...');
    await fixBenefitsManagement();
    
    console.log('Script execution completed successfully.');
    await updateScriptRegistry('success');
    return true;
  } catch (error) {
    console.error('Script execution failed:', error);
    await updateScriptRegistry('failed', error.message);
    return false;
  }
}

// Execute the script
main()
  .then(success => {
    if (success) {
      console.log('Script completed successfully. The radio button warnings should be fixed and owners should now have access to all tabs in Benefits Management.');
    } else {
      console.error('Script failed. Please check the logs for details.');
    }
  })
  .catch(err => {
    console.error('Unexpected error during script execution:', err);
  }); 