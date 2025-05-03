/**
 * Script: Version0002_fix_SalesMenuPropPassing_DashboardContent.js
 * Description: Fixes the Sales menu functionality by adding handleSalesClick to drawerProps in DashboardContent.js
 * 
 * This script modifies the drawerProps in DashboardContent.js to include the handleSalesClick function,
 * which is needed by the MainListItems component to make Sales submenu items work correctly.
 * 
 * Created: 2025-05-02
 * Author: AI Assistant
 * Version: 1.0
 */

import fs from 'fs';
import path from 'path';

// Define paths
const dashboardContentPath = path.resolve(process.cwd(), 'frontend/pyfactor_next/src/components/Dashboard/DashboardContent.js');
const backupDir = path.resolve(process.cwd(), 'scripts/backups');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Create backup of DashboardContent.js
const timestamp = new Date().toISOString().replace(/:/g, '-');
const backupFilePath = path.join(backupDir, `DashboardContent.js.backup-${timestamp}`);
fs.copyFileSync(dashboardContentPath, backupFilePath);
console.log(`Created backup at: ${backupFilePath}`);

// Read the DashboardContent.js file
let content = fs.readFileSync(dashboardContentPath, 'utf8');

// Check if handleSalesClick is already in Drawer component props
if (content.includes('handleSalesClick={handleSalesClick}') || 
    content.includes('handleSalesClick,')) {
  console.log('handleSalesClick is already included in drawerProps - no changes needed');
  process.exit(0);
}

// Locate the Drawer component in the JSX
const drawerComponentMatch = content.match(/\<Drawer\s+\{...drawerProps\}\s+\/\>/);
if (!drawerComponentMatch) {
  console.error('Could not find Drawer component in DashboardContent.js');
  process.exit(1);
}

// Find the drawerProps object using a more general approach
const drawerPropsMatch = content.match(/const\s+drawerProps\s*=\s*useMemo\(\s*\(\)\s*=>\s*\(\s*\{[^]*?\}\s*\)\s*,\s*\[([^]*?)\]\s*\)/s);
if (!drawerPropsMatch) {
  console.error('Could not find drawerProps definition in DashboardContent.js using pattern matching');
  
  // Try a more basic approach - find the nearest drawerProps definition before the Drawer component
  const contentBeforeDrawer = content.substring(0, drawerComponentMatch.index);
  const lastDrawerPropsIndex = contentBeforeDrawer.lastIndexOf('const drawerProps =');
  
  if (lastDrawerPropsIndex === -1) {
    console.error('Could not find drawerProps definition in DashboardContent.js');
    process.exit(1);
  }
  
  // Find the end of the drawerProps object and dependencies array
  const drawerPropsStart = lastDrawerPropsIndex;
  let openBraces = 0;
  let drawerPropsEnd = -1;
  let foundEndOfMemo = false;
  
  for (let i = drawerPropsStart + 20; i < contentBeforeDrawer.length && !foundEndOfMemo; i++) {
    const char = contentBeforeDrawer[i];
    if (char === '{') openBraces++;
    else if (char === '}') {
      openBraces--;
      if (openBraces === 0) {
        // Look for the closing pattern of useMemo: ]), [dependencies])
        const nextChars = contentBeforeDrawer.substring(i, i + 20);
        if (nextChars.includes(']), [') && nextChars.includes(']')) {
          drawerPropsEnd = contentBeforeDrawer.indexOf('])', i) + 2;
          foundEndOfMemo = true;
        }
      }
    }
  }
  
  if (drawerPropsEnd === -1) {
    console.error('Could not find the end of drawerProps definition in DashboardContent.js');
    process.exit(1);
  }
  
  // Now manually update both the drawerProps object and the dependency array
  const drawerPropsDefinition = contentBeforeDrawer.substring(drawerPropsStart, drawerPropsEnd);
  
  // Find the point to add handleSalesClick to the object
  const lastProperty = drawerPropsDefinition.lastIndexOf(',\n');
  if (lastProperty === -1) {
    console.error('Could not identify property list in drawerProps');
    process.exit(1);
  }
  
  const updatedDrawerPropsDefinition = 
    drawerPropsDefinition.substring(0, lastProperty) + 
    ',\n    handleSalesClick' + 
    drawerPropsDefinition.substring(lastProperty);
  
  // Find the dependency array
  const dependencyStart = updatedDrawerPropsDefinition.lastIndexOf('[');
  const dependencyEnd = updatedDrawerPropsDefinition.lastIndexOf(']');
  
  if (dependencyStart === -1 || dependencyEnd === -1) {
    console.error('Could not find dependency array in drawerProps');
    process.exit(1);
  }
  
  const updatedDrawerPropsDefinitionWithDependency = 
    updatedDrawerPropsDefinition.substring(0, dependencyEnd) + 
    ', handleSalesClick' + 
    updatedDrawerPropsDefinition.substring(dependencyEnd);
  
  // Update the content
  content = 
    content.substring(0, drawerPropsStart) + 
    updatedDrawerPropsDefinitionWithDependency + 
    content.substring(drawerPropsEnd);
  
  // Write the updated content back to the file
  fs.writeFileSync(dashboardContentPath, content, 'utf8');
  console.log('Successfully added handleSalesClick to drawerProps in DashboardContent.js using manual update');
  
  // Create a script registry entry
  updateRegistry(dashboardContentPath);
  
  console.log('Script completed successfully!');
  process.exit(0);
}

