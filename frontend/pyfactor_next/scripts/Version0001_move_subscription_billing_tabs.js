/**
 * @file Version0001_move_subscription_billing_tabs.js
 * @description Script to move the Subscription and Billing History tabs from the 'My Account' page 
 * in the user menu of dashappbar to the Settings page.
 * @version 1.0.0
 * @date 2025-04-23
 */

const fs = require('fs');
const path = require('path');

// Define file paths
const myAccountPath = path.join(__dirname, '../src/app/Settings/components/MyAccount.js');
const settingsManagementPath = path.join(__dirname, '../src/app/Settings/components/SettingsManagement.js');
const backupDir = path.join(__dirname, '../src/app/Settings/components/backups');

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`Created backup directory: ${backupDir}`);
}

// Get current date for backup filenames
const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

// Create backups
fs.copyFileSync(myAccountPath, path.join(backupDir, `MyAccount.js.backup-${currentDate}`));
fs.copyFileSync(settingsManagementPath, path.join(backupDir, `SettingsManagement.js.backup-${currentDate}`));
console.log('Created backups of MyAccount.js and SettingsManagement.js');

// Read the files
const myAccountContent = fs.readFileSync(myAccountPath, 'utf8');
const settingsManagementContent = fs.readFileSync(settingsManagementPath, 'utf8');

// Update script registry
const registryPath = path.join(__dirname, 'script_registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

// Create new script entry
const scriptEntry = {
  id: "UI-001",
  name: "Move Subscription and Billing Tabs",
  description: "Moves the Subscription and Billing History tabs from My Account page to Settings page",
  script_path: "Version0001_move_subscription_billing_tabs.js",
  version: "1.0.0",
  date_created: currentDate,
  date_executed: currentDate,
  status: "completed",
  affected_files: [
    "src/app/Settings/components/MyAccount.js",
    "src/app/Settings/components/SettingsManagement.js"
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

// Extract the necessary components from MyAccount.js
const extractIconsRegex = /\/\/ SVG Icons[\s\S]*?const CheckCircleIcon[\s\S]*?\);/;
const extractSubscriptionManagementRegex = /const renderSubscriptionManagement[\s\S]*?\};/;
const extractBillingHistoryRegex = /const renderBillingHistory[\s\S]*?\};/;

const iconsMatch = myAccountContent.match(extractIconsRegex);
const subscriptionManagementMatch = myAccountContent.match(extractSubscriptionManagementRegex);
const billingHistoryMatch = myAccountContent.match(extractBillingHistoryRegex);

if (!iconsMatch || !subscriptionManagementMatch || !billingHistoryMatch) {
  console.error('Failed to extract necessary components from MyAccount.js');
  process.exit(1);
}

const icons = iconsMatch[0];
const subscriptionManagement = subscriptionManagementMatch[0];
const billingHistory = billingHistoryMatch[0];

// Update SettingsManagement.js
let updatedSettingsManagement = settingsManagementContent;

// Add import for getSubscriptionPlanColor
if (!updatedSettingsManagement.includes('getSubscriptionPlanColor')) {
  updatedSettingsManagement = updatedSettingsManagement.replace(
    "import { logger } from '@/utils/logger';",
    "import { logger } from '@/utils/logger';\nimport { getSubscriptionPlanColor } from '@/utils/userAttributes';"
  );
}

// Add icons after the renderIcon function
updatedSettingsManagement = updatedSettingsManagement.replace(
  /const renderIcon[\s\S]*?};/,
  `$&\n\n  // Icons for subscription and billing tabs\n  ${icons.replace(/^  /gm, '  ')}`
);

// Add subscription and billing items to navigation
updatedSettingsManagement = updatedSettingsManagement.replace(
  /const navigationItems = \[\s*{[^}]*},\s*{[^}]*},\s*{[^}]*},\s*{[^}]*},\s*{[^}]*},\s*{[^}]*},\s*{[^}]*},\s*\];/,
  `const navigationItems = [
    { id: 'userManagement', label: 'User Management', icon: 'users' },
    { id: 'companyProfile', label: 'Company Profile', icon: 'building' },
    { id: 'payment', label: 'Payment', icon: 'credit-card' },
    { id: 'subscription', label: 'Subscription', icon: 'credit-card' },
    { id: 'billingHistory', label: 'Billing History', icon: 'receipt' },
    { id: 'securityCompliance', label: 'Security & Compliance', icon: 'shield' },
    { id: 'payrollConfig', label: 'Payroll Configuration', icon: 'cash' },
    { id: 'integrationSettings', label: 'Integration Settings', icon: 'puzzle' },
    { id: 'regionalSettings', label: 'Regional Settings', icon: 'globe' },
  ];`
);

// Add receipt icon to renderIcon function
updatedSettingsManagement = updatedSettingsManagement.replace(
  /case 'credit-card'[\s\S]*?return \([\s\S]*?\);/,
  `$&\n      case 'receipt':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );`
);

