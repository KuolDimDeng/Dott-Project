#!/usr/bin/env node

/**
 * Version0001_fix_HRPay_RenderMainContent.js
 * 
 * This script fixes an issue where clicking on the Pay menu item in the HR menu
 * doesn't display the PayManagement component. The script updates RenderMainContent.js
 * to properly handle the 'pay' section in the HR dashboard.
 * 
 * Created: 2025-04-24
 */

const fs = require('fs');
const path = require('path');

// Configuration
const RENDER_MAIN_CONTENT_PATH = path.join(
  process.env.PROJECT_DIR || '/Users/kuoldeng/projectx',
  'frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js'
);

const SCRIPT_REGISTRY_PATH = path.join(
  process.env.PROJECT_DIR || '/Users/kuoldeng/projectx',
  'scripts/script_registry.txt'
);

// Create backup of the file
function createBackup(filePath) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupDir = path.join(
    process.env.PROJECT_DIR || '/Users/kuoldeng/projectx',
    'frontend_file_backups'
  );
  
  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const fileName = path.basename(filePath);
  const backupPath = path.join(
    backupDir, 
    `${fileName}.backup-${timestamp}`
  );
  
  fs.copyFileSync(filePath, backupPath);
  console.log(`Backup created at: ${backupPath}`);
  return backupPath;
}

// Update the script registry
function updateScriptRegistry(scriptName, status, description) {
  const entry = `${new Date().toISOString()} | ${scriptName} | ${status} | ${description}\n`;
  
  // Ensure the directory exists
  const dir = path.dirname(SCRIPT_REGISTRY_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Append to registry file
  fs.appendFileSync(SCRIPT_REGISTRY_PATH, entry);
  console.log(`Updated script registry at: ${SCRIPT_REGISTRY_PATH}`);
}

// Main function
async function main() {
  try {
    console.log('Starting fix for HR Pay menu functionality...');
    
    // 1. Create backup of the file
    const backupPath = createBackup(RENDER_MAIN_CONTENT_PATH);
    
    // 2. Read the RenderMainContent.js file
    const content = fs.readFileSync(RENDER_MAIN_CONTENT_PATH, 'utf8');
    
    // 3. Check if PayManagement import already exists
    if (content.includes('const PayManagement = enhancedLazy(() => import(')) {
      console.log('PayManagement import already exists, checking for implementation...');
    } else {
      console.log('PayManagement import not found, adding it...');
    }
    
    // 4. Apply fixes
    let updatedContent = content;
    
    // 4.1 Add PayManagement import if it doesn't exist
    if (!content.includes('const PayManagement = enhancedLazy(() => import(')) {
      const importPattern = /const BenefitsManagement = enhancedLazy\(\(\) => import\([^)]+\), 'Benefits Management'\);/;
      const importReplacement = `const BenefitsManagement = enhancedLazy(() => import('./forms/BenefitsManagement.js'), 'Benefits Management');
const PayManagement = enhancedLazy(() => import('./forms/PayManagement.js'), 'Pay Management');`;
      
      updatedContent = updatedContent.replace(importPattern, importReplacement);
    }
    
    // 4.2 Add showPayManagement to the component props if it doesn't exist
    if (!content.includes('showPayManagement,')) {
      const propPattern = /showTimesheetManagement,/;
      const propReplacement = `showTimesheetManagement,
  showPayManagement,`;
      
      updatedContent = updatedContent.replace(propPattern, propReplacement);
    }
    
    // 4.3 Add the PayManagement rendering section if it doesn't exist
    if (!content.includes('{showPayManagement && (')) {
      const renderPattern = /{showTimesheetManagement && \(\s*<SuspenseWithCleanup\s*fallback={<LoadingComponent \/>}\s*componentKey="timesheetManagement"\s*>\s*<TimesheetManagement \/>\s*<\/SuspenseWithCleanup>\s*\)}/;
      
      const renderReplacement = `{showTimesheetManagement && (
      <SuspenseWithCleanup 
        fallback={<LoadingComponent />}
        componentKey="timesheetManagement"
      >
        <TimesheetManagement />
      </SuspenseWithCleanup>
    )}
    
    {showPayManagement && (
      <SuspenseWithCleanup 
        fallback={<LoadingComponent />}
        componentKey="payManagement"
      >
        <PayManagement />
      </SuspenseWithCleanup>
    )}`;
      
      updatedContent = updatedContent.replace(renderPattern, renderReplacement);
    }
    
    // 4.4 Update the HR section in HRDashboard component to handle the pay section
    const hrDashboardPath = path.join(
      process.env.PROJECT_DIR || '/Users/kuoldeng/projectx',
      'frontend/pyfactor_next/src/app/dashboard/components/forms/HRDashboard.js'
    );
    
    if (fs.existsSync(hrDashboardPath)) {
      const hrDashboardBackupPath = createBackup(hrDashboardPath);
      const hrDashboardContent = fs.readFileSync(hrDashboardPath, 'utf8');
      
      // Add 'pay' to the list of tabs
      let updatedHRDashboard = hrDashboardContent.replace(
        /\['dashboard', 'timesheets', 'taxes', 'benefits', 'reports', 'performance'\]/,
        "['dashboard', 'timesheets', 'pay', 'taxes', 'benefits', 'reports', 'performance']"
      );
      
      // Add case for 'pay' in the switch statement if it doesn't exist
      if (!hrDashboardContent.includes("case 'pay':")) {
        const casePattern = /case 'timesheets':[^;]*?(?=case)/s;
        const paySection = `case 'pay':
        return (
          <>
            <h1 className="text-2xl font-bold mb-4">
              Pay Management
            </h1>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center py-8">
                <svg className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h2 className="mt-4 text-lg font-medium text-gray-900">Pay Management</h2>
                <p className="mt-2 text-gray-600 text-sm">
                  Please use the dedicated Pay Management section from the HR menu. <br />
                  This section is now available as a separate component.
                </p>
                <button 
                  className="mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                >
                  Go to Pay Management
                </button>
              </div>
            </div>
          </>
        );
      `;
        
        updatedHRDashboard = updatedHRDashboard.replace(casePattern, (match) => {
          return match + paySection;
        });
      }
      
      // Save updated HR Dashboard
      fs.writeFileSync(hrDashboardPath, updatedHRDashboard);
      console.log(`Updated HRDashboard.js to include Pay tab`);
    } else {
      console.log(`HRDashboard.js not found at ${hrDashboardPath}, skipping HR dashboard updates`);
    }
    
    // 5. Write the updated content back to the file
    fs.writeFileSync(RENDER_MAIN_CONTENT_PATH, updatedContent);
    
    // 6. Update script registry
    updateScriptRegistry(
      'Version0001_fix_HRPay_RenderMainContent.js',
      'SUCCESS',
      'Fixed HR Pay menu functionality by updating RenderMainContent.js to include PayManagement component'
    );
    
    console.log('Fix completed successfully!');
  } catch (error) {
    console.error('Error applying fix:', error);
    
    // Update script registry with failure
    updateScriptRegistry(
      'Version0001_fix_HRPay_RenderMainContent.js',
      'FAILED',
      `Error: ${error.message}`
    );
    
    process.exit(1);
  }
}

// Run the script
main(); 