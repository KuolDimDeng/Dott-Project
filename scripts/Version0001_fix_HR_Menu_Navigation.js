/**
 * Script: Version0001_fix_HR_Menu_Navigation.js
 * 
 * Purpose: Fix the Timesheet and Pay menu items in the HR section not properly 
 * rendering in the content area. This script ensures both components properly 
 * receive updated navigationKeys when selected from the menu.
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
const backupFilename = `DashboardContent.js.backup-${timestamp}`;
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
  console.log('Analyzing DashboardContent.js...');
  
  // Fix 1: Update handleHRClick to generate a new navigationKey for Timesheet and Pay menu items
  // This ensures the component is properly unmounted and remounted
  
  // Find handleHRClick function
  const handleHRClickPattern = /const handleHRClick = useCallback\(\(section\) => \{[\s\S]*?if \(section === 'taxes'\) \{[\s\S]*?} else if \(section === 'timesheets'\) \{([\s\S]*?)} else if \(section === 'pay'\) \{([\s\S]*?)} else \{/;
  
  if (!handleHRClickPattern.test(content)) {
    console.log('Could not find handleHRClick function pattern in the expected format.');
    return content;
  }
  
  // Add navigationKey generation to both timesheet and pay sections
  let updatedContent = content.replace(handleHRClickPattern, (match, timesheetSection, paySection) => {
    // For timesheet section
    const updatedTimesheetSection = timesheetSection.replace(
      /updateState\(\{\s*showTimesheetManagement: true,\s*hrSection: section\s*\}\);/,
      `// Generate a unique navigation key for component remounting
      const timesheetNavKey = \`timesheet-\${Date.now()}\`;
      console.log('[DashboardContent] Setting navigationKey for timesheet:', timesheetNavKey);
      
      updateState({
        showTimesheetManagement: true,
        hrSection: section,
        navigationKey: timesheetNavKey
      });`
    );
    
    // For pay section
    const updatedPaySection = paySection.replace(
      /updateState\(\{\s*showPayManagement: true,\s*hrSection: section\s*\}\);/,
      `// Generate a unique navigation key for component remounting
      const payNavKey = \`pay-\${Date.now()}\`;
      console.log('[DashboardContent] Setting navigationKey for pay:', payNavKey);
      
      updateState({
        showPayManagement: true,
        hrSection: section,
        navigationKey: payNavKey
      });`
    );
    
    return `const handleHRClick = useCallback((section) => {
    console.log('[DashboardContent] HR section selected:', section);
    // Hide other sections
    resetAllStates();
    
    if (section === 'taxes') {${match.split('if (section === \'taxes\') {')[1].split('} else if (section === \'timesheets\') {')[0]}} else if (section === 'timesheets') {${updatedTimesheetSection}} else if (section === 'pay') {${updatedPaySection}} else {`;
  });
  
  return updatedContent;
}

// Main execution
try {
  console.log('Starting fix for HR Menu Navigation...');
  
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
  const registryEntry = `| Version0001_fix_HR_Menu_Navigation.js | ${new Date().toISOString()} | Fixed HR menu navigation for Timesheet and Pay items | Completed |\n`;
  
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