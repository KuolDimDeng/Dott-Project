/**
 * @file Version0001_add_page_level_access_control.js
 * @description Implements page-level access control with a restriction message for unauthorized users
 * @version 1.0
 * @date 2023-10-01
 */

// Constants
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Use createRequire for importing CommonJS modules like 'glob'
const require = createRequire(import.meta.url);
const glob = require('glob');

// Get current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the paths
const FRONTEND_ROOT = '/Users/kuoldeng/projectx/frontend/pyfactor_next';
const DASHBOARD_PATH = path.join(FRONTEND_ROOT, 'src/app/dashboard');
const UTILS_PATH = path.join(FRONTEND_ROOT, 'src/utils');
const ACCESS_UTILS_PATH = path.join(UTILS_PATH, 'pageAccess.js');

// Logging configuration
function log(message) {
  console.log(`[PageAccessControl] ${message}`);
}

function error(message) {
  console.error(`[PageAccessControl][ERROR] ${message}`);
}

// Helper function to create directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Create the AccessRestricted component
function createAccessRestrictedComponent() {
  const componentPath = path.join(DASHBOARD_PATH, 'components/AccessRestricted.js');
  
  const componentContent = `/**
 * @component AccessRestricted
 * @description A component that displays a message when a user doesn't have access to a page
 */
'use client';

import React from 'react';

export default function AccessRestricted() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center">
        <svg
          className="w-20 h-20 mx-auto text-gray-400 mb-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Access Restricted</h2>
        <p className="text-lg text-gray-600 mb-6">
          You do not have sufficient privileges to view this page.
          Please contact your administrator for access.
        </p>
        <div className="mt-4">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
`;

  fs.writeFileSync(componentPath, componentContent);
  log(`Created AccessRestricted component at ${componentPath}`);
}

