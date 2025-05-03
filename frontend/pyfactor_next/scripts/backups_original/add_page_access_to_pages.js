/**
 * @file add_page_access_to_pages.js
 * @description Script to add page access control to dashboard pages
 * @version 1.0
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Map of page paths to their required access level
const PAGE_ACCESS_MAP = {
  'dashboard/products': 'PRODUCTS',
  'dashboard/inventory': 'INVENTORY',
  'dashboard/sales': 'SALES',
  'dashboard/purchases': 'PURCHASES',
  'dashboard/accounting': 'ACCOUNTING',
  'dashboard/banking': 'BANKING',
  'dashboard/payroll': 'PAYROLL',
  'dashboard/reports': 'REPORTS',
  'dashboard/analysis': 'ANALYSIS',
  'dashboard/taxes': 'TAXES',
  'dashboard/crm': 'CRM',
  'dashboard/transport': 'TRANSPORT',
  'dashboard/hr': 'HR',
  'dashboard/employee': 'EMPLOYEE_MANAGEMENT',
  'dashboard/billing': 'BILLING'
};

// Logging configuration
function log(message) {
  console.log(`[PageAccessAdder] ${message}`);
}

function error(message) {
  console.error(`[PageAccessAdder][ERROR] ${message}`);
}

// Update a page to use the withPageAccess HOC
function updatePage(pagePath, accessLevel) {
  try {
    // Read the current file content
    const currentContent = fs.readFileSync(pagePath, 'utf8');
    
    // Skip if already updated
    if (currentContent.includes('withPageAccess')) {
      log(`Skipping ${pagePath} - already using withPageAccess`);
      return false;
    }
    
    // Make a backup of the original file
    const backupPath = `${pagePath}.bak`;
    fs.writeFileSync(backupPath, currentContent);
    
    // Update imports
    let updatedContent;
    if (currentContent.includes("'use client'")) {
      updatedContent = currentContent.replace(
        /'use client';(\s+)import/,
        `'use client';\n\nimport withPageAccess from '../../components/withPageAccess';\nimport { PAGE_ACCESS } from '@/utils/pageAccess';\nimport`
      );
    } else {
      updatedContent = `'use client';\n\nimport withPageAccess from '../../components/withPageAccess';\nimport { PAGE_ACCESS } from '@/utils/pageAccess';\n${currentContent}`;
    }
    
    // Replace the export
    let componentName;
    const exportMatch = updatedContent.match(/export\s+default\s+function\s+(\w+)/);
    if (exportMatch) {
      componentName = exportMatch[1];
      updatedContent = updatedContent.replace(
        /export\s+default\s+function\s+(\w+)/,
        `function ${componentName}`
      );
    } else {
      // Try to find another export pattern
      const alternateMatch = updatedContent.match(/export\s+default\s+(\w+)/);
      if (alternateMatch) {
        componentName = alternateMatch[1];
      } else {
        // Generate a generic component name based on the file path
        componentName = path.basename(pagePath, '.js')
          .split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join('') + 'Page';
        
        // If we can't find an export, we'll need to wrap the entire file content
        // This is a bit risky, so log a warning
        log(`Warning: Could not find export in ${pagePath}. Using generic component name ${componentName}`);
      }
    }
    
    // Add the export with page access control at the end
    if (!updatedContent.includes('export default withPageAccess')) {
      updatedContent += `\n\n// Wrap the component with page access control\nexport default withPageAccess(${componentName}, PAGE_ACCESS.${accessLevel});\n`;
    }
    
    // Write the updated file
    fs.writeFileSync(pagePath, updatedContent);
    log(`Updated ${pagePath} to use page access control with level ${accessLevel}`);
    return true;
  } catch (error) {
    error(`Failed to update ${pagePath}: ${error.message}`);
    return false;
  }
}

// Main function to update all pages
function updateAllPages() {
  let successCount = 0;
  let failureCount = 0;
  
  // Process each path in the mapping
  Object.entries(PAGE_ACCESS_MAP).forEach(([pagePath, accessLevel]) => {
    // Find all page.js files in the directory
    const pageFiles = glob.sync(path.join(process.cwd(), 'src/app', pagePath, '**/page.js'));
    
    // Update each page
    pageFiles.forEach(file => {
      if (updatePage(file, accessLevel)) {
        successCount++;
      } else {
        failureCount++;
      }
    });
  });
  
  log(`Completed processing. Updated ${successCount} pages successfully. ${failureCount} pages were skipped or failed.`);
}

// Run the script
updateAllPages();
