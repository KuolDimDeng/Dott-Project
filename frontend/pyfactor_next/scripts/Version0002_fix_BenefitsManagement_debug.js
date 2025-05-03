/**
 * Script: Version0002_fix_BenefitsManagement_debug.js
 * Version: 1.0
 * Date: April 28, 2025
 * Description: Add comprehensive debug logging to diagnose why the Benefits menu item in the HR menu is not rendering properly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting Benefits Management debug script...');

// Define file paths
const listItemsPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/lists/listItems.js');
const dashboardContentPath = path.join(__dirname, '../frontend/pyfactor_next/src/components/Dashboard/DashboardContent.js');
const renderMainContentPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js');
const benefitsManagementPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/forms/BenefitsManagement.js');

// Create backups of the files
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const listItemsBackupPath = `${listItemsPath}.backup-${timestamp}`;
const dashboardContentBackupPath = `${dashboardContentPath}.backup-${timestamp}`;
const renderMainContentBackupPath = `${renderMainContentPath}.backup-${timestamp}`;
const benefitsManagementBackupPath = `${benefitsManagementPath}.backup-${timestamp}`;

// Backup the files
console.log('Creating backups of files...');
try {
  fs.copyFileSync(listItemsPath, listItemsBackupPath);
  console.log(`✅ Created backup of listItems.js at ${listItemsBackupPath}`);
  
  fs.copyFileSync(dashboardContentPath, dashboardContentBackupPath);
  console.log(`✅ Created backup of DashboardContent.js at ${dashboardContentBackupPath}`);
  
  fs.copyFileSync(renderMainContentPath, renderMainContentBackupPath);
  console.log(`✅ Created backup of RenderMainContent.js at ${renderMainContentBackupPath}`);
  
  fs.copyFileSync(benefitsManagementPath, benefitsManagementBackupPath);
  console.log(`✅ Created backup of BenefitsManagement.js at ${benefitsManagementBackupPath}`);
} catch (error) {
  console.error('❌ Error creating backups:', error);
  process.exit(1);
}

// Add enhanced logging to listItems.js
try {
  console.log('Enhancing logging in listItems.js...');
  let listItemsContent = fs.readFileSync(listItemsPath, 'utf8');
  
  // Find the Benefits menu item click handler
  const benefitsClickHandlerPattern = /label: 'Benefits',\s*onClick: \(\) => \{[^}]*}/;
  const benefitsClickHandlerReplacement = `label: 'Benefits',
          onClick: () => {
            console.log('[DEBUG] Benefits menu item clicked - Start');
            
            // Dispatch a standardized navigation event
            const navigationKey = \`benefits-\${Date.now()}\`;
            console.log('[DEBUG] Generated navigationKey:', navigationKey);
            
            // Call the handler directly
            if (typeof handleHRClick === 'function') {
              console.log('[DEBUG] Calling handleHRClick with section: benefits');
              handleHRClick('benefits');
              console.log('[DEBUG] handleHRClick called');
            } else {
              console.error('[DEBUG] handleHRClick is not a function');
            }
            
            console.log('[DEBUG] Benefits menu item clicked - End');
            
            const payload = { 
              item: 'benefits', 
              navigationKey,
              source: 'hr-benefits-menu-click'
            };
            
            console.log('[DEBUG] Dispatching menuNavigation event with payload:', JSON.stringify(payload));
            
            // Dispatch navigation events for all listeners
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            console.log('[DEBUG] menuNavigation event dispatched');
          }`;
  
  if (listItemsContent.match(benefitsClickHandlerPattern)) {
    listItemsContent = listItemsContent.replace(benefitsClickHandlerPattern, benefitsClickHandlerReplacement);
    console.log('✅ Enhanced Benefits menu item click handler with better logging');
  } else {
    console.warn('⚠️ Could not find Benefits menu item click handler');
  }
  
  // Add better debug logging to handleItemClick in listItems.js
  const handleItemClickPattern = /const handleItemClick = useCallback\(\(item, e\) => \{/;
  const handleItemClickReplacement = `const handleItemClick = useCallback((item, e) => {
    console.log('[DEBUG] handleItemClick called with item:', item);`;
  
  if (listItemsContent.match(handleItemClickPattern)) {
    listItemsContent = listItemsContent.replace(handleItemClickPattern, handleItemClickReplacement);
    console.log('✅ Added better debug logging to handleItemClick');
  } else {
    console.warn('⚠️ Could not find handleItemClick function');
  }
  
  fs.writeFileSync(listItemsPath, listItemsContent);
  console.log('✅ Successfully updated listItems.js');
} catch (error) {
  console.error('❌ Error updating listItems.js:', error);
  // Try to restore from backup
  try {
    fs.copyFileSync(listItemsBackupPath, listItemsPath);
    console.log('✅ Restored listItems.js from backup');
  } catch (restoreError) {
    console.error('❌ Error restoring listItems.js from backup:', restoreError);
  }
}

// Add enhanced logging to DashboardContent.js
try {
  console.log('Enhancing logging in DashboardContent.js...');
  let dashboardContentContent = fs.readFileSync(dashboardContentPath, 'utf8');
  
  // Enhance handleHRClick method
  const handleHRClickPattern = /const handleHRClick = useCallback\(\(section\) => \{[^]*?} else if \(section === 'benefits'\) \{[^]*?showBenefitsManagement: true,\s*hrSection: section,\s*navigationKey: benefitsNavKey\s*\}\);[^]*?console\.log\('\[DashboardContent\] State after update:', \{\s*showBenefitsManagement: true,\s*hrSection: section\s*\}\);/;
  
  const handleHRClickReplacement = `const handleHRClick = useCallback((section) => {
    console.log('[DEBUG] handleHRClick called with section:', section, 'caller:', new Error().stack);
    // Hide other sections
    resetAllStates();
    console.log('[DEBUG] resetAllStates called');
    
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
      // Show benefits management component
      console.log('[DEBUG] Setting showBenefitsManagement to true for section:', section);
      
      // First, reset all states to ensure clean rendering
      resetAllStates();
      console.log('[DEBUG] resetAllStates called again for benefits');
      
      // Generate a unique navigation key for component remounting
      const benefitsNavKey = \`benefits-\${Date.now()}\`;
      console.log('[DEBUG] Generated benefitsNavKey:', benefitsNavKey);
      
      // Set state with full cleanup and proper remounting
      console.log('[DEBUG] Calling updateState with:', {
        showBenefitsManagement: true,
        hrSection: section,
        navigationKey: benefitsNavKey
      });
      
      updateState({
        showBenefitsManagement: true,
        hrSection: section,
        navigationKey: benefitsNavKey
      });
      
      // Verify state was updated correctly
      console.log('[DEBUG] State after update:', { 
        showBenefitsManagement: true, 
        hrSection: section,
        navigationKey: benefitsNavKey
      });`;
  
  if (dashboardContentContent.match(handleHRClickPattern)) {
    dashboardContentContent = dashboardContentContent.replace(handleHRClickPattern, handleHRClickReplacement);
    console.log('✅ Enhanced handleHRClick with better logging');
  } else {
    console.warn('⚠️ Could not find handleHRClick function pattern');
  }
  
  // Add better debug logging to handleMenuNavigation in DashboardContent.js
  const handleMenuNavigationPattern = /const handleMenuNavigation = \(event\) => \{/;
  const handleMenuNavigationReplacement = `const handleMenuNavigation = (event) => {
      console.log('[DEBUG] handleMenuNavigation event received:', event.detail);`;
  
  if (dashboardContentContent.match(handleMenuNavigationPattern)) {
    dashboardContentContent = dashboardContentContent.replace(handleMenuNavigationPattern, handleMenuNavigationReplacement);
    console.log('✅ Added better debug logging to handleMenuNavigation');
  } else {
    console.warn('⚠️ Could not find handleMenuNavigation function');
  }
  
  // Add mainContentProps debugging
  const mainContentPropsPattern = /const mainContentProps = useMemo\(\(\) => \(\{/;
  const mainContentPropsReplacement = `// Debug current state before creating mainContentProps
  console.log('[DEBUG] Creating mainContentProps with showBenefitsManagement:', uiState.showBenefitsManagement);
  
  const mainContentProps = useMemo(() => ({`;
  
  if (dashboardContentContent.match(mainContentPropsPattern)) {
    dashboardContentContent = dashboardContentContent.replace(mainContentPropsPattern, mainContentPropsReplacement);
    console.log('✅ Added debug logging before creating mainContentProps');
  } else {
    console.warn('⚠️ Could not find mainContentProps definition');
  }
  
  // Add explicit useMemo dependency on showBenefitsManagement
  const mainContentPropsDependenciesPattern = /\], \[\s*view, memoizedUserData, showKPIDashboard, showMainDashboard, showHome, setView,\s*showForm, formOption, showHRDashboard, hrSection, showEmployeeManagement/;
  const mainContentPropsDependenciesReplacement = `], [
    view, memoizedUserData, showKPIDashboard, showMainDashboard, showHome, setView,
    showForm, formOption, showHRDashboard, hrSection, showEmployeeManagement,
    uiState.showBenefitsManagement, // Explicitly add showBenefitsManagement from uiState`;
  
  if (dashboardContentContent.match(mainContentPropsDependenciesPattern)) {
    dashboardContentContent = dashboardContentContent.replace(mainContentPropsDependenciesPattern, mainContentPropsDependenciesReplacement);
    console.log('✅ Added explicit dependency on showBenefitsManagement');
  } else {
    console.warn('⚠️ Could not find mainContentProps dependencies');
  }
  
  // Enhance updateState function with logging
  const updateStatePattern = /const updateState = useCallback\(\(newState\) => \{/;
  const updateStateReplacement = `const updateState = useCallback((newState) => {
    console.log('[DEBUG] updateState called with:', newState);`;
  
  if (dashboardContentContent.match(updateStatePattern)) {
    dashboardContentContent = dashboardContentContent.replace(updateStatePattern, updateStateReplacement);
    console.log('✅ Enhanced updateState with better logging');
  } else {
    console.warn('⚠️ Could not find updateState function');
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

// Add enhanced logging to RenderMainContent.js
try {
  console.log('Enhancing logging in RenderMainContent.js...');
  let renderMainContentContent = fs.readFileSync(renderMainContentPath, 'utf8');
  
  // Enhance BenefitsManagement component rendering
  const benefitsRenderingPattern = /} else if \(showBenefitsManagement\) \{\s*console\.log\('\[RenderMainContent\] Rendering BenefitsManagement component with key:', navigationKey\);/;
  const benefitsRenderingReplacement = `} else if (showBenefitsManagement) {
        console.log('[DEBUG] showBenefitsManagement is TRUE, rendering BenefitsManagement component');
        console.log('[DEBUG] navigationKey:', navigationKey);
        console.log('[DEBUG] showBenefitsManagement details:', {
          type: typeof showBenefitsManagement,
          value: showBenefitsManagement,
          truthyCheck: showBenefitsManagement ? 'is truthy' : 'is falsy'
        });`;
  
  if (renderMainContentContent.match(benefitsRenderingPattern)) {
    renderMainContentContent = renderMainContentContent.replace(benefitsRenderingPattern, benefitsRenderingReplacement);
    console.log('✅ Enhanced BenefitsManagement rendering with better logging');
  } else {
    console.warn('⚠️ Could not find BenefitsManagement rendering section');
  }
  
  // Add deferred state check for showBenefitsManagement
  const renderContentPattern = /const renderContent = useMemo\(\(\) => \{/;
  const renderContentReplacement = `const renderContent = useMemo(() => {
    // Debug state at the beginning of renderContent
    console.log('[DEBUG] renderContent called with showBenefitsManagement:', showBenefitsManagement);
    
    // Add deferred check for showBenefitsManagement (runs after initial render)
    setTimeout(() => {
      console.log('[DEBUG] Deferred check - showBenefitsManagement:', showBenefitsManagement);
    }, 500);`;
  
  if (renderMainContentContent.match(renderContentPattern)) {
    renderMainContentContent = renderMainContentContent.replace(renderContentPattern, renderContentReplacement);
    console.log('✅ Added deferred state check for showBenefitsManagement');
  } else {
    console.warn('⚠️ Could not find renderContent function');
  }
  
  // Modify showBenefitsManagement effect to add logging if it doesn't exist
  if (!renderMainContentContent.includes('useEffect(() => {\n    console.log(\'[RenderMainContent] showBenefitsManagement changed to:\', showBenefitsManagement);')) {
    const insertPosition = renderMainContentContent.indexOf('useEffect(() => {');
    if (insertPosition !== -1) {
      const beforeInsert = renderMainContentContent.substring(0, insertPosition);
      const afterInsert = renderMainContentContent.substring(insertPosition);
      
      const effectToInsert = `// Monitor showBenefitsManagement changes
  useEffect(() => {
    console.log('[DEBUG] showBenefitsManagement changed to:', showBenefitsManagement, 
      'type:', typeof showBenefitsManagement, 
      'truthy check:', showBenefitsManagement ? 'is truthy' : 'is falsy');
  }, [showBenefitsManagement]);
  
  `;
      
      renderMainContentContent = beforeInsert + effectToInsert + afterInsert;
      console.log('✅ Added enhanced showBenefitsManagement monitoring effect');
    } else {
      console.warn('⚠️ Could not find location to insert useEffect');
    }
  } else {
    console.log('✅ showBenefitsManagement monitoring effect already exists');
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

// Add enhanced logging to BenefitsManagement.js
try {
  console.log('Enhancing logging in BenefitsManagement.js...');
  let benefitsManagementContent = fs.readFileSync(benefitsManagementPath, 'utf8');
  
  // Add component mount logging
  const componentDefinitionPattern = /const BenefitsManagement = \(\) => \{/;
  const componentDefinitionReplacement = `const BenefitsManagement = () => {
  console.log('[DEBUG] BenefitsManagement component initializing');`;
  
  if (benefitsManagementContent.match(componentDefinitionPattern)) {
    benefitsManagementContent = benefitsManagementContent.replace(componentDefinitionPattern, componentDefinitionReplacement);
    console.log('✅ Added initialization logging to BenefitsManagement component');
  } else {
    console.warn('⚠️ Could not find BenefitsManagement component definition');
  }
  
  // Add useEffect for component mount/unmount logging
  const useEffectPattern = /useEffect\(\(\) => \{\s*const fetchUserData = async \(\) => \{/;
  const useEffectReplacement = `// Log component mount/unmount
  useEffect(() => {
    console.log('[DEBUG] BenefitsManagement component mounted');
    return () => {
      console.log('[DEBUG] BenefitsManagement component unmounted');
    };
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {`;
  
  if (benefitsManagementContent.match(useEffectPattern)) {
    benefitsManagementContent = benefitsManagementContent.replace(useEffectPattern, useEffectReplacement);
    console.log('✅ Added mount/unmount logging to BenefitsManagement component');
  } else {
    console.warn('⚠️ Could not find useEffect for fetchUserData');
  }
  
  // Enhanced return statement
  const returnPattern = /return \(\s*<div className="p-4">/;
  const returnReplacement = `console.log('[DEBUG] BenefitsManagement component rendering');
  return (
    <div className="p-4" data-component="benefits-management">`;
  
  if (benefitsManagementContent.match(returnPattern)) {
    benefitsManagementContent = benefitsManagementContent.replace(returnPattern, returnReplacement);
    console.log('✅ Enhanced return statement with rendering log');
  } else {
    console.warn('⚠️ Could not find return statement');
  }
  
  fs.writeFileSync(benefitsManagementPath, benefitsManagementContent);
  console.log('✅ Successfully updated BenefitsManagement.js');
} catch (error) {
  console.error('❌ Error updating BenefitsManagement.js:', error);
  // Try to restore from backup
  try {
    fs.copyFileSync(benefitsManagementBackupPath, benefitsManagementPath);
    console.log('✅ Restored BenefitsManagement.js from backup');
  } catch (restoreError) {
    console.error('❌ Error restoring BenefitsManagement.js from backup:', restoreError);
  }
}

// Create documentation in the forms folder
try {
  const docPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/forms/BENEFITS_RENDERING_DEBUG.md');
  const docContent = `# Benefits Management Rendering Debug

## Overview
This document outlines the debugging approach implemented for the Benefits Management feature in the HR module, where clicking on the "Benefits" menu item in the HR menu was not properly rendering the BenefitsManagement component in the main content area.

## Version History
- v1.0 (April 28, 2025) - Initial debug implementation

## Debugging Approach
This debug build adds comprehensive logging throughout the component lifecycle to identify why the Benefits Management component isn't rendering when the menu item is clicked, despite other HR menu items working correctly.

## Instrumented Files and Components

### listItems.js:
- Enhanced the Benefits menu item click handler with detailed logging
- Added logging to handleItemClick function

### DashboardContent.js:
- Added detailed logging to handleHRClick function with stack trace
- Enhanced the benefits-specific code path with additional logging
- Added logging to handleMenuNavigation event handler
- Added logging to updateState function
- Added explicit dependency on showBenefitsManagement in mainContentProps

### RenderMainContent.js:
- Added enhanced logging for the showBenefitsManagement condition
- Added deferred check for showBenefitsManagement state
- Enhanced useEffect for showBenefitsManagement with additional type information

### BenefitsManagement.js:
- Added component initialization logging
- Added component mount/unmount logging
- Added render logging
- Added data-component attribute for easier DOM inspection

## How to Use
1. Run the application and open the browser's developer console
2. Filter console logs for "[DEBUG]" to see the added debugging information
3. Click on the Benefits menu item in the HR menu
4. Observe the logs to track the component lifecycle
5. Look for any disconnects in the event chain or state updates

## Expected Flow
1. Benefits menu item is clicked → listItems.js logs event
2. menuNavigation event is dispatched → DashboardContent.js receives event
3. handleHRClick is called with 'benefits' → DashboardContent.js updates state
4. showBenefitsManagement becomes true → RenderMainContent.js detects change
5. BenefitsManagement component is rendered → Component logs initialization and mount

## Potential Issues to Look For
- Event dispatch or reception issues
- State update failures
- Component mounting/unmounting issues
- Dependencies missing in useEffect hooks
- Rendering conditions evaluating incorrectly

## After Debugging
Once the issue is identified, create a targeted fix script that addresses the specific problem while maintaining the same code structure and approach.
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
  const newEntry = `| F0007 | Version0002_fix_BenefitsManagement_debug.js | Adds comprehensive debug logging to diagnose Benefits menu item not rendering in HR menu | 2025-04-28 | Executed | Multiple files |`;
  
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
console.log('Enhanced debug logging has been added to help diagnose the Benefits menu item issue.');
console.log('Check the browser console for [DEBUG] logs when clicking the Benefits menu item.'); 