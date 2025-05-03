/**
 * Version0004_FixOnboardingStatusCase_SignInForm.js
 * 
 * This script fixes the type mismatch error in SignInForm.js where fixOnboardingStatusCase
 * is being called with an object (userAttributes) instead of a string.
 * 
 * Error: TypeError: status.charAt is not a function
 * 
 * Date: 2025-04-25
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const signInFormPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/auth/components/SignInForm.js');

// Create backup
const backupDate = new Date().toISOString().replace(/:/g, '-');
const backupPath = `${signInFormPath}.backup-${backupDate}`;

// Read the file
console.log(`Reading file: ${signInFormPath}`);
const fileContent = fs.readFileSync(signInFormPath, 'utf8');

// Create backup
console.log(`Creating backup: ${backupPath}`);
fs.writeFileSync(backupPath, fileContent);

// Fix the issue
const updatedContent = fileContent.replace(
  /await fixOnboardingStatusCase\(userAttributes\);/g,
  `// Fix uppercase onboarding status if needed
              if (userAttributes['custom:onboarding']) {
                const fixedStatus = fixOnboardingStatusCase(userAttributes['custom:onboarding']);
                if (fixedStatus !== userAttributes['custom:onboarding']) {
                  // Only update if there's a change needed
                  await updateUserAttributes({
                    'custom:onboarding': fixedStatus
                  });
                  userAttributes['custom:onboarding'] = fixedStatus;
                }
              }`
);

// Write the updated content
console.log(`Writing updated content to: ${signInFormPath}`);
fs.writeFileSync(signInFormPath, updatedContent);

console.log('Fix completed successfully!');
