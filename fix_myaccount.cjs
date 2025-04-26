/**
 * Fix syntax errors in MyAccount.js
 */

const fs = require('fs');
const path = require('path');

// Define file path
const myAccountPath = path.join(__dirname, 'frontend/pyfactor_next/src/app/Settings/components/MyAccount.js');

// Read the file
let content = fs.readFileSync(myAccountPath, 'utf8');

// Fix the syntax error - remove the unexpected ")}""
content = content.replace(
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
fs.writeFileSync(myAccountPath, content);
console.log('Fixed syntax errors in MyAccount.js');