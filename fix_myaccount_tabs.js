/**
 * Fix MyAccount.js by removing Subscription and Billing History tabs
 */

const fs = require('fs');
const path = require('path');

// Define file path
const myAccountPath = path.join(__dirname, 'frontend/pyfactor_next/src/app/Settings/components/MyAccount.js');

// Create backup
const backupPath = path.join(__dirname, 'frontend/pyfactor_next/src/app/Settings/components/backups', `MyAccount.js.backup-tabs-fix-${new Date().toISOString().split('T')[0]}`);
fs.copyFileSync(myAccountPath, backupPath);
console.log(`Created backup at: ${backupPath}`);

// Read the file
let content = fs.readFileSync(myAccountPath, 'utf8');

// Remove the Subscription and Billing History tabs from the navigation
content = content.replace(
  /<button[\s\S]*?Subscription[\s\S]*?<\/button>[\s\S]*?<button[\s\S]*?Billing History[\s\S]*?<\/button>/,
  ''
);

// Remove the renderSubscriptionManagement and renderBillingHistory functions
content = content.replace(
  /const renderSubscriptionManagement[\s\S]*?\};/,
  ''
);

content = content.replace(
  /const renderBillingHistory[\s\S]*?\};/,
  ''
);

// Remove the tab rendering in the return statement
content = content.replace(
  /{selectedTab === 1 && renderSubscriptionManagement\(\)}[\s\S]*?{selectedTab === 2 && renderBillingHistory\(\)}/,
  ''
);

// Write the fixed file
fs.writeFileSync(myAccountPath, content);
console.log('Removed Subscription and Billing History tabs from MyAccount.js');