// Add subscription management and billing history functions
updatedSettingsManagement = updatedSettingsManagement.replace(
  /\/\/ Render the User Management section[\s\S]*?const renderUserManagement[\s\S]*?\);/,
  `$&\n\n  // Render the Subscription Management section\n  ${subscriptionManagement.replace(/^  /gm, '  ')}\n\n  // Render the Billing History section\n  ${billingHistory.replace(/^  /gm, '  ')}`
);

// Update renderActiveSection to include subscription and billing history
updatedSettingsManagement = updatedSettingsManagement.replace(
  /const renderActiveSection[\s\S]*?switch \(activeSection\)[\s\S]*?case 'payment'[\s\S]*?return renderPlaceholderSection[^;]*;/,
  `const renderActiveSection = () => {
    switch (activeSection) {
      case 'userManagement':
        return renderUserManagement();
      case 'companyProfile':
        return renderPlaceholderSection('Company Profile', 'Manage your business information, addresses, and legal details.');
      case 'payment':
        return renderPlaceholderSection('Payment Settings', 'Configure payment methods, billing preferences, and subscription details.');
      case 'subscription':
        return renderSubscriptionManagement();
      case 'billingHistory':
        return renderBillingHistory();`
);

// Add handleUpgradeClick function
updatedSettingsManagement = updatedSettingsManagement.replace(
  /const SettingsManagement = \(\) => {/,
  `const SettingsManagement = () => {
  // State for subscription popup
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);
  
  // Handle upgrade click
  const handleUpgradeClick = () => {
    setShowSubscriptionPopup(true);
  };
  
`
);

// Update the return statement to include SubscriptionPopup
updatedSettingsManagement = updatedSettingsManagement.replace(
  /return \(\s*<div className="flex flex-col md:flex-row[\s\S]*?<\/div>\s*\);/,
  `return (
    <>
      <div className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-6">
        {/* Settings Navigation Sidebar */}
        <div className="w-full md:w-64 bg-white rounded-lg shadow-md overflow-hidden flex-shrink-0">
          <div className="px-4 py-5 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Settings</h3>
          </div>
          <nav className="p-2">
            <ul className="space-y-1">
              {navigationItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={\`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors \${
                      activeSection === item.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }\`}
                  >
                    <span className="mr-3">{renderIcon(item.icon)}</span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 bg-white rounded-lg shadow-md p-6">
          {renderActiveSection()}
        </div>
      </div>
      
      {/* Subscription Popup */}
      {showSubscriptionPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Upgrade Subscription</h2>
            <p className="mb-4">Please contact your account manager to upgrade your subscription plan.</p>
            <button 
              onClick={() => setShowSubscriptionPopup(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );`
);

// Write the updated file
fs.writeFileSync(settingsManagementPath, updatedSettingsManagement);
console.log('Updated SettingsManagement.js with Subscription and Billing History tabs');

// Update MyAccount.js to remove the tabs
let updatedMyAccount = myAccountContent;

// Remove the renderSubscriptionManagement and renderBillingHistory functions
updatedMyAccount = updatedMyAccount.replace(subscriptionManagement, '');
updatedMyAccount = updatedMyAccount.replace(billingHistory, '');

// Remove the tab buttons from the return statement
updatedMyAccount = updatedMyAccount.replace(
  /<button[\s\S]*?Subscription[\s\S]*?<\/button>/,
  ''
);

updatedMyAccount = updatedMyAccount.replace(
  /<button[\s\S]*?Billing History[\s\S]*?<\/button>/,
  ''
);

// Remove the tab rendering from the return statement
updatedMyAccount = updatedMyAccount.replace(
  /{selectedTab === 1 && renderSubscriptionManagement\(\)}/,
  ''
);

updatedMyAccount = updatedMyAccount.replace(
  /{selectedTab === 2 && renderBillingHistory\(\)}/,
  ''
);

// Clean up any double commas or whitespace issues
updatedMyAccount = updatedMyAccount.replace(/,\s*,/g, ',');
updatedMyAccount = updatedMyAccount.replace(/\n\s*\n\s*\n/g, '\n\n');

// Write the updated file
fs.writeFileSync(myAccountPath, updatedMyAccount);
console.log('Updated MyAccount.js to remove Subscription and Billing History tabs');

// Create a documentation file
const docContent = `# Subscription and Billing History Tabs Migration

## Overview
This document describes the migration of the Subscription and Billing History tabs from the My Account page to the Settings page.

## Changes Made
- Moved the Subscription Management tab from My Account to Settings
- Moved the Billing History tab from My Account to Settings
- Added new navigation items in the Settings sidebar
- Added necessary utility functions and icons
- Removed the tabs from the My Account page

## Files Modified
- \`src/app/Settings/components/MyAccount.js\` - Removed Subscription and Billing History tabs
- \`src/app/Settings/components/SettingsManagement.js\` - Added Subscription and Billing History tabs

## Date
${currentDate}

## Version
1.0.0
`;

fs.writeFileSync(path.join(__dirname, '../src/app/Settings/components/SUBSCRIPTION_BILLING_MIGRATION.md'), docContent);
console.log('Created documentation file');

console.log('Script completed successfully');