// Create the page access utility
function createPageAccessUtils() {
  const utilContent = `/**
 * @file pageAccess.js
 * @description Utility functions for page-level access control
 */

import { getCacheValue } from './appCache';
import { logger } from './logger';
import api from './api';

// Page access levels and their corresponding required permissions
export const PAGE_ACCESS = {
  DASHBOARD: 'dashboard',
  PRODUCTS: 'products',
  INVENTORY: 'inventory',
  SALES: 'sales',
  PURCHASES: 'purchases',
  ACCOUNTING: 'accounting',
  BANKING: 'banking',
  PAYROLL: 'payroll',
  REPORTS: 'reports',
  ANALYSIS: 'analysis',
  TAXES: 'taxes',
  CRM: 'crm',
  TRANSPORT: 'transport',
  HR: 'hr',
  EMPLOYEE_MANAGEMENT: 'employee_management',
  SETTINGS: 'settings',
  BILLING: 'billing'
};

/**
 * Fetches the current user's page access privileges from the backend
 * and stores them in AppCache for use throughout the app
 */
export async function fetchUserPagePrivileges() {
  try {
    logger.info('[fetchPagePrivileges] Fetching user page privileges');
    
    // Check if there are already cached privileges (older than 5 minutes will be refreshed)
    const cachedPrivileges = getCacheValue('userPagePrivileges');
    const cacheTimestamp = getCacheValue('pagePrivilegesTimestamp');
    
    // If we have cached data and it's less than 5 minutes old, use it
    const now = Date.now();
    if (cachedPrivileges && cacheTimestamp && (now - parseInt(cacheTimestamp) < 5 * 60 * 1000)) {
      logger.info('[fetchPagePrivileges] Using cached page privileges');
      return cachedPrivileges;
    }
    
    // Check if the user is a business owner first
    const isOwner = await verifyTenantOwnership();
    if (isOwner) {
      // Business owners have access to all pages
      const allPageAccess = Object.values(PAGE_ACCESS);
      setCacheValue('userPagePrivileges', allPageAccess);
      setCacheValue('pagePrivilegesTimestamp', now.toString());
      return allPageAccess;
    }
    
    // For employees, fetch their specific privileges
    const response = await api.get('/users/api/page-privileges/current_user/');
    
    if (response?.success && response.page_privileges && Array.isArray(response.page_privileges)) {
      // Store privileges in AppCache
      setCacheValue('userPagePrivileges', response.page_privileges);
      setCacheValue('pagePrivilegesTimestamp', now.toString());
      
      logger.info('[fetchPagePrivileges] Successfully fetched page privileges', response.page_privileges);
      return response.page_privileges;
    } else {
      // If response is empty or invalid, grant access only to dashboard
      const defaultAccess = [PAGE_ACCESS.DASHBOARD];
      setCacheValue('userPagePrivileges', defaultAccess);
      setCacheValue('pagePrivilegesTimestamp', now.toString());
      return defaultAccess;
    }
  } catch (error) {
    // Log error but don't break the application
    logger.error('[fetchPagePrivileges] Error fetching page privileges:', error);
    
    // Use default privileges if fetching fails
    const defaultAccess = [PAGE_ACCESS.DASHBOARD];
    const now = Date.now();
    setCacheValue('userPagePrivileges', defaultAccess);
    setCacheValue('pagePrivilegesTimestamp', now.toString());
    return defaultAccess;
  }
}

/**
 * Verifies if the current user is the owner of the current tenant
 * @returns {Promise<boolean>} True if the user is the owner, false otherwise
 */
export async function verifyTenantOwnership() {
  try {
    // Check if we already have the owner status cached
    const isBusinessOwner = getCacheValue('isBusinessOwner');
    const ownerCacheTimestamp = getCacheValue('ownerVerificationTimestamp');
    const now = Date.now();
    
    // Use cache if it's less than 5 minutes old
    if (isBusinessOwner !== undefined && ownerCacheTimestamp && 
        (now - parseInt(ownerCacheTimestamp) < 5 * 60 * 1000)) {
      logger.debug('[verifyTenantOwnership] Using cached owner status:', isBusinessOwner);
      return isBusinessOwner;
    }
    
    // Check Cognito user attributes for owner role
    const userAttributes = getCacheValue('auth')?.userAttributes || 
                          (typeof window !== 'undefined' && window.__APP_CACHE?.user?.attributes);
    const userRole = userAttributes?.['custom:userrole'] || '';
    
    if (userRole.toLowerCase() === 'owner') {
      logger.info('[verifyTenantOwnership] User has owner role in Cognito attributes');
      setCacheValue('isBusinessOwner', true);
      setCacheValue('ownerVerificationTimestamp', now.toString());
      return true;
    }
    
    // Get tenant ID from cache
    const tenantId = getCacheValue('auth')?.tenantId || 
                     (typeof window !== 'undefined' && window.__APP_CACHE?.auth?.tenantId) ||
                     getCacheValue('tenantId');
    
    if (!tenantId) {
      logger.warn('[verifyTenantOwnership] No tenant ID found in cache');
      return false;
    }
    
    // Verify with backend API
    logger.info('[verifyTenantOwnership] Verifying owner status with backend');
    const response = await api.get(\`/tenants/api/verify-owner/?tenant_id=\${tenantId}\`);
    
    if (response?.is_owner === true) {
      logger.info('[verifyTenantOwnership] Backend confirmed user is the owner');
      setCacheValue('isBusinessOwner', true);
      setCacheValue('ownerVerificationTimestamp', now.toString());
      return true;
    }
    
    // If we get here, user is not an owner
    logger.info('[verifyTenantOwnership] User is not the tenant owner');
    setCacheValue('isBusinessOwner', false);
    setCacheValue('ownerVerificationTimestamp', now.toString());
    return false;
    
  } catch (error) {
    logger.error('[verifyTenantOwnership] Error verifying tenant ownership:', error);
    return false;
  }
}

/**
 * Checks if the current user has access to a specific page
 * @param {string} pageName - The name of the page to check
 * @returns {boolean} True if the user has access, false otherwise
 */
export function hasPageAccess(pageName) {
  try {
    // Business owners always have access to all pages
    const isOwner = getCacheValue('isBusinessOwner');
    if (isOwner === true) {
      return true;
    }
    
    // Check if this is one of the pages that should always be accessible
    if (pageName === PAGE_ACCESS.DASHBOARD || pageName === PAGE_ACCESS.SETTINGS) {
      return true;
    }
    
    // For other users, check their specific privileges
    const userPrivileges = getCacheValue('userPagePrivileges') || [];
    
    // If privileges is empty, deny access to be safe
    if (!userPrivileges || userPrivileges.length === 0) {
      return false;
    }
    
    return userPrivileges.includes(pageName.toLowerCase());
  } catch (error) {
    // Log error but default to restricting access for security
    logger.error(\`[hasPageAccess] Error checking access for page \${pageName}:\`, error);
    return false;
  }
}

// Import required utilities
import { setCacheValue } from './appCache';

// Export all functions
export default {
  PAGE_ACCESS,
  fetchUserPagePrivileges,
  verifyTenantOwnership,
  hasPageAccess
};
`;

  fs.writeFileSync(ACCESS_UTILS_PATH, utilContent);
  log(`Created page access utility at ${ACCESS_UTILS_PATH}`);
}

