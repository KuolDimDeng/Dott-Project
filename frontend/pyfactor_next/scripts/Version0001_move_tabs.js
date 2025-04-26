/**
 * @file Version0001_move_tabs.js
 * @description Script to move the Subscription and Billing History tabs from MyAccount to Settings
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
}

// Get current date for backup filenames
const currentDate = new Date().toISOString().split('T')[0];

// Create backups
fs.copyFileSync(myAccountPath, path.join(backupDir, `MyAccount.js.backup-${currentDate}`));
fs.copyFileSync(profileSettingsPath, path.join(backupDir, `ProfileSettings.js.backup-${currentDate}`));

console.log('Created backups of MyAccount.js and ProfileSettings.js');

// Read the files
const myAccountContent = fs.readFileSync(myAccountPath, 'utf8');
const profileSettingsContent = fs.readFileSync(profileSettingsPath, 'utf8');

// Extract the Subscription and Billing History tab implementations from MyAccount.js
const subscriptionTabRegex = /const renderSubscriptionManagement = \(\) => \{[\s\S]*?\};/;
const billingHistoryTabRegex = /const renderBillingHistory = \(\) => \{[\s\S]*?\};/;

const subscriptionTabMatch = myAccountContent.match(subscriptionTabRegex);
const billingHistoryTabMatch = myAccountContent.match(billingHistoryTabRegex);

const subscriptionTabCode = subscriptionTabMatch[0];
const billingHistoryTabCode = billingHistoryTabMatch[0];

// Modify ProfileSettings.js to include the extracted code
let updatedProfileSettings = profileSettingsContent;

// Add imports if they don't exist
if (!updatedProfileSettings.includes('getSubscriptionPlanColor')) {
  updatedProfileSettings = updatedProfileSettings.replace(
    'import React from \'react\';',
    'import React from \'react\';\nimport { getSubscriptionPlanColor } from \'@/utils/userAttributes\';'
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

// Write the updated files
fs.writeFileSync(myAccountPath, updatedMyAccount);
fs.writeFileSync(profileSettingsPath, updatedProfileSettings);

console.log('Successfully moved Subscription and Billing History tabs from MyAccount.js to ProfileSettings.js');

// Update script registry
const registryPath = path.join(__dirname, 'script_registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

// Create new script entry
const scriptEntry = {
  id: "UI-001",
  name: "Move Subscription and Billing Tabs",
  description: "Moves the Subscription and Billing History tabs from My Account page to Settings page",
  script_path: "Version0001_move_tabs.js",
  version: "1.0.0",
  date_created: currentDate,
  date_executed: currentDate,
  status: "completed",
  affected_files: [
    "src/app/Settings/components/MyAccount.js",
    "src/app/Settings/components/ProfileSettings.js"
  ]
};

// Add to scripts array
if (Array.isArray(registry.scripts)) {
  registry.scripts.push(scriptEntry);
} else {
  registry.scripts = [scriptEntry];
}

// Write updated registry back to file
fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));

console.log('Updated script registry');
console.log('Script completed successfully');