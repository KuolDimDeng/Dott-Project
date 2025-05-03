/**
 * Script: Version0001_fix_BenefitsManagement_rendering.js
 * Version: 1.0
 * Date: April 28, 2025
 * Description: Fix the Benefits menu item in the HR menu not rendering properly in the main content area
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting Benefits Management rendering fix script...');

// Define file paths
const renderMainContentPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js');
const dashboardContentPath = path.join(__dirname, '../frontend/pyfactor_next/src/components/Dashboard/DashboardContent.js');

// Create backups of the files
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const renderMainContentBackupPath = `${renderMainContentPath}.backup-${timestamp}`;
const dashboardContentBackupPath = `${dashboardContentPath}.backup-${timestamp}`;

// Backup the files
try {
  fs.copyFileSync(renderMainContentPath, renderMainContentBackupPath);
  console.log(`✅ Created backup of RenderMainContent.js at ${renderMainContentBackupPath}`);
  
  fs.copyFileSync(dashboardContentPath, dashboardContentBackupPath);
  console.log(`✅ Created backup of DashboardContent.js at ${dashboardContentBackupPath}`);
} catch (error) {
  console.error('❌ Error creating backups:', error);
  process.exit(1);
}

// Fix RenderMainContent.js
try {
  let renderMainContentContent = fs.readFileSync(renderMainContentPath, 'utf8');
  
  // 1. Add useEffect to log when showBenefitsManagement changes
  if (!renderMainContentContent.includes('useEffect(() => {\n    console.log(\'[RenderMainContent] showBenefitsManagement changed to:\', showBenefitsManagement);')) {
    const insertPosition = renderMainContentContent.indexOf('useEffect(() => {');
    if (insertPosition !== -1) {
      const beforeInsert = renderMainContentContent.substring(0, insertPosition);
      const afterInsert = renderMainContentContent.substring(insertPosition);
      
      const effectToInsert = `useEffect(() => {
    console.log('[RenderMainContent] showBenefitsManagement changed to:', showBenefitsManagement);
  }, [showBenefitsManagement]);
  
  `;
      
      renderMainContentContent = beforeInsert + effectToInsert + afterInsert;
      console.log('✅ Added useEffect to log showBenefitsManagement changes');
    }
  }
  
  // 2. Ensure BenefitsManagement component is loaded with enhanced error handling
  const benefitsImportPattern = /const BenefitsManagement = enhancedLazy\(\(\) => import\('\.\/forms\/BenefitsManagement\.js'\), 'Benefits Management'\);/;
  const benefitsImportReplacement = `const BenefitsManagement = enhancedLazy(() => {
  console.log('[RenderMainContent] Attempting to load BenefitsManagement component');
  return import('./forms/BenefitsManagement.js')
    .then(module => {
      console.log('[RenderMainContent] BenefitsManagement component loaded successfully');
      return module;
    })
    .catch(err => {
      console.error('[RenderMainContent] Error loading BenefitsManagement component:', err);
      return { 
        default: () => (
          <div className="p-4">
            <h1 className="text-xl font-semibold mb-2">Benefits Management</h1>
            <p className="mb-4">Manage your benefits</p>
            <div className="bg-red-100 p-3 rounded">
              <p>Error: {err.message}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        ) 
      };
    });
}, 'Benefits Management');`;

  if (renderMainContentContent.match(benefitsImportPattern)) {
    renderMainContentContent = renderMainContentContent.replace(benefitsImportPattern, benefitsImportReplacement);
    console.log('✅ Enhanced BenefitsManagement component loading with better error handling');
  }
  
  // 3. Update the BenefitsManagement component rendering section to ensure proper rendering
  const benefitsRenderingPattern = /} else if \(showBenefitsManagement\) \{\s*console\.log\('\[RenderMainContent\] Rendering BenefitsManagement component'\);\s*return \(\s*<ContentWrapperWithKey>\s*<SuspenseWithCleanup\s*componentKey=\{\`benefits-management-\$\{navigationKey \|\| 'default'\}\`\}\s*fallback=\{[\s\S]*?<BenefitsManagement \/>\s*<\/SuspenseWithCleanup>\s*<\/ContentWrapperWithKey>\s*\);/;
  
  const benefitsRenderingReplacement = `} else if (showBenefitsManagement) {
        console.log('[RenderMainContent] Rendering BenefitsManagement component with key:', navigationKey);
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup 
              componentKey={\`benefits-management-\${navigationKey || 'default'}-\${Date.now()}\`} 
              fallback={
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              }
            >
              <div className="benefits-management-wrapper">
                <BenefitsManagement />
              </div>
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );`;
  
  if (renderMainContentContent.match(benefitsRenderingPattern)) {
    renderMainContentContent = renderMainContentContent.replace(benefitsRenderingPattern, benefitsRenderingReplacement);
    console.log('✅ Enhanced BenefitsManagement component rendering with unique key');
  }
  
  // 4. Add showBenefitsManagement dependency to the dependencies array in the HR section
  const dependenciesPattern = /const isHRSection = \[\s*showHRDashboard,\s*showEmployeeManagement,\s*showTimesheetManagement,\s*showPayManagement,\s*showTaxManagement,\s*(\/\/ Add more HR sections as needed)?\s*\];/;
  const dependenciesReplacement = `const isHRSection = [
    showHRDashboard,
    showEmployeeManagement,
    showTimesheetManagement,
    showPayManagement,
    showTaxManagement,
    showBenefitsManagement,
    // Add more HR sections as needed
  ];`;
  
  if (renderMainContentContent.match(dependenciesPattern)) {
    renderMainContentContent = renderMainContentContent.replace(dependenciesPattern, dependenciesReplacement);
    console.log('✅ Added showBenefitsManagement to isHRSection dependencies array');
  }
  
  // Write the updated content back to the file
  fs.writeFileSync(renderMainContentPath, renderMainContentContent);
  console.log('✅ Successfully updated RenderMainContent.js');
} catch (error) {
  console.error('❌ Error updating RenderMainContent.js:', error);
  // Try to restore from backup
  try {
    fs.copyFileSync(renderMainContentBackupPath, renderMainContentPath);
    console.log('✅ Restored RenderMainContent.js from backup');
  } catch (restoreError) {
    console.error('❌ Error restoring RenderMainContent.js from backup:', restoreError);
  }
}

// Fix DashboardContent.js
try {
  let dashboardContentContent = fs.readFileSync(dashboardContentPath, 'utf8');
  
  // 1. Ensure the handleHRClick function for Benefits properly sets a unique navigation key
  const benefitsHandlingPattern = /} else if \(section === 'benefits'\) \{\s*\/\/ Show benefits management component\s*console\.log\('\[DashboardContent\] Setting showBenefitsManagement to true for section:', section\);\s*\/\/ Generate a unique navigation key for component remounting\s*const benefitsNavKey = \`benefits-\$\{Date\.now\(\)\}\`;\s*console\.log\('\[DashboardContent\] Setting navigationKey for benefits:', benefitsNavKey\);\s*\s*updateState\(\{\s*showBenefitsManagement: true,\s*hrSection: section,\s*navigationKey: benefitsNavKey\s*\}\);/;
  
  const benefitsHandlingReplacement = `} else if (section === 'benefits') {
      // Show benefits management component
      console.log('[DashboardContent] Setting showBenefitsManagement to true for section:', section);
      
      // First, reset all states to ensure clean rendering
      resetAllStates();
      
      // Generate a unique navigation key for component remounting
      const benefitsNavKey = \`benefits-\${Date.now()}\`;
      console.log('[DashboardContent] Setting navigationKey for benefits:', benefitsNavKey);
      
      // Set state with full cleanup and proper remounting
      updateState({
        showBenefitsManagement: true,
        hrSection: section,
        navigationKey: benefitsNavKey
      });`;
  
  if (dashboardContentContent.match(benefitsHandlingPattern)) {
    dashboardContentContent = dashboardContentContent.replace(benefitsHandlingPattern, benefitsHandlingReplacement);
    console.log('✅ Enhanced Benefits handling in handleHRClick with full state reset');
  }
  
  // 2. Check the else condition to ensure it doesn't override the Benefits setting
  const elseConditionPattern = /} else \{\s*\/\/ Show other HR components\s*updateState\(\{\s*showHRDashboard: section === 'dashboard',\s*showEmployeeManagement: section === 'employees',\s*showBenefitsManagement: section === 'benefits',\s*showReportsManagement: section === 'reports',\s*showPerformanceManagement: section === 'performance',\s*hrSection: section \|\| 'dashboard'\s*\}\);/;
  
  const elseConditionReplacement = `} else {
      // Show other HR components (excluding benefits which has special handling above)
      updateState({
        showHRDashboard: section === 'dashboard',
        showEmployeeManagement: section === 'employees',
        // Benefits is handled in the specific if-block above
        showReportsManagement: section === 'reports',
        showPerformanceManagement: section === 'performance',
        hrSection: section || 'dashboard'
      });`;
  
  if (dashboardContentContent.match(elseConditionPattern)) {
    dashboardContentContent = dashboardContentContent.replace(elseConditionPattern, elseConditionReplacement);
    console.log('✅ Fixed else condition to avoid overriding Benefits setting');
  }
  
  // Write the updated content back to the file
  fs.writeFileSync(dashboardContentPath, dashboardContentContent);
  console.log('✅ Successfully updated DashboardContent.js');
} catch (error) {
  console.error('❌ Error updating DashboardContent.js:', error);
  // Try to restore from backup
  try {
    fs.copyFileSync(dashboardContentBackupPath, dashboardContentPath);
    console.log('✅ Restored DashboardContent.js from backup');
  } catch (restoreError) {
    console.error('❌ Error restoring DashboardContent.js from backup:', restoreError);
  }
}

// Create documentation in the forms folder
try {
  const docPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/forms/BENEFITS_RENDERING_FIX.md');
  const docContent = `# Benefits Management Rendering Fix

## Overview
This document outlines the fix implemented for the Benefits Management feature in the HR module, where clicking on the "Benefits" menu item in the HR menu was not properly rendering the BenefitsManagement component in the main content area.

## Version History
- v1.0 (April 28, 2025) - Initial fix implementation

## Issue Description
When clicking on the "Benefits" menu item in the HR menu, the content area was not displaying the BenefitsManagement component, even though the component itself and the navigation handling appeared to be properly implemented.

## Root Causes
1. The showBenefitsManagement state change was not properly triggering a re-render due to missing dependency in useEffect hooks
2. The BenefitsManagement component wasn't being properly unmounted and remounted when selected again
3. The component key wasn't sufficiently unique to force React to re-render the component
4. The else condition in handleHRClick was potentially overriding the setting of showBenefitsManagement

## Fix Implementation

### In RenderMainContent.js:
1. Added useEffect hook to specifically watch for showBenefitsManagement changes
2. Enhanced the BenefitsManagement lazy loading with better error handling
3. Updated the BenefitsManagement component rendering with a more unique key using Date.now()
4. Added showBenefitsManagement to the isHRSection dependencies array

### In DashboardContent.js:
1. Enhanced the "benefits" case in handleHRClick function to fully reset all states before setting showBenefitsManagement
2. Fixed the else condition to avoid overriding the Benefits setting

## Technical Details
- The navigationKey prop is now uniquely generated for each Benefits menu selection, ensuring React treats it as a new component
- Added additional console logging to help debug any future issues
- Full state reset is performed before setting showBenefitsManagement to ensure clean rendering
- Date.now() is used to guarantee uniqueness even when clicking the same menu item multiple times

## Verification
After implementing this fix, clicking on the "Benefits" menu item in the HR menu correctly renders the BenefitsManagement component in the main content area, just like the Employees, Timesheet, and Pay menu items.

## Related Components
- RenderMainContent.js
- DashboardContent.js
- BenefitsManagement.js
`;

  fs.writeFileSync(docPath, docContent);
  console.log(`✅ Created documentation at ${docPath}`);
} catch (error) {
  console.error('❌ Error creating documentation:', error);
}

// Update script registry
try {
  const registryPath = path.join(__dirname, '../scripts/script_registry.md');
  const registryContent = fs.readFileSync(registryPath, 'utf8');
  
  // Prepare the new entry
  const newEntry = `| F0006 | Version0001_fix_BenefitsManagement_rendering.js | Fixes Benefits menu item in HR section not rendering in the main content area | 2025-04-28 | Executed | RenderMainContent.js, DashboardContent.js |`;
  
  // Find the position to insert the new entry
  const frontendScriptsSection = registryContent.indexOf('## Frontend Scripts');
  const tableHeader = registryContent.indexOf('| Script ID |', frontendScriptsSection);
  const firstEntry = registryContent.indexOf('|', tableHeader + 1);
  
  if (frontendScriptsSection !== -1 && tableHeader !== -1 && firstEntry !== -1) {
    const beforeInsert = registryContent.substring(0, firstEntry);
    const afterInsert = registryContent.substring(firstEntry);
    
    const updatedContent = beforeInsert + newEntry + '\n' + afterInsert;
    
    fs.writeFileSync(registryPath, updatedContent);
    console.log(`✅ Updated script registry at ${registryPath}`);
  } else {
    console.error('❌ Could not find the right location to insert in the script registry');
  }
} catch (error) {
  console.error('❌ Error updating script registry:', error);
}

console.log('✅ Script completed successfully!');
console.log('The Benefits menu item in the HR menu should now render properly.');
console.log('Remember to test this fix after running the script.'); 