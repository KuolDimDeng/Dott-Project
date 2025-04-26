/**
 * @file Version0001_move_subscription_billing_tabs_MyAccount_to_Settings.js
 * @description Script to move the Subscription and Billing History tabs from the 'My Account' page 
 * in the user menu of dashappbar to the Settings page.
 * @version 1.0.0
 * @date 2025-04-23
 */

const fs = require('fs');
const path = require('path');

// Define file paths
const myAccountPath = path.join(__dirname, '../src/app/Settings/components/MyAccount.js');
const profileSettingsPath = path.join(__dirname, '../src/app/Settings/components/ProfileSettings.js');
const backupDir = path.join(__dirname, '../src/app/Settings/components/backups');

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`Created backup directory: ${backupDir}`);
}

// Get current date for backup filenames
const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

// Function to create backup of a file
function createBackup(filePath) {
  const fileName = path.basename(filePath);
  const backupPath = path.join(backupDir, `${fileName}.backup-${currentDate}`);
  
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`Created backup: ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`Error creating backup for ${filePath}:`, error);
    return false;
  }
}

// Function to update script registry
function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.json');
  
  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    
    // Create new script entry
    const scriptEntry = {
      id: "UI-001",
      name: "Move Subscription and Billing Tabs",
      description: "Moves the Subscription and Billing History tabs from My Account page to Settings page",
      script_path: "Version0001_move_subscription_billing_tabs_MyAccount_to_Settings.js",
      version: "1.0.0",
      date_created: currentDate,
      date_executed: currentDate,
      status: "completed",
      issues_fixed: [
        "Subscription and Billing tabs were in My Account page instead of Settings page"
      ],
      affected_files: [
        "src/app/Settings/components/MyAccount.js",
        "src/app/Settings/components/ProfileSettings.js"
      ]
    };
    
    // Add to scripts array if it exists, otherwise create it
    if (Array.isArray(registry.scripts)) {
      registry.scripts.push(scriptEntry);
    } else {
      registry.scripts = [scriptEntry];
    }
    
    // Write updated registry back to file
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
    console.log('Updated script registry');
    return true;
  } catch (error) {
    console.error('Error updating script registry:', error);
    return false;
  }
}

// Main function to execute the script
async function main() {
  console.log('Starting script to move Subscription and Billing History tabs...');
  
  // Create backups
  const myAccountBackupSuccess = createBackup(myAccountPath);
  const profileSettingsBackupSuccess = createBackup(profileSettingsPath);
  
  if (!myAccountBackupSuccess || !profileSettingsBackupSuccess) {
    console.error('Failed to create backups. Aborting script.');
    process.exit(1);
  }
  
  try {
    // Read the files
    const myAccountContent = fs.readFileSync(myAccountPath, 'utf8');
    const profileSettingsContent = fs.readFileSync(profileSettingsPath, 'utf8');
    
    // Extract the Subscription and Billing History tab implementations from MyAccount.js
    const subscriptionTabRegex = /const renderSubscriptionManagement = \(\) => \{[\s\S]*?\};/;
    const billingHistoryTabRegex = /const renderBillingHistory = \(\) => \{[\s\S]*?\};/;
    
    const subscriptionTabMatch = myAccountContent.match(subscriptionTabRegex);
    const billingHistoryTabMatch = myAccountContent.match(billingHistoryTabRegex);
    
    if (!subscriptionTabMatch || !billingHistoryTabMatch) {
      console.error('Failed to extract Subscription or Billing History tab implementations from MyAccount.js');
      process.exit(1);
    }
    
    const subscriptionTabCode = subscriptionTabMatch[0];
    const billingHistoryTabCode = billingHistoryTabMatch[0];
    
    // Extract the necessary imports and utility functions from MyAccount.js
    const checkCircleIconRegex = /const CheckCircleIcon = \(\) => \([\s\S]*?\);/;
    const receiptIconRegex = /const ReceiptIcon = \(\) => \([\s\S]*?\);/;
    const getPlanColorRegex = /const getPlanColor = \(planId\) => \{[\s\S]*?\};/;
    
    const checkCircleIconMatch = myAccountContent.match(checkCircleIconRegex);
    const receiptIconMatch = myAccountContent.match(receiptIconRegex);
    const getPlanColorMatch = myAccountContent.match(getPlanColorRegex);
    
    // Modify ProfileSettings.js to include the extracted code
    let updatedProfileSettings = profileSettingsContent;
    
    // Add imports if they don't exist
    if (!updatedProfileSettings.includes('getSubscriptionPlanColor')) {
      updatedProfileSettings = updatedProfileSettings.replace(
        'import React from \'react\';',
        'import React from \'react\';\nimport { getSubscriptionPlanColor } from \'@/utils/userAttributes\';'
      );
    }
    
    // Add utility functions if they don't exist
    if (checkCircleIconMatch && !updatedProfileSettings.includes('CheckCircleIcon')) {
      updatedProfileSettings = updatedProfileSettings.replace(
        'const ProfileSettings = ({ selectedTab }) => {',
        `${checkCircleIconMatch[0]}\n\nconst ProfileSettings = ({ selectedTab }) => {`
      );
    }
    
    if (receiptIconMatch && !updatedProfileSettings.includes('ReceiptIcon')) {
      updatedProfileSettings = updatedProfileSettings.replace(
        'const ProfileSettings = ({ selectedTab }) => {',
        `${receiptIconMatch[0]}\n\nconst ProfileSettings = ({ selectedTab }) => {`
      );
    }
    
    if (getPlanColorMatch && !updatedProfileSettings.includes('getPlanColor')) {
      updatedProfileSettings = updatedProfileSettings.replace(
        'const ProfileSettings = ({ selectedTab }) => {',
        `${getPlanColorMatch[0]}\n\nconst ProfileSettings = ({ selectedTab }) => {`
      );
    }
    
    // Update the renderContent function to use the extracted code for Subscription and Billing tabs
    updatedProfileSettings = updatedProfileSettings.replace(
      /case 4:[\s\S]*?return \(\s*<div>[\s\S]*?<\/div>\s*\);/,
      `case 4:\n        return (\n          <div>\n            <h2 className="text-xl font-semibold text-gray-800 mb-3">Billing and Subscriptions</h2>\n            ${subscriptionTabCode.replace('const renderSubscriptionManagement = () => {', '').replace(/};$/, '')}\n          </div>\n        );`
    );
    
    // Add a new case for Billing History
    updatedProfileSettings = updatedProfileSettings.replace(
      /case 4:[\s\S]*?return \(\s*<div>[\s\S]*?<\/div>\s*\);/,
      `$&\n      case 5:\n        return (\n          <div>\n            ${billingHistoryTabCode.replace('const renderBillingHistory = () => {', '').replace(/};$/, '')}\n          </div>\n        );`
    );
    
    // Update the tabs in ProfileSettings.js to include Billing History
    const tabsRegex = /const renderContent = \(\) => \{[\s\S]*?switch \(selectedTab\) \{/;
    if (updatedProfileSettings.match(tabsRegex)) {
      updatedProfileSettings = updatedProfileSettings.replace(
        tabsRegex,
        `const renderContent = () => {\n    // Tabs:\n    // 0: Personal Information\n    // 1: Password and Security\n    // 2: Notifications\n    // 3: Businesses\n    // 4: Subscription Management\n    // 5: Billing History\n    switch (selectedTab) {`
      );
    }
    
    // Modify MyAccount.js to remove the Subscription and Billing History tabs
    let updatedMyAccount = myAccountContent;
    
    // Remove the tab implementations
    updatedMyAccount = updatedMyAccount.replace(subscriptionTabRegex, '');
    updatedMyAccount = updatedMyAccount.replace(billingHistoryTabRegex, '');
    
    // Remove the tab buttons and references in the return statement
    updatedMyAccount = updatedMyAccount.replace(
      /<button[\s\S]*?Subscription[\s\S]*?<\/button>/,
      ''
    );
    
    updatedMyAccount = updatedMyAccount.replace(
      /<button[\s\S]*?Billing History[\s\S]*?<\/button>/,
      ''
    );
    
    // Remove the tab rendering in the return statement
    updatedMyAccount = updatedMyAccount.replace(
      /{selectedTab === 1 && renderSubscriptionManagement\(\)}/,
      ''
    );
    
    updatedMyAccount = updatedMyAccount.replace(
      /{selectedTab === 2 && renderBillingHistory\(\)}/,
      ''
    );
    
    // Update the tab indices to account for the removed tabs
    updatedMyAccount = updatedMyAccount.replace(
      /selectedTab === 0/g,
      'selectedTab === 0'
    );
    
    // Clean up any double commas or whitespace issues
    updatedMyAccount = updatedMyAccount.replace(/,\s*,/g, ',');
    updatedMyAccount = updatedMyAccount.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Write the updated files
    fs.writeFileSync(myAccountPath, updatedMyAccount);
    fs.writeFileSync(profileSettingsPath, updatedProfileSettings);
    
    console.log('Successfully moved Subscription and Billing History tabs from MyAccount.js to ProfileSettings.js');
    
    // Update script registry
    updateScriptRegistry();
    
    console.log('Script completed successfully');
  } catch (error) {
    console.error('Error executing script:', error);
    process.exit(1);
  }
}

// Execute the script
main();