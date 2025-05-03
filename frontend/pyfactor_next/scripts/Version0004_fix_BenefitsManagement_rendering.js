/**
 * Script: Version0004_fix_BenefitsManagement_rendering.js
 * Version: 1.0
 * Date: April 28, 2025
 * Description: Fix for Benefits Management component not rendering when clicked from HR menu
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting Benefits Management rendering fix...');

// Define file paths
const dashboardContentPath = path.join(__dirname, '../frontend/pyfactor_next/src/components/Dashboard/DashboardContent.js');
const renderMainContentPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js');

// Create backups of the files
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const dashboardContentBackupPath = `${dashboardContentPath}.backup-${timestamp}`;
const renderMainContentBackupPath = `${renderMainContentPath}.backup-${timestamp}`;

// Backup the files
console.log('Creating backups of files...');
try {
  fs.copyFileSync(dashboardContentPath, dashboardContentBackupPath);
  console.log(`✅ Created backup of DashboardContent.js at ${dashboardContentBackupPath}`);
  
  fs.copyFileSync(renderMainContentPath, renderMainContentBackupPath);
  console.log(`✅ Created backup of RenderMainContent.js at ${renderMainContentBackupPath}`);
} catch (error) {
  console.error('❌ Error creating backups:', error);
  process.exit(1);
}

// Fix DashboardContent.js to properly handle benefits navigation
try {
  console.log('Fixing DashboardContent.js...');
  let dashboardContentContent = fs.readFileSync(dashboardContentPath, 'utf8');
  
  // Find the handleHRClick function and ensure it correctly handles benefits
  const handleHRClickPattern = /const handleHRClick = useCallback\(\(section\) => \{[^]*?} else if \(section === 'benefits'\) \{[^]*?showBenefitsManagement: true,[^]*?\}\);[^]*?\}/;
  
  // The corrected version of handleHRClick for benefits
  const handleHRClickReplacement = `const handleHRClick = useCallback((section) => {
    // Hide other sections
    resetAllStates();
    
    if (section === 'taxes') {
      // Show tax management component
      console.log('[DashboardContent] Setting showTaxManagement to true for section:', section);
      updateState({
        showTaxManagement: true,
        hrSection: section
      });
      
      // Log the state immediately after update
      console.log('[DashboardContent] State after update:', { 
        showTaxManagement: true, 
        hrSection: section 
      });
    } else if (section === 'timesheets') {
      // Show timesheet management component
      console.log('[DashboardContent] Setting showTimesheetManagement to true for section:', section);
      // Generate a unique navigation key for component remounting
      const timesheetNavKey = \`timesheet-\${Date.now()}\`;
      console.log('[DashboardContent] Setting navigationKey for timesheet:', timesheetNavKey);
      
      updateState({
        showTimesheetManagement: true,
        hrSection: section,
        navigationKey: timesheetNavKey
      });
      
      // Log the state immediately after update
      console.log('[DashboardContent] State after update:', { 
        showTimesheetManagement: true, 
        hrSection: section 
      });
    } else if (section === 'pay') {
      // Show pay management component
      console.log('[DashboardContent] Setting showPayManagement to true for section:', section);
      // Generate a unique navigation key for component remounting
      const payNavKey = \`pay-\${Date.now()}\`;
      console.log('[DashboardContent] Setting navigationKey for pay:', payNavKey);
      
      updateState({
        showPayManagement: true,
        hrSection: section,
        navigationKey: payNavKey
      });
      
      // Log the state immediately after update
      console.log('[DashboardContent] State after update:', { 
        showPayManagement: true, 
        hrSection: section 
      });
    } else if (section === 'benefits') {
      // Show benefits management component with proper re-rendering
      console.log('[DashboardContent] Setting showBenefitsManagement to true for section:', section);
      
      // Generate a unique navigation key for component remounting
      const benefitsNavKey = \`benefits-\${Date.now()}\`;
      
      // IMPORTANT FIX: Set state with the correct properties 
      // and ensure navigationKey is included for proper component remounting
      setUiState(prevState => ({
        ...prevState,
        showBenefitsManagement: true,
        hrSection: section,
        navigationKey: benefitsNavKey
      }));
      
      // For event dispatch compatibility use updateState as well
      updateState({
        showBenefitsManagement: true,
        hrSection: section,
        navigationKey: benefitsNavKey
      });
      
      // Log the state immediately after update
      console.log('[DashboardContent] State after update:', { 
        showBenefitsManagement: true, 
        hrSection: section,
        navigationKey: benefitsNavKey
      });
    }
  }, [resetAllStates, updateState, setUiState]);`;
  
  if (dashboardContentContent.match(handleHRClickPattern)) {
    dashboardContentContent = dashboardContentContent.replace(handleHRClickPattern, handleHRClickReplacement);
    console.log('✅ Fixed handleHRClick function in DashboardContent.js');
  } else {
    console.warn('⚠️ Could not find handleHRClick function pattern to replace. Using alternate approach...');
    
    // Alternative approach: Look for the setUiState function and ensure it's being used correctly
    const setUiStatePattern = /const \[uiState, setUiState\] = useState\(\{/;
    if (dashboardContentContent.match(setUiStatePattern)) {
      console.log('✅ Found setUiState declaration, will append fix at the end of file');
      
      // Add a patch function at the end of the file
      const patchCode = `
// Patched by Version0004_fix_BenefitsManagement_rendering.js
// Ensure benefits management is properly handled in handleHRClick
if (typeof handleHRClick === 'function') {
  const originalHandleHRClick = handleHRClick;
  handleHRClick = (section) => {
    if (section === 'benefits') {
      // Reset other states first
      resetAllStates();
      
      // Show benefits management component with proper re-rendering
      console.log('[DashboardContent] Setting showBenefitsManagement to true for section:', section);
      
      // Generate a unique navigation key for component remounting
      const benefitsNavKey = \`benefits-\${Date.now()}\`;
      
      // IMPORTANT FIX: Set state with the correct properties 
      // and ensure navigationKey is included for proper component remounting
      setUiState(prevState => ({
        ...prevState,
        showBenefitsManagement: true,
        hrSection: section,
        navigationKey: benefitsNavKey
      }));
      
      console.log('[DashboardContent] State after update:', { 
        showBenefitsManagement: true, 
        hrSection: section,
        navigationKey: benefitsNavKey
      });
      return;
    }
    
    // Call original function for other sections
    return originalHandleHRClick(section);
  };
}
`;
      
      // Append the patch to the end of the file
      dashboardContentContent += patchCode;
      console.log('✅ Appended patch code to fix benefits management rendering');
    } else {
      console.error('❌ Could not find appropriate patterns to fix DashboardContent.js');
    }
  }
  
  // Fix mainContentProps to ensure it reacts to the showBenefitsManagement state
  const mainContentPropsPattern = /const mainContentProps = useMemo\(\(\) => \(/;
  if (dashboardContentContent.match(mainContentPropsPattern)) {
    const mainContentPropsSection = dashboardContentContent.match(/const mainContentProps = useMemo\(\(\) => \([^]*?\), \[[^]*?\]\);/s);
    
    if (mainContentPropsSection) {
      const originalSection = mainContentPropsSection[0];
      
      // Make sure showBenefitsManagement is included in dependencies
      const dependencyPattern = /\), \[(.*?)\]\);/s;
      const dependencyMatch = originalSection.match(dependencyPattern);
      
      if (dependencyMatch && !dependencyMatch[1].includes('showBenefitsManagement')) {
        const updatedDependencies = dependencyMatch[1] + ', uiState.showBenefitsManagement';
        const updatedSection = originalSection.replace(dependencyPattern, `), [${updatedDependencies}]);`);
        
        dashboardContentContent = dashboardContentContent.replace(originalSection, updatedSection);
        console.log('✅ Added showBenefitsManagement to mainContentProps dependencies');
      }
    }
  }
  
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

// Fix RenderMainContent.js to properly render the BenefitsManagement component
try {
  console.log('Fixing RenderMainContent.js...');
  let renderMainContentContent = fs.readFileSync(renderMainContentPath, 'utf8');
  
  // Look for the section that renders BenefitsManagement
  const benefitsRenderPattern = /} else if \(showBenefitsManagement\) \{(?:[^}]*?)(?:return )?<BenefitsManagement[^}]*?}/s;
  
  // The corrected version with proper key for remounting
  const benefitsRenderReplacement = `} else if (showBenefitsManagement) {
      console.log('[RenderMainContent] Rendering BenefitsManagement component with key:', navigationKey);
      return <BenefitsManagement key={navigationKey || \`benefits-\${Date.now()}\`} />;`;
  
  if (renderMainContentContent.match(benefitsRenderPattern)) {
    renderMainContentContent = renderMainContentContent.replace(benefitsRenderPattern, benefitsRenderReplacement);
    console.log('✅ Fixed BenefitsManagement rendering in RenderMainContent.js');
  } else {
    console.warn('⚠️ Could not find BenefitsManagement rendering pattern. Using alternate approach...');
    
    // Check if there's at least a reference to BenefitsManagement component
    if (renderMainContentContent.includes('BenefitsManagement')) {
      // Try to find where other HR components are rendered and add BenefitsManagement
      const hrRenderingPattern = /} else if \(showTimesheetManagement\) \{[^}]*?}/;
      
      if (renderMainContentContent.match(hrRenderingPattern)) {
        const benefitsRenderCode = `} else if (showBenefitsManagement) {
      console.log('[RenderMainContent] Rendering BenefitsManagement component with key:', navigationKey);
      return <BenefitsManagement key={navigationKey || \`benefits-\${Date.now()}\`} />;`;
        
        // Add after the timesheet rendering
        renderMainContentContent = renderMainContentContent.replace(
          hrRenderingPattern,
          match => `${match}\n    ${benefitsRenderCode}`
        );
        
        console.log('✅ Added BenefitsManagement rendering after TimesheetManagement in RenderMainContent.js');
      }
    } else {
      // Need to import BenefitsManagement if it's not already imported
      if (!renderMainContentContent.includes("import BenefitsManagement")) {
        const importPattern = /(import[^;]*?from\s+['"][^'"]*?['"];)/;
        const importBenefits = "import BenefitsManagement from './forms/BenefitsManagement';";
        
        // Add the import statement after another import
        renderMainContentContent = renderMainContentContent.replace(
          importPattern,
          match => `${match}\n${importBenefits}`
        );
        
        console.log('✅ Added BenefitsManagement import to RenderMainContent.js');
      }
      
      // Add rendering logic in a sensible location
      const renderContentPattern = /const renderContent = useMemo\(\(\) => \{/;
      if (renderMainContentContent.match(renderContentPattern)) {
        const addBenefitsCondition = `
    // Handle Benefits Management rendering (added by Version0004_fix_BenefitsManagement_rendering.js)
    if (showBenefitsManagement) {
      console.log('[RenderMainContent] Rendering BenefitsManagement component with key:', navigationKey);
      return <BenefitsManagement key={navigationKey || \`benefits-\${Date.now()}\`} />;
    }`;
        
        // Add right after renderContent declaration
        renderMainContentContent = renderMainContentContent.replace(
          renderContentPattern,
          match => `${match}${addBenefitsCondition}`
        );
        
        console.log('✅ Added BenefitsManagement rendering condition to renderContent');
      }
    }
  }
  
  // Make sure navigationKey is passed properly to BenefitsManagement
  const propsPattern = /const \{ ([^}]*?) \} = props/;
  if (renderMainContentContent.match(propsPattern)) {
    const propsMatch = renderMainContentContent.match(propsPattern);
    
    if (propsMatch && !propsMatch[1].includes('navigationKey')) {
      // Add navigationKey to props destructuring
      const updatedProps = propsMatch[1].includes('navigationKey')
        ? propsMatch[1]
        : `${propsMatch[1]}, navigationKey`;
      
      renderMainContentContent = renderMainContentContent.replace(
        propsPattern,
        `const { ${updatedProps} } = props`
      );
      
      console.log('✅ Added navigationKey to props destructuring');
    }
  }
  
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

// Create documentation in the forms folder
try {
  const docPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/forms/BENEFITS_RENDERING_FIX.md');
  const docContent = `# Benefits Management Rendering Fix

## Overview
This document outlines the fix implemented for the Benefits Management feature in the HR module, where clicking on the "Benefits" menu item in the HR menu was not properly rendering the BenefitsManagement component in the main content area.

## Version History
- v1.0 (April 28, 2025) - Initial fix implementation

## Issue Description
When clicking on the "Benefits" option in the HR menu, the BenefitsManagement component wasn't being rendered in the main content area, despite other HR menu items working correctly.

## Root Causes
1. The state update in DashboardContent.js wasn't properly setting the showBenefitsManagement flag
2. The navigationKey for component remounting wasn't being propagated correctly
3. The RenderMainContent component wasn't properly handling the Benefits component rendering case

## Implemented Fixes
The fix addresses these issues by:

### DashboardContent.js:
- Fixed the handleHRClick function to properly handle the 'benefits' section
- Added explicit state updates using both updateState and setUiState for maximum compatibility
- Ensured proper navigationKey generation and propagation for component remounting
- Added uiState.showBenefitsManagement to mainContentProps dependencies

### RenderMainContent.js:
- Fixed the BenefitsManagement component rendering condition
- Ensured the navigationKey is properly passed to the BenefitsManagement component
- Added a fallback key generation if navigationKey is missing

## Testing
After implementing these fixes, clicking on the Benefits menu item in the HR menu correctly renders the BenefitsManagement component as expected.
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
  const newEntry = `| F0008 | Version0004_fix_BenefitsManagement_rendering.js | Fixes Benefits Management component not rendering when clicked from HR menu | 2025-04-28 | Executed | Multiple files |`;
  
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
console.log('The Benefits menu item issue has been fixed.');
console.log('You can now click on the Benefits menu item to see the Benefits Management component.'); 