// Extract the drawerProps object content and its dependencies
const fullMatch = drawerPropsMatch[0];
const dependencies = drawerPropsMatch[1].trim();

// Check if handleSalesClick is already in the dependencies
if (dependencies.includes('handleSalesClick')) {
  console.log('handleSalesClick is already included in drawerProps dependencies - no changes needed');
  process.exit(0);
}

// Find where to add handleSalesClick in the object
const objectEndIndex = fullMatch.lastIndexOf('}, [');
if (objectEndIndex === -1) {
  console.error('Could not find the end of drawerProps object');
  process.exit(1);
}

// Add handleSalesClick to the drawerProps object
const updatedObjectContent = 
  fullMatch.substring(0, objectEndIndex) + 
  ',\n    handleSalesClick' + 
  fullMatch.substring(objectEndIndex);

// Add handleSalesClick to the dependencies
const updatedFullMatch = 
  updatedObjectContent.substring(0, updatedObjectContent.lastIndexOf(']')) + 
  (dependencies.endsWith(',') ? ' ' : ', ') + 
  'handleSalesClick' + 
  updatedObjectContent.substring(updatedObjectContent.lastIndexOf(']'));

// Replace the original drawerProps definition with the updated one
const updatedContent = content.replace(fullMatch, updatedFullMatch);

// Write the updated content back to the file
fs.writeFileSync(dashboardContentPath, updatedContent, 'utf8');
console.log('Successfully added handleSalesClick to drawerProps in DashboardContent.js');

// Update registry
updateRegistry(dashboardContentPath);

console.log('Script completed successfully!');

// Helper function to update the script registry
function updateRegistry(modifiedFilePath) {
  const registryFile = path.join(process.cwd(), 'scripts', 'script_registry.json');

  try {
    // Check if registry file exists and read it
    let registry = [];
    if (fs.existsSync(registryFile)) {
      const registryData = fs.readFileSync(registryFile, 'utf8');
      try {
        registry = JSON.parse(registryData);
        // Make sure registry is an array
        if (!Array.isArray(registry)) {
          console.warn('Registry file does not contain an array. Creating new registry.');
          registry = [];
        }
      } catch (e) {
        console.warn('Failed to parse registry file. Creating new registry.');
        registry = [];
      }
    }

    // Add new script entry
    registry.push({
      name: 'Version0002_fix_SalesMenuPropPassing_DashboardContent.js',
      description: 'Fixes the Sales menu functionality by adding handleSalesClick to drawerProps',
      dateExecuted: new Date().toISOString(),
      status: 'success',
      version: '1.0',
      modifiedFiles: [modifiedFilePath]
    });

    // Write updated registry
    fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2), 'utf8');
    console.log('Updated script registry');
  } catch (error) {
    console.error('Failed to update script registry:', error.message);
    console.log('Script completed but registry update failed');
    // Don't exit with error since the main functionality succeeded
  }
} 