#!/usr/bin/env node

/**
 * Script to update dashboard redirects throughout the codebase
 * to use the tenant-specific URL pattern.
 * 
 * Usage: 
 * - node scripts/update-dashboard-redirects.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Find files that have direct dashboard redirects
console.log('Finding files with dashboard redirects...');
const files = execSync("find src -type f -name \"*.js\" -o -name \"*.jsx\" | xargs grep -l \"router.push('/dashboard')\"")
  .toString()
  .trim()
  .split('\n');

console.log(`Found ${files.length} files with dashboard redirects.`);

// Regular expressions to match dashboard redirects
const directDashboardRegex = /router\.push\(['"]\/dashboard['"]\)/g;
const dashboardWithParamsRegex = /router\.push\(['"]\/dashboard\?([^'"]+)['"]\)/g;
const dashboardWithDynamicParamsRegex = /router\.push\(`\/dashboard\?([^`]+)`\)/g;

// Import statement to add
const importStatement = "import { redirectToDashboard } from '@/utils/redirectUtils';";

// Counter for modified files
let modifiedCount = 0;

// Process each file
files.forEach(filePath => {
  try {
    console.log(`Processing ${filePath}...`);
    let content = fs.readFileSync(filePath, 'utf-8');
    let fileModified = false;
    const fileExt = path.extname(filePath);
    
    // Check if the file already has the import
    const hasImport = content.includes("import { redirectToDashboard }") || 
                     content.includes("import {redirectToDashboard}");
                     
    // Apply the first pattern: direct dashboard redirects
    if (content.match(directDashboardRegex)) {
      content = content.replace(
        directDashboardRegex, 
        "redirectToDashboard(router, { source: 'updated-script' })"
      );
      fileModified = true;
    }
    
    // Apply the second pattern: dashboard with query parameters
    if (content.match(dashboardWithParamsRegex)) {
      content = content.replace(
        dashboardWithParamsRegex, 
        (match, params) => `redirectToDashboard(router, { queryParams: { ${params.split('&').map(p => {
          const [key, value] = p.split('=');
          return `${key}: '${value}'`;
        }).join(', ')} }, source: 'updated-script' })`
      );
      fileModified = true;
    }
    
    // Apply the third pattern: dashboard with dynamic query parameters
    if (content.match(dashboardWithDynamicParamsRegex)) {
      content = content.replace(
        dashboardWithDynamicParamsRegex, 
        (match, params) => {
          // This is more complex because params might contain variables
          // We'll use a simpler approach for dynamic params
          return `redirectToDashboard(router, { queryParams: { ${params} }, source: 'updated-script' })`;
        }
      );
      fileModified = true;
    }
    
    // Add import if needed
    if (fileModified && !hasImport) {
      // Find the imports section
      const importSection = content.match(/^import .+?;(\r?\n)+/gm);
      
      if (importSection && importSection.length > 0) {
        // Add after the last import
        const lastImportIndex = content.lastIndexOf(importSection[importSection.length - 1]) + 
                               importSection[importSection.length - 1].length;
        content = content.slice(0, lastImportIndex) + 
                 importStatement + '\n' + 
                 content.slice(lastImportIndex);
      } else {
        // Add at the beginning if no imports found
        content = importStatement + '\n\n' + content;
      }
    }
    
    // Write the modified content back to the file
    if (fileModified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Updated ${filePath}`);
      modifiedCount++;
    } else {
      console.log(`No changes needed in ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
});

console.log(`\nUpdate complete. Modified ${modifiedCount} out of ${files.length} files.`);
console.log('\nPlease review the changes and test the application thoroughly.');
console.log('\nNote: Some complex redirects with dynamic parameters might need manual adjustment.'); 