// Create a higher-order component for page access control
function createWithPageAccessHOC() {
  const hocPath = path.join(DASHBOARD_PATH, 'components/withPageAccess.js');
  
  const hocContent = `/**
 * @file withPageAccess.js
 * @description Higher-order component for page access control
 */
'use client';

import React, { useEffect, useState } from 'react';
import { hasPageAccess, PAGE_ACCESS } from '@/utils/pageAccess';
import AccessRestricted from './AccessRestricted';
import { usePathname } from 'next/navigation';
import { logger } from '@/utils/logger';

/**
 * Higher-order component that checks if the user has access to a page
 * @param {React.Component} Component - The component to wrap
 * @param {string} requiredPageAccess - The access level required for this page
 * @returns {React.Component} The wrapped component with access control
 */
export default function withPageAccess(Component, requiredPageAccess) {
  return function WithPageAccessComponent(props) {
    const [hasAccess, setHasAccess] = useState(null);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
      // Check if the user has access to this page
      const checkAccess = () => {
        try {
          const accessGranted = hasPageAccess(requiredPageAccess);
          setHasAccess(accessGranted);
          logger.debug(\`[withPageAccess] Access to \${requiredPageAccess} page: \${accessGranted ? 'granted' : 'denied'}\`);
        } catch (error) {
          logger.error(\`[withPageAccess] Error checking page access: \${error}\`);
          setHasAccess(false); // Default to no access on error
        } finally {
          setLoading(false);
        }
      };

      checkAccess();
    }, [pathname]);

    if (loading) {
      // Show a loading state while we check access
      return (
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    // If the user has access, render the component
    // Otherwise, show the access restricted message
    return hasAccess ? <Component {...props} /> : <AccessRestricted />;
  };
}
`;

  fs.writeFileSync(hocPath, hocContent);
  log(`Created page access HOC at ${hocPath}`);
}

// Create or update a sample page to demonstrate the usage
function updateSamplePage() {
  const productsPagePath = path.join(DASHBOARD_PATH, 'products/page.js');
  
  // Read the existing file
  const currentContent = fs.readFileSync(productsPagePath, 'utf8');
  
  // Check if the file already has the HOC
  if (currentContent.includes('withPageAccess')) {
    log('Products page already using the page access HOC. Skipping.');
    return;
  }
  
  // Update the imports to add the withPageAccess HOC
  let updatedContent = currentContent.replace(
    /'use client';(\s+)import React,/,
    `'use client';\n\nimport withPageAccess from '../components/withPageAccess';\nimport { PAGE_ACCESS } from '@/utils/pageAccess';\nimport React,`
  );
  
  // Wrap the component with the HOC
  updatedContent = updatedContent.replace(
    /export default function ProductsPage/,
    'function ProductsPage'
  );
  
  // Add the export with page access control at the end
  if (!updatedContent.includes('export default withPageAccess')) {
    updatedContent += `\n\n// Wrap the component with page access control\nexport default withPageAccess(ProductsPage, PAGE_ACCESS.PRODUCTS);\n`;
  }
  
  // Write the updated file
  fs.writeFileSync(productsPagePath, updatedContent);
  log(`Updated products page with page access control at ${productsPagePath}`);
}

// Create a script to modify multiple pages to use the HOC
function createPageUpdaterScript() {
  const scriptPath = path.join(FRONTEND_ROOT, 'scripts/add_page_access_to_pages.js');
  
  const scriptContent = `/**
 * @file add_page_access_to_pages.js
 * @description Script to add page access control to dashboard pages
 * @version 1.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Use createRequire for importing CommonJS modules
const require = createRequire(import.meta.url);
const glob = require('glob');

// Get current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  console.log(\`[PageAccessAdder] \${message}\`);
}

function error(message) {
  console.error(\`[PageAccessAdder][ERROR] \${message}\`);
}

// Update a page to use the withPageAccess HOC
function updatePage(pagePath, accessLevel) {
  try {
    // Read the current file content
    const currentContent = fs.readFileSync(pagePath, 'utf8');
    
    // Skip if already updated
    if (currentContent.includes('withPageAccess')) {
      log(\`Skipping \${pagePath} - already using withPageAccess\`);
      return false;
    }
    
    // Make a backup of the original file
    const backupPath = \`\${pagePath}.bak\`;
    fs.writeFileSync(backupPath, currentContent);
    
    // Update imports
    let updatedContent;
    if (currentContent.includes("'use client'")) {
      updatedContent = currentContent.replace(
        /'use client';(\\s+)import/,
        \`'use client';\\n\\nimport withPageAccess from '../../components/withPageAccess';\\nimport { PAGE_ACCESS } from '@/utils/pageAccess';\\nimport\`
      );
    } else {
      updatedContent = \`'use client';\\n\\nimport withPageAccess from '../../components/withPageAccess';\\nimport { PAGE_ACCESS } from '@/utils/pageAccess';\\n\${currentContent}\`;
    }
    
    // Replace the export
    let componentName;
    const exportMatch = updatedContent.match(/export\\s+default\\s+function\\s+(\\w+)/);
    if (exportMatch) {
      componentName = exportMatch[1];
      updatedContent = updatedContent.replace(
        /export\\s+default\\s+function\\s+(\\w+)/,
        \`function \${componentName}\`
      );
    } else {
      // Try to find another export pattern
      const alternateMatch = updatedContent.match(/export\\s+default\\s+(\\w+)/);
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
        log(\`Warning: Could not find export in \${pagePath}. Using generic component name \${componentName}\`);
      }
    }
    
    // Add the export with page access control at the end
    if (!updatedContent.includes('export default withPageAccess')) {
      updatedContent += \`\\n\\n// Wrap the component with page access control\\nexport default withPageAccess(\${componentName}, PAGE_ACCESS.\${accessLevel});\\n\`;
    }
    
    // Write the updated file
    fs.writeFileSync(pagePath, updatedContent);
    log(\`Updated \${pagePath} to use page access control with level \${accessLevel}\`);
    return true;
  } catch (error) {
    error(\`Failed to update \${pagePath}: \${error.message}\`);
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
  
  log(\`Completed processing. Updated \${successCount} pages successfully. \${failureCount} pages were skipped or failed.\`);
}

// Run the script
updateAllPages();
`;

  fs.writeFileSync(scriptPath, scriptContent);
  log(`Created page updater script at ${scriptPath}`);
}

// Create example documentation
function createDocumentation() {
  const docsPath = path.join(DASHBOARD_PATH, 'PAGE_ACCESS_CONTROL.md');
  
  const docsContent = `# Page-Level Access Control

## Overview

This document describes the implementation of page-level access control in the application. This approach restricts access to specific pages based on user privileges, rather than hiding menu items in the navigation bar.

## Implementation Details

### Components and Utilities

1. **AccessRestricted Component** - Displays a message when a user doesn't have access to a page.
2. **pageAccess.js Utility** - Provides functions to check and manage page access privileges.
3. **withPageAccess HOC** - Higher-order component that wraps page components to enforce access control.

### How It Works

1. User navigates to a page through the menu (all menu items are visible to all users).
2. The wrapped page component checks if the user has the required privileges.
3. If the user has access, the page is displayed normally.
4. If the user doesn't have access, the AccessRestricted component is shown instead.

### Using Page Access Control

To add page access control to a page:

\`\`\`jsx
// Import the HOC and access levels
import withPageAccess from '../components/withPageAccess';
import { PAGE_ACCESS } from '@/utils/pageAccess';

// Define your page component
function MyPage() {
  // Page implementation...
}

// Export the component wrapped with access control
export default withPageAccess(MyPage, PAGE_ACCESS.PRODUCTS);
\`\`\`

### Access Levels

The following access levels are defined in \`PAGE_ACCESS\`:

- DASHBOARD - Dashboard page (always accessible)
- PRODUCTS - Product management
- INVENTORY - Inventory management
- SALES - Sales management
- PURCHASES - Purchases management
- ACCOUNTING - Accounting functions
- BANKING - Banking operations
- PAYROLL - Payroll management
- REPORTS - Reports viewing
- ANALYSIS - Data analysis
- TAXES - Tax management
- CRM - Customer relationship management
- TRANSPORT - Transport management
- HR - Human resources
- EMPLOYEE_MANAGEMENT - Employee management
- SETTINGS - Settings page (always accessible)
- BILLING - Billing management

## Troubleshooting

If page access is not working as expected:

1. Check browser console for errors
2. Verify that user privileges are being loaded correctly
3. Check that \`hasPageAccess\` is being called with the correct access level

## Future Improvements

- Cache access decisions to improve performance
- Add more granular access controls for specific actions within pages
- Implement a UI for administrators to manage page access for users
`;

  fs.writeFileSync(docsPath, docsContent);
  log(`Created documentation at ${docsPath}`);
}

// Script execution starts here
async function execute() {
  log('Starting page access control implementation...');

  try {
    // Create the backup directory
    const backupDir = path.join(process.cwd(), 'backups', 'page_access_' + Date.now());
    ensureDirectoryExists(backupDir);
    
    // Create the components and utilities
    createAccessRestrictedComponent();
    createPageAccessUtils();
    createWithPageAccessHOC();
    
    // Update a sample page to demonstrate the usage
    updateSamplePage();
    
    // Create a script to update multiple pages
    createPageUpdaterScript();
    
    // Create documentation
    createDocumentation();
    
    log('Script execution completed successfully.');
    // Return success status
    return { 
      success: true, 
      message: 'Page access control implementation completed successfully.'
    };
  } catch (err) {
    error(`Failed to execute script: ${err.message}`);
    error(err.stack);
    // Return failure status
    return { 
      success: false, 
      message: `Script execution failed: ${err.message}`
    };
  }
}

// Execute the script and log the result
execute()
  .then(result => {
    if (result.success) {
      log(result.message);
    } else {
      error(result.message);
    }
  })
  .catch(err => {
    error(`Unhandled error: ${err.message}`);
  }); 