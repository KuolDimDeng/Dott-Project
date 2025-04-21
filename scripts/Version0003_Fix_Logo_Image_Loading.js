#!/usr/bin/env node

/**
 * Version0003_Fix_Logo_Image_Loading.js
 * 
 * This script fixes the logo image loading issue during sign-in and sign-up.
 * 
 * Error: GET https://localhost:3000/_next/image?url=/logo.png&w=48&q=75 [HTTP/1.1 400 Bad Request]
 * 
 * The issue is that there are inconsistent references to logo images:
 * - Some pages use "/logo.png" which doesn't exist
 * - Some pages use "/pyfactor-logo.png"
 * 
 * This script will update all references to use the available image at
 * "/static/images/PyfactorLandingpage.png"
 * 
 * Date: 2025-04-21
 * Author: Kubernetes Developer
 * 
 * NOTE: This script uses ES modules as the project is configured with "type": "module" in package.json
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Pages that need to be updated
const filesToUpdate = [
  {
    path: resolve(__dirname, '../frontend/pyfactor_next/src/app/auth/signin/page.js'),
    description: 'Sign-in page'
  },
  {
    path: resolve(__dirname, '../frontend/pyfactor_next/src/app/auth/signup/page.js'),
    description: 'Sign-up page'
  },
  {
    path: resolve(__dirname, '../frontend/pyfactor_next/src/app/auth/verify-email/page.js'),
    description: 'Verify email page'
  },
  {
    path: resolve(__dirname, '../frontend/pyfactor_next/src/app/auth/verify-employee/page.js'),
    description: 'Verify employee page'
  }
];

// New logo path
const newLogoPath = '/static/images/PyfactorLandingpage.png';

// Process each file
let fixedCount = 0;
let errorCount = 0;

filesToUpdate.forEach(file => {
  try {
    // Check if file exists
    if (!fs.existsSync(file.path)) {
      console.log(`\x1b[33m%s\x1b[0m`, `⚠ File not found: ${file.path}`);
      errorCount++;
      return;
    }

    // Backup the original file
    const backupPath = `${file.path}.backup-${new Date().toISOString()}`;
    console.log(`Backing up ${file.description} to ${backupPath}`);
    fs.copyFileSync(file.path, backupPath);

    // Read the file
    console.log(`Reading ${file.description}: ${file.path}`);
    const content = fs.readFileSync(file.path, 'utf8');

    // Replace logo references
    const fixedContent = content.replace(
      /src="\/logo\.png"|src="\/pyfactor-logo\.png"/g,
      `src="${newLogoPath}"`
    );

    // Write the updated content
    console.log(`Writing fixed content to ${file.path}`);
    fs.writeFileSync(file.path, fixedContent);

    // Verify if changes were applied
    const updatedContent = fs.readFileSync(file.path, 'utf8');
    const isFixed = updatedContent.includes(`src="${newLogoPath}"`);

    if (isFixed) {
      console.log(`\x1b[32m%s\x1b[0m`, `✓ Successfully fixed ${file.description}`);
      fixedCount++;
    } else {
      console.log(`\x1b[33m%s\x1b[0m`, `⚠ No changes made to ${file.description}`);
      errorCount++;
    }
  } catch (error) {
    console.log(`\x1b[31m%s\x1b[0m`, `✗ Error processing ${file.description}:`);
    console.log(error.message);
    errorCount++;
  }
});

// Output summary
console.log('\n--- Summary ---');
console.log(`Files processed: ${filesToUpdate.length}`);
console.log(`\x1b[32m%s\x1b[0m`, `Files fixed: ${fixedCount}`);
if (errorCount > 0) {
  console.log(`\x1b[31m%s\x1b[0m`, `Errors/warnings: ${errorCount}`);
}

console.log('\nThe fix addresses the following error:');
console.log('\x1b[31m%s\x1b[0m', 'GET https://localhost:3000/_next/image?url=/logo.png&w=48&q=75 [HTTP/1.1 400 Bad Request]');
console.log('This occurred because the referenced logo files did not exist or were inconsistently referenced.');
console.log(`All pages now use the same logo: ${newLogoPath}`);

// Ensure the target logo file is accessible
const logoFilePath = resolve(__dirname, '../frontend/pyfactor_next/public/static/images/PyfactorLandingpage.png');
if (!fs.existsSync(logoFilePath)) {
  console.log('\n\x1b[33m%s\x1b[0m', '⚠ WARNING: The target logo file does not exist at the expected location!');
  console.log(`Please verify that the logo file exists at: ${logoFilePath}`);
  console.log('If the file is missing, the image loading errors will persist.');
} else {
  console.log('\n\x1b[32m%s\x1b[0m', '✓ Target logo file exists and is accessible');
} 