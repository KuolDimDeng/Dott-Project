/**
 * Script: Version0001_fix_SalesMenu_DashboardContent.js
 * Description: Fixes the Sales menu functionality by implementing the handleSalesClick handler in DashboardContent.js
 * 
 * This script adds the missing handleSalesClick function to the DashboardContent component to ensure
 * that the Products, Services, Estimates, Orders, Invoices, and Reports menu items work correctly.
 * When a user clicks on these items, the corresponding component will render in the content area.
 * 
 * Created: 2025-05-01
 * Author: AI Assistant
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

// Find the position where we should insert our handleSalesClick function
// Look for the handleInventoryClick function which should be nearby
const inventoryClickPosition = content.indexOf('const handleInventoryClick = useCallback(');

if (inventoryClickPosition === -1) {
  console.error('Could not find handleInventoryClick function. Aborting.');
  process.exit(1);
}

// Find the appropriate position to insert (right before handleInventoryClick)
// First, look backward to find the closing brace of the previous function
let insertPosition = inventoryClickPosition;
let braceCount = 0;
let foundClosingBrace = false;

for (let i = insertPosition - 1; i >= 0; i--) {
  if (content[i] === '}') {
    braceCount++;
  } else if (content[i] === '{') {
    braceCount--;
  }
  
  if (braceCount === 1 && content[i] === '}') {
    foundClosingBrace = true;
    insertPosition = i + 1;
    break;
  }
}

if (!foundClosingBrace) {
  console.error('Could not find appropriate insertion point. Aborting.');
  process.exit(1);
}

// The handleSalesClick function to add - add a comma before it to fix syntax error
const handleSalesClickCode = `,

  const handleSalesClick = useCallback((value) => {
    resetAllStates();
    console.log('[DashboardContent] Sales option selected:', value);
    
    // Generate a unique navigation key for component remounting
    const salesNavKey = \`sales-\${Date.now()}\`;
    
    switch(value) {
      case 'dashboard':
        updateState({ 
          view: 'sales-dashboard',
          navigationKey: salesNavKey
        });
        break;
      case 'products':
        updateState({ 
          showProductManagement: true,
          navigationKey: salesNavKey
        });
        break;
      case 'services':
        updateState({ 
          showServiceManagement: true,
          navigationKey: salesNavKey
        });
        break;
      case 'estimates':
        updateState({ 
          showEstimateManagement: true,
          navigationKey: salesNavKey 
        });
        break;
      case 'orders':
        updateState({ 
          showSalesOrderManagement: true,
          navigationKey: salesNavKey
        });
        break;
      case 'invoices':
        updateState({ 
          showInvoiceManagement: true,
          navigationKey: salesNavKey
        });
        break;
      case 'reports':
        updateState({ 
          view: 'sales-reports',
          navigationKey: salesNavKey
        });
        break;
      default:
        // Default to showing the sales dashboard
        updateState({ 
          view: 'sales-dashboard',
          navigationKey: salesNavKey
        });
    }
    
    console.log(\`[DashboardContent] Navigating to Sales \${value} with key \${salesNavKey}\`);
  }, [resetAllStates, updateState]);
`;

// Insert the handleSalesClick function 
const modifiedContent = content.slice(0, insertPosition) + handleSalesClickCode + content.slice(insertPosition);

// Write the modified content back to the file
fs.writeFileSync(dashboardContentPath, modifiedContent, 'utf8');
console.log('Successfully added handleSalesClick function to DashboardContent.js');

// Create a script registry entry
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
    name: 'Version0001_fix_SalesMenu_DashboardContent.js',
    description: 'Fixes the Sales menu functionality by implementing the handleSalesClick handler',
    dateExecuted: new Date().toISOString(),
    status: 'success',
    modifiedFiles: [dashboardContentPath]
  });

  // Write updated registry
  fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2), 'utf8');
  console.log('Updated script registry');
} catch (error) {
  console.error('Failed to update script registry:', error.message);
  console.log('Script completed but registry update failed');
  // Don't exit with error since the main functionality succeeded
}

console.log('Script completed successfully!'); 