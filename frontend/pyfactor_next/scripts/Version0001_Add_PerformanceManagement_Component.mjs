/**
 * Version0001_Add_PerformanceManagement_Component.mjs
 * 
 * Purpose: Add Performance Management component and functionality to the HR menu
 * 
 * Author: Claude
 * Date: 2023-05-01
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const RENDER_MAIN_CONTENT_PATH = 'frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js';
const DASHBOARD_CONTENT_PATH = 'frontend/pyfactor_next/src/components/Dashboard/DashboardContent.js';
const LIST_ITEMS_PATH = 'frontend/pyfactor_next/src/app/dashboard/components/lists/listItems.js';
const FORMS_DIR = 'frontend/pyfactor_next/src/app/dashboard/components/forms';
const PERFORMANCE_MANAGEMENT_PATH = path.join(FORMS_DIR, 'PerformanceManagement.js');
const SCRIPT_REGISTRY_PATH = 'scripts/script_registry.json';

// Utility functions
function createBackup(filePath) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = `scripts/backups/${path.basename(filePath)}.backup-${timestamp}`;
  
  try {
    // Create backups directory if it doesn't exist
    if (!fs.existsSync('scripts/backups')) {
      fs.mkdirSync('scripts/backups', { recursive: true });
    }
    
    // Copy file to backup location
    fs.copyFileSync(filePath, backupPath);
    console.log(`Created backup at ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error(`Failed to create backup for ${filePath}:`, error);
    process.exit(1);
  }
}

// Update script registry
function updateScriptRegistry(scriptName, description, filesModified) {
  try {
    let registry = {};
    
    // Create or read the registry
    if (fs.existsSync(SCRIPT_REGISTRY_PATH)) {
      registry = JSON.parse(fs.readFileSync(SCRIPT_REGISTRY_PATH, 'utf8'));
    }
    
    // Add this script to the registry
    registry[scriptName] = {
      executed: new Date().toISOString(),
      description,
      filesModified
    };
    
    // Write back to the registry file
    fs.writeFileSync(SCRIPT_REGISTRY_PATH, JSON.stringify(registry, null, 2));
    console.log(`Updated script registry at ${SCRIPT_REGISTRY_PATH}`);
  } catch (error) {
    console.error('Failed to update script registry:', error);
  }
}

// Check if necessary files exist
function checkRequiredFiles() {
  const requiredFiles = [RENDER_MAIN_CONTENT_PATH, DASHBOARD_CONTENT_PATH, LIST_ITEMS_PATH];
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.error('Missing required files:', missingFiles.join(', '));
    process.exit(1);
  }
}

// Verify the Performance menu item exists in the HR menu
function checkPerformanceMenuItem() {
  console.log('Checking for Performance menu item in listItems.js...');
  const content = fs.readFileSync(LIST_ITEMS_PATH, 'utf8');
  
  if (content.includes('{ label: \'Performance\', onClick: handleHRClick, value: \'performance\' }')) {
    console.log('✅ Performance menu item already exists');
    return true;
  } else {
    console.log('❌ Performance menu item not found');
    return false;
  }
}

// Add Performance menu item to HR menu if not already present
function addPerformanceMenuItem() {
  console.log('Adding Performance menu item to HR menu...');
  const listItemsBackup = createBackup(LIST_ITEMS_PATH);
  
  let content = fs.readFileSync(LIST_ITEMS_PATH, 'utf8');
  
  // Find the HR menu section and add the Performance menu item before the closing bracket
  const reportsMenuItem = content.match(/label: 'Reports'[\s\S]*?\}/);
  if (reportsMenuItem) {
    const updatedContent = content.replace(
      reportsMenuItem[0] + ',', 
      reportsMenuItem[0] + ',\n        { label: \'Performance\', onClick: handleHRClick, value: \'performance\' },'
    );
    
    fs.writeFileSync(LIST_ITEMS_PATH, updatedContent);
    console.log('✅ Added Performance menu item to HR menu');
  } else {
    console.error('❌ Could not find Reports menu item in HR menu');
  }
  
  return listItemsBackup;
}

// Check if handleHRClick in DashboardContent.js handles the 'performance' section
function checkHandleHRClick() {
  console.log('Checking handleHRClick implementation...');
  const content = fs.readFileSync(DASHBOARD_CONTENT_PATH, 'utf8');
  
  if (content.includes('showPerformanceManagement: section === \'performance\'')) {
    console.log('✅ handleHRClick already handles performance section');
    return true;
  } else {
    console.log('❌ handleHRClick does not handle performance section');
    return false;
  }
}

// Update handleHRClick to handle the performance section
function updateHandleHRClick() {
  console.log('Updating handleHRClick to handle performance section...');
  const dashboardContentBackup = createBackup(DASHBOARD_CONTENT_PATH);
  
  let content = fs.readFileSync(DASHBOARD_CONTENT_PATH, 'utf8');
  
  // Find the else block in handleHRClick and add showPerformanceManagement
  const elseBlock = content.match(/} else \{[\s\S]*?showHRDashboard: section === 'dashboard',[\s\S]*?hrSection: section[^}]*\}/);
  if (elseBlock) {
    const updatedContent = content.replace(
      elseBlock[0],
      elseBlock[0].replace(
        'hrSection: section || \'dashboard\'',
        'showPerformanceManagement: section === \'performance\',\n        hrSection: section || \'dashboard\''
      )
    );
    
    fs.writeFileSync(DASHBOARD_CONTENT_PATH, updatedContent);
    console.log('✅ Updated handleHRClick to handle performance section');
  } else {
    console.error('❌ Could not find the else block in handleHRClick');
  }
  
  return dashboardContentBackup;
}

// Add showPerformanceManagement to initial state in DashboardContent.js
function updateInitialState() {
  console.log('Adding showPerformanceManagement to initial state...');
  
  let content = fs.readFileSync(DASHBOARD_CONTENT_PATH, 'utf8');
  
  if (content.includes('showPerformanceManagement: false')) {
    console.log('✅ showPerformanceManagement already in initial state');
    return;
  }
  
  // Find the uiState declaration and add showPerformanceManagement
  const stateBlockMatch = content.match(/showReportsManagement: false,/);
  if (stateBlockMatch) {
    const updatedContent = content.replace(
      stateBlockMatch[0],
      stateBlockMatch[0] + '\n    showPerformanceManagement: false,'
    );
    
    fs.writeFileSync(DASHBOARD_CONTENT_PATH, updatedContent);
    console.log('✅ Added showPerformanceManagement to initial state');
  } else {
    console.error('❌ Could not find showReportsManagement in initial state');
  }
}

// Check if RenderMainContent.js has the PerformanceManagement import and the condition to render it
function checkRenderMainContent() {
  console.log('Checking RenderMainContent.js...');
  const content = fs.readFileSync(RENDER_MAIN_CONTENT_PATH, 'utf8');
  
  const hasImport = content.includes('import PerformanceManagement from');
  const hasCondition = content.includes('} else if (showPerformanceManagement) {');
  
  if (hasImport && hasCondition) {
    console.log('✅ RenderMainContent.js already has the necessary code');
    return true;
  } else {
    console.log(`❌ RenderMainContent.js is missing ${!hasImport ? 'import' : ''}${!hasImport && !hasCondition ? ' and ' : ''}${!hasCondition ? 'condition' : ''}`);
    return false;
  }
}

// Update RenderMainContent.js to import and handle PerformanceManagement
function updateRenderMainContent() {
  console.log('Updating RenderMainContent.js...');
  const renderMainContentBackup = createBackup(RENDER_MAIN_CONTENT_PATH);
  
  let content = fs.readFileSync(RENDER_MAIN_CONTENT_PATH, 'utf8');
  
  // Add import if it doesn't exist
  if (!content.includes('import PerformanceManagement from')) {
    content = content.replace(
      "import HRReportManagement from '../forms/HRReportManagement';",
      "import HRReportManagement from '../forms/HRReportManagement';\nimport PerformanceManagement from './forms/PerformanceManagement';"
    );
    console.log('✅ Added PerformanceManagement import');
  }
  
  // Add condition to render PerformanceManagement if it doesn't exist
  if (!content.includes('} else if (showPerformanceManagement) {')) {
    const reportsCondition = content.match(/} else if \(showReportsManagement\) \{[\s\S]*?<\/ContentWrapperWithKey>\n\s*\);/);
    if (reportsCondition) {
      const performanceCondition = `      } else if (showPerformanceManagement) {
        console.log('[RenderMainContent] Rendering PerformanceManagement component');
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup 
              componentKey={\`performance-management-\${navigationKey || 'default'}-\${Date.now()}\`}
              fallback={
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              }
            >
              <PerformanceManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );`;
      
      const updatedContent = content.replace(
        reportsCondition[0],
        reportsCondition[0] + '\n' + performanceCondition
      );
      
      fs.writeFileSync(RENDER_MAIN_CONTENT_PATH, updatedContent);
      console.log('✅ Added condition to render PerformanceManagement');
    } else {
      console.error('❌ Could not find showReportsManagement condition');
    }
  }
  
  return renderMainContentBackup;
}

// Main function
async function main() {
  console.log('Starting Performance Management component implementation...');
  checkRequiredFiles();
  
  const filesModified = [];
  try {
    // 1. Check and update HR menu in listItems.js
    let listItemsBackup = null;
    if (!checkPerformanceMenuItem()) {
      listItemsBackup = addPerformanceMenuItem();
      filesModified.push(LIST_ITEMS_PATH);
    }
    
    // 2. Check and update handleHRClick in DashboardContent.js
    let dashboardContentBackup = null;
    if (!checkHandleHRClick()) {
      dashboardContentBackup = updateHandleHRClick();
      filesModified.push(DASHBOARD_CONTENT_PATH);
      
      // Also update the initial state
      updateInitialState();
    }
    
    // 3. Check and update RenderMainContent.js
    let renderMainContentBackup = null;
    if (!checkRenderMainContent()) {
      renderMainContentBackup = updateRenderMainContent();
      filesModified.push(RENDER_MAIN_CONTENT_PATH);
    }
    
    // 4. List backups created
    console.log('\nBackups created:');
    if (listItemsBackup) console.log(`- ${listItemsBackup}`);
    if (dashboardContentBackup) console.log(`- ${dashboardContentBackup}`);
    if (renderMainContentBackup) console.log(`- ${renderMainContentBackup}`);
    
    // 5. Update the script registry
    updateScriptRegistry(
      'Version0001_Add_PerformanceManagement_Component.mjs',
      'Added Performance Management component and functionality to the HR menu',
      filesModified
    );
    
    console.log('\nPerformance Management component implementation completed successfully.');
  } catch (error) {
    console.error('Failed to implement Performance Management component:', error);
    process.exit(1);
  }
}

// Execute the main function
main(); 