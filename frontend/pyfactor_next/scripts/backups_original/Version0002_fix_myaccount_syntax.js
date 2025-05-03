/**
 * @file Version0002_fix_myaccount_syntax.js
 * @description Script to fix syntax errors in MyAccount.js after moving tabs
 * @version 1.0.0
 * @date 2025-04-23
 */

const fs = require('fs');
const path = require('path');

// Define file paths
const myAccountPath = path.join(__dirname, '../src/app/Settings/components/MyAccount.js');
const backupDir = path.join(__dirname, '../src/app/Settings/components/backups');

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`Created backup directory: ${backupDir}`);
}

// Get current date for backup filenames
const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

// Create backup
const backupPath = path.join(backupDir, `MyAccount.js.backup-syntax-fix-${currentDate}`);
fs.copyFileSync(myAccountPath, backupPath);
console.log(`Created backup at: ${backupPath}`);

// Read the file
let myAccountContent = fs.readFileSync(myAccountPath, 'utf8');

// Fix the syntax error - remove the unexpected ")}""
myAccountContent = myAccountContent.replace(
  /(<div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">\s*\n\s*\)}\s*\n\s*<\/div>)/,
  `<div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={handleProceedToFeedback}
                  >
                    Yes, close my account
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={handleCloseAccountModal}
                  >
                    Cancel
                  </button>
                </div>`
);

// Write the fixed file
fs.writeFileSync(myAccountPath, myAccountContent);
console.log('Fixed syntax errors in MyAccount.js');

// Update script registry
const registryPath = path.join(__dirname, 'script_registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

// Create new script entry
const scriptEntry = {
  id: "UI-002",
  name: "Fix MyAccount Syntax Errors",
  description: "Fixes syntax errors in MyAccount.js after moving tabs",
  script_path: "Version0002_fix_myaccount_syntax.js",
  version": "1.0.0",
  date_created: currentDate,
  date_executed: currentDate,
  status: "completed",
  affected_files: [
    "src/app/Settings/components/MyAccount.js"
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