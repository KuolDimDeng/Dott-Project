/**
 * Script: Version0001_fix_HR_Pay_menu_RenderMainContent.js
 * 
 * Purpose: Fix the Pay menu item in the HR section that is not rendering the PayManagement page
 * in the content area. This script will back up the original file and apply the necessary fixes.
 * 
 * Date: 2025-04-28
 * Author: Support Team
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory (ES module equivalent to __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const FRONTEND_PATH = '/Users/kuoldeng/projectx/frontend/pyfactor_next';
const RENDER_MAIN_CONTENT_PATH = path.join(FRONTEND_PATH, 'src/app/dashboard/components/RenderMainContent.js');
const BACKUP_PATH = path.join('/Users/kuoldeng/projectx/frontend_file_backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_PATH)) {
  fs.mkdirSync(BACKUP_PATH, { recursive: true });
}

// Create timestamp for backup filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFilename = `RenderMainContent.js.backup-${timestamp}`;
const backupFilePath = path.join(BACKUP_PATH, backupFilename);

// Function to create backup
function createBackup(filePath, backupPath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(backupPath, content);
    console.log(`Backup created at: ${backupPath}`);
    return content;
  } catch (error) {
    console.error(`Error creating backup: ${error.message}`);
    process.exit(1);
  }
}

// Function to apply fix
function applyFix(content) {
  console.log('Analyzing RenderMainContent.js...');
  
  // Problem might be in how the HR section is displaying the PayManagement component
  // Let's make sure the showPayManagement flag is properly handled
  
  // Check if the fix is already applied
  if (content.includes('showPayManagement') && 
      content.includes('PayManagement') && 
      content.includes('<PayManagement />')) {
    console.log('The fix is already applied or partial implementation exists.');
    
    // Debug: Check if there's an issue with navigation from HR Pay menu to PayManagement component
    if (!content.includes('componentKey={`pay-management-${navigationKey || \'default\'}`}')) {
      console.log('Missing proper navigation key for PayManagement component. Applying fix...');
      
      // Find the PayManagement component rendering section
      let updatedContent = content;
      
      // Replace the showPayManagement handling with an explicit implementation
      // that includes proper key generation for component mounting/unmounting
      const payManagementPattern = /} else if \(showPayManagement\) {[\s\S]*?<SuspenseWithCleanup[\s\S]*?<PayManagement \/>[\s\S]*?<\/SuspenseWithCleanup>[\s\S]*?<\/ContentWrapperWithKey>/;
      
      const payManagementReplacement = `} else if (showPayManagement) {
        console.log('[RenderMainContent] Rendering PayManagement component with navigationKey:', navigationKey);
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup 
              componentKey={\`pay-management-\${navigationKey || 'default'}\`} 
              fallback={
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              }
            >
              <PayManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );`;
      
      updatedContent = updatedContent.replace(payManagementPattern, payManagementReplacement);
      
      // Make sure showPayManagement is included in the dependency array
      const dependencyArrayPattern = /\], \[\s*\/\/ Essential dependencies([\s\S]*?)\/\/ HR section dependencies([\s\S]*?)\/\/ Financial management dependencies/;
      if (dependencyArrayPattern.test(updatedContent)) {
        updatedContent = updatedContent.replace(dependencyArrayPattern, (match, essentialDeps, hrDeps) => {
          // Check if showPayManagement is already in HR section dependencies
          if (!hrDeps.includes('showPayManagement')) {
            const updatedHrDeps = hrDeps + '    showPayManagement,\n';
            return `], [\n    // Essential dependencies${essentialDeps}    // HR section dependencies${updatedHrDeps}    // Financial management dependencies`;
          }
          return match;
        });
      }
      
      return updatedContent;
    }
  }
  
  console.log('No specific issues found in RenderMainContent.js. Checking for handleHRClick in DashboardContent.js...');
  
  // The issue might be in DashboardContent.js
  const dashboardContentPath = path.join(FRONTEND_PATH, 'src/components/Dashboard/DashboardContent.js');
  
  if (fs.existsSync(dashboardContentPath)) {
    const dashboardContent = fs.readFileSync(dashboardContentPath, 'utf8');
    
    // Check if the handleHRClick function properly handles the 'pay' section
    const handleHRClickPattern = /const handleHRClick = useCallback\(\(section\) => \{[\s\S]*?\}, \[resetAllStates, updateState\]\);/;
    
    if (handleHRClickPattern.test(dashboardContent)) {
      const handleHRClickMatch = dashboardContent.match(handleHRClickPattern);
      
      if (handleHRClickMatch && handleHRClickMatch[0].includes("section === 'pay'")) {
        console.log('handleHRClick function already handles the "pay" section correctly.');
      } else {
        console.log('The issue might be in the handleHRClick function in DashboardContent.js. Creating script to fix that...');
        createDashboardContentFix();
      }
    }
  }
  
  // If no specific issue found, reinforce the showPayManagement handling in RenderMainContent.js
  return content;
}

// Function to apply fix to DashboardContent.js
function createDashboardContentFix() {
  const dashboardContentPath = path.join(FRONTEND_PATH, 'src/components/Dashboard/DashboardContent.js');
  const dashboardBackupFilename = `DashboardContent.js.backup-${timestamp}`;
  const dashboardBackupFilePath = path.join(BACKUP_PATH, dashboardBackupFilename);
  
  console.log('Creating fix script for DashboardContent.js...');
  
  const fixScriptPath = path.join('/Users/kuoldeng/projectx/scripts', 'Version0002_fix_HR_Pay_menu_DashboardContent.js');
  const fixScriptContent = `/**
 * Script: Version0002_fix_HR_Pay_menu_DashboardContent.js
 * 
 * Purpose: Fix the Pay menu item in the HR section by ensuring the handleHRClick function
 * properly sets showPayManagement to true when the 'pay' section is selected.
 * 
 * Date: 2025-04-28
 * Author: Support Team
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory (ES module equivalent to __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const FRONTEND_PATH = '/Users/kuoldeng/projectx/frontend/pyfactor_next';
const DASHBOARD_CONTENT_PATH = path.join(FRONTEND_PATH, 'src/components/Dashboard/DashboardContent.js');
const BACKUP_PATH = path.join('/Users/kuoldeng/projectx/frontend_file_backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_PATH)) {
  fs.mkdirSync(BACKUP_PATH, { recursive: true });
}

// Create timestamp for backup filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFilename = \`DashboardContent.js.backup-\${timestamp}\`;
const backupFilePath = path.join(BACKUP_PATH, backupFilename);

// Function to create backup
function createBackup(filePath, backupPath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(backupPath, content);
    console.log(\`Backup created at: \${backupPath}\`);
    return content;
  } catch (error) {
    console.error(\`Error creating backup: \${error.message}\`);
    process.exit(1);
  }
}

// Function to apply fix
function applyFix(content) {
  console.log('Analyzing DashboardContent.js...');
  
  // Check if the handleHRClick function properly handles the 'pay' section
  const handleHRClickPattern = /const handleHRClick = useCallback\\(\\(section\\) => \\{[\\s\\S]*?\\}, \\[resetAllStates, updateState\\]\\);/;
  
  if (handleHRClickPattern.test(content)) {
    console.log('Found handleHRClick function, checking if it handles the pay section...');
    
    const handleHRClickMatch = content.match(handleHRClickPattern);
    
    if (handleHRClickMatch && handleHRClickMatch[0].includes("section === 'pay'")) {
      console.log('handleHRClick function already handles the "pay" section correctly.');
      return content;
    }
    
    // Add handling for the 'pay' section
    const updatedHandleHRClick = handleHRClickMatch[0].replace(
      /} else if \\(section === 'timesheets'\\) \\{([\\s\\S]*?)\\} else \\{/,
      \`} else if (section === 'timesheets') {$1} else if (section === 'pay') {
      // Show pay management component
      console.log('[DashboardContent] Setting showPayManagement to true for section:', section);
      updateState({
        showPayManagement: true,
        hrSection: section
      });
      
      // Log the state immediately after update
      console.log('[DashboardContent] State after update:', { 
        showPayManagement: true, 
        hrSection: section 
      });
    } else {\`
    );
    
    return content.replace(handleHRClickPattern, updatedHandleHRClick);
  }
  
  console.log('Could not find handleHRClick function in the expected format.');
  return content;
}

// Main execution
try {
  console.log('Starting fix for DashboardContent.js...');
  
  // Create backup
  const originalContent = createBackup(DASHBOARD_CONTENT_PATH, backupFilePath);
  
  // Apply fix
  const updatedContent = applyFix(originalContent);
  
  // Write fixed content if changes were made
  if (updatedContent !== originalContent) {
    fs.writeFileSync(DASHBOARD_CONTENT_PATH, updatedContent);
    console.log('Fix applied successfully to DashboardContent.js');
  } else {
    console.log('No changes needed or could not apply fix to DashboardContent.js');
  }
  
  // Update script registry
  const registryPath = path.join('/Users/kuoldeng/projectx/scripts', 'script_registry.md');
  const registryEntry = \`| Version0002_fix_HR_Pay_menu_DashboardContent.js | \${new Date().toISOString()} | Fixed HR Pay menu click handler in DashboardContent.js | Completed |\n\`;
  
  if (fs.existsSync(registryPath)) {
    fs.appendFileSync(registryPath, registryEntry);
  } else {
    fs.writeFileSync(registryPath, \`# Script Registry\n\n| Script Name | Date | Purpose | Status |\n| --- | --- | --- | --- |\n\${registryEntry}\`);
  }
  
  console.log('Script registry updated.');
} catch (error) {
  console.error(\`Error: \${error.message}\`);
  process.exit(1);
}
`;
  
  fs.writeFileSync(fixScriptPath, fixScriptContent);
  console.log(`Created fix script for DashboardContent.js at: ${fixScriptPath}`);
}

// Main execution
try {
  console.log('Starting fix for RenderMainContent.js...');
  
  // Create backup
  const originalContent = createBackup(RENDER_MAIN_CONTENT_PATH, backupFilePath);
  
  // Apply fix
  const updatedContent = applyFix(originalContent);
  
  // Write fixed content if changes were made
  if (updatedContent !== originalContent) {
    fs.writeFileSync(RENDER_MAIN_CONTENT_PATH, updatedContent);
    console.log('Fix applied successfully to RenderMainContent.js');
  } else {
    console.log('No changes needed or could not apply fix to RenderMainContent.js');
  }
  
  // Update script registry
  const registryPath = path.join('/Users/kuoldeng/projectx/scripts', 'script_registry.md');
  const registryEntry = `| Version0001_fix_HR_Pay_menu_RenderMainContent.js | ${new Date().toISOString()} | Fixed HR Pay menu rendering in RenderMainContent.js | Completed |\n`;
  
  if (fs.existsSync(registryPath)) {
    fs.appendFileSync(registryPath, registryEntry);
  } else {
    fs.writeFileSync(registryPath, `# Script Registry\n\n| Script Name | Date | Purpose | Status |\n| --- | --- | --- | --- |\n${registryEntry}`);
  }
  
  console.log('Script registry updated.');
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
} 