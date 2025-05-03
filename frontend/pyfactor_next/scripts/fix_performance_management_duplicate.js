/**
 * fix_performance_management_duplicate.js
 *
 * Fixes duplicate declarations of PerformanceManagement and MyAccount components in RenderMainContent.js
 */

const fs = require('fs');
const path = require('path');

// File paths
const renderMainContentPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js');

// Create backup
function createBackup(filePath) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = `${filePath}.backup-${timestamp}`;
  
  fs.copyFileSync(filePath, backupPath);
  console.log(`Created backup at ${backupPath}`);
  return backupPath;
}

// Fix duplicate declarations
function fixDuplicateDeclarations() {
  console.log('Fixing duplicate component declarations in RenderMainContent.js...');
  
  // Create backup
  const backup = createBackup(renderMainContentPath);
  
  // Read file content
  let content = fs.readFileSync(renderMainContentPath, 'utf8');
  
  // Fix imports at the top - remove direct import of PerformanceManagement
  content = content.replace(/import PerformanceManagement from '\.\/forms\/PerformanceManagement';?\n/g, '');
  
  // Fix duplicate MyAccount import if present
  content = content.replace(/import MyAccount from '[^']+';?\n/g, '');
  
  // Make sure the lazy-loaded declarations exist only once
  // Check if PerformanceManagement declaration exists
  if (content.indexOf('const PerformanceManagement = enhancedLazy') === -1) {
    // Add it if it doesn't exist
    const insertPoint = content.indexOf('// Add lazy loading for Transport components');
    if (insertPoint !== -1) {
      content = content.slice(0, insertPoint) + 
        "const PerformanceManagement = enhancedLazy(() => import('./forms/PerformanceManagement.js'), 'Performance Management');\n" + 
        content.slice(insertPoint);
    }
  }
  
  // Check if MyAccount declaration exists
  if (content.indexOf('const MyAccount = enhancedLazy') === -1) {
    // Add it if it doesn't exist
    const insertPoint = content.indexOf('const HelpCenter = enhancedLazy');
    if (insertPoint !== -1) {
      content = content.slice(0, insertPoint) + 
        "const MyAccount = enhancedLazy(() => import('@/app/Settings/components/MyAccount'), 'My Account');\n" + 
        content.slice(insertPoint);
    }
  }
  
  // Check if showPerformanceManagement rendering block exists
  if (content.indexOf('} else if (showPerformanceManagement) {') === -1) {
    // Add it if it doesn't exist
    const insertPoint = content.indexOf('} else if (showReportsManagement) {');
    if (insertPoint !== -1) {
      const reportsBlock = content.slice(
        insertPoint, 
        content.indexOf(')', content.indexOf('</ContentWrapperWithKey>', insertPoint)) + 1
      );
      
      // Clone the block and modify it for PerformanceManagement
      let performanceBlock = reportsBlock
        .replace(/showReportsManagement/g, 'showPerformanceManagement')
        .replace(/ReportsManagement/g, 'PerformanceManagement')
        .replace(/reports-management/g, 'performance-management');
      
      content = content.slice(0, insertPoint + reportsBlock.length) + 
        performanceBlock + 
        content.slice(insertPoint + reportsBlock.length);
    }
  }
  
  // Write fixed content back to file
  fs.writeFileSync(renderMainContentPath, content);
  console.log('Fixed duplicate declarations in RenderMainContent.js');
  
  return backup;
}

// Main execution
try {
  const backup = fixDuplicateDeclarations();
  console.log(`Success! Backup created at ${backup}`);
} catch (error) {
  console.error('Error fixing duplicate declarations:', error);
  process.exit(1);
} 