/**
 * Script: Version0001_fix_SalesMenu_Navigation.js
 * Version: v1.0
 * Purpose: Fix Sales menu navigation for Products and Services menu items 
 * Date: 2025-05-02
 * Developer: Claude AI Assistant
 * 
 * This script addresses a navigation issue where clicking on Products or Services
 * in the Sales menu doesn't render the appropriate content. The issue is in the
 * DashboardContent.js file where navigation handling is implemented.
 * 
 * The fix updates the handleSalesClick function in DashboardContent.js to properly
 * set state values needed to render the correct components.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log helper
const log = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  return message;
};

// Update script registry
const updateScriptRegistry = () => {
  const registryPath = path.join(__dirname, 'script_registry.md');
  
  let content = '';
  try {
    if (fs.existsSync(registryPath)) {
      content = fs.readFileSync(registryPath, 'utf8');
    }
  } catch (err) {
    log(`Error reading script registry: ${err.message}`);
  }
  
  const scriptEntry = `| Version0001_fix_SalesMenu_Navigation.js | Fix Sales menu navigation for Products and Services | v1.0 | 2025-05-02 | Completed |`;
  
  if (!content.includes('Version0001_fix_SalesMenu_Navigation')) {
    // Add header if the file is empty
    if (!content) {
      content = '# Script Registry\n\n| Script Name | Purpose | Version | Date | Status |\n|-------------|---------|---------|------|--------|\n';
    }
    
    // Add the entry
    content += scriptEntry + '\n';
    
    // Write updated content
    fs.writeFileSync(registryPath, content, 'utf8');
    log('Script registry updated successfully.');
  }
};

// Create a backup of the target file
const createBackup = (filePath) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, 'backups');
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const fileName = path.basename(filePath);
    const backupPath = path.join(backupDir, `${fileName}.backup-${timestamp}`);
    
    fs.copyFileSync(filePath, backupPath);
    log(`Created backup at ${backupPath}`);
    
    return backupPath;
  } catch (err) {
    throw new Error(`Failed to create backup: ${err.message}`);
  }
};

// Create SalesServiceManagement component
const createSalesServiceManagement = () => {
  const salesServicePath = path.join(__dirname, '..', 'src', 'app', 'dashboard', 'components', 'forms', 'SalesServiceManagement.js');
  
  // Check if the file already exists
  if (fs.existsSync(salesServicePath)) {
    log('SalesServiceManagement.js already exists, skipping creation');
    return;
  }
  
  const componentContent = `import React from 'react';
import ServiceManagement from './ServiceManagement';

/**
 * A wrapper component for service management in sales context.
 * This component ensures proper initialization of the ServiceManagement component
 * with the salesContext prop to avoid infinite update loops.
 */
const SalesServiceManagement = (props) => {
  // Since this is a separate component, React will handle mounting properly
  return (
    <ServiceManagement 
      salesContext={true}
      {...props}
    />
  );
};

export default SalesServiceManagement;
`;

  fs.writeFileSync(salesServicePath, componentContent, 'utf8');
  log(`Created SalesServiceManagement component at ${salesServicePath}`);
};

// Fix the DashboardContent.js file
const fixDashboardContent = () => {
  try {
    // UPDATED: Correct file path to DashboardContent.js
    const dashboardContentPath = path.join(__dirname, '..', 'src', 'app', 'dashboard', 'DashboardContent.js');
    
    if (!fs.existsSync(dashboardContentPath)) {
      log(`File not found: ${dashboardContentPath}`);
      
      // Check alternative path
      const altPath = path.join(__dirname, '..', 'src', 'components', 'Dashboard', 'DashboardContent.js');
      if (fs.existsSync(altPath)) {
        log(`Found DashboardContent.js at alternative path: ${altPath}`);
        return fixDashboardContentAt(altPath);
      }
      
      return false;
    }
    
    return fixDashboardContentAt(dashboardContentPath);
  } catch (err) {
    throw new Error(`Failed to update DashboardContent.js: ${err.message}`);
  }
};

// Helper function to fix DashboardContent at a specific path
const fixDashboardContentAt = (filePath) => {
  // Create backup
  createBackup(filePath);
  
  // Read file content
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if handleSalesClick function exists and requires updating
  if (content.includes('handleSalesClick = useCallback') && 
      !content.includes('const salesNavKey = `sales-${Date.now()}`;')) {
    
    // Find the handleSalesClick function
    const handleSalesClickRegex = /const handleSalesClick = useCallback\(\(value\) => \{[^}]*\}\, \[[^\]]*\]\);/s;
    const match = content.match(handleSalesClickRegex);
    
    if (match) {
      const updatedFunction = `const handleSalesClick = useCallback((value) => {
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
  }, [resetAllStates, updateState]);`;
        
        // Replace the function
        const updatedContent = content.replace(handleSalesClickRegex, updatedFunction);
        
        // Write updated content
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        log(`DashboardContent.js updated successfully at ${filePath}`);
        
        return true;
      } else {
        log('Could not find handleSalesClick function in expected format.');
        return false;
      }
    } else if (content.includes('const salesNavKey = `sales-${Date.now()}`;')) {
      log('DashboardContent.js already has the navigation key implementation, no update needed.');
      return true;
    } else {
      log('Could not find handleSalesClick function in DashboardContent.js.');
      return false;
    }
  };

// Update the main content rendering component to add showServiceManagement prop
const updateRenderMainContent = () => {
  try {
    // UPDATED: Correct file path to RenderMainContent.js
    const renderMainContentPath = path.join(__dirname, '..', 'src', 'app', 'dashboard', 'components', 'RenderMainContent.js');
    
    if (!fs.existsSync(renderMainContentPath)) {
      log(`File not found: ${renderMainContentPath}`);
      
      // Try jsx extension
      const altPath = path.join(__dirname, '..', 'src', 'app', 'dashboard', 'components', 'RenderMainContent.jsx');
      if (fs.existsSync(altPath)) {
        log(`Found RenderMainContent with jsx extension: ${altPath}`);
        return updateRenderMainContentAt(altPath);
      }
      
      return false;
    }
    
    return updateRenderMainContentAt(renderMainContentPath);
  } catch (err) {
    throw new Error(`Failed to update RenderMainContent.js: ${err.message}`);
  }
};

// Helper function to update RenderMainContent at a specific path
const updateRenderMainContentAt = (filePath) => {
  // Create backup
  createBackup(filePath);
  
  // Read file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if SalesServiceManagement is already imported
  if (!content.includes('SalesServiceManagement')) {
    // Add import
    const importRegex = /import SalesProductManagement from ['"](.*?)['"];/;
    const importMatch = content.match(importRegex);
    
    if (importMatch) {
      const importPath = importMatch[1].replace('ProductManagement', 'ServiceManagement');
      const newImport = `import SalesProductManagement from '${importMatch[1]}';\nimport SalesServiceManagement from '${importPath}';`;
      content = content.replace(importRegex, newImport);
    }
  }
  
  // Check if showServiceManagement prop is handled
  if (!content.includes('{showServiceManagement && <SalesServiceManagement')) {
    // Find the showProductManagement rendering
    const productManagementRegex = /{showProductManagement && <SalesProductManagement[^}]*\/?>}/;
    const productMatch = content.match(productManagementRegex);
    
    if (productMatch) {
      const serviceManagementJSX = `{showServiceManagement && <SalesServiceManagement />}`;
      content = content.replace(productManagementRegex, `${productMatch[0]}\n      ${serviceManagementJSX}`);
    }
  }
  
  // Update props in function parameters
  if (!content.includes('showServiceManagement,')) {
    const propsRegex = /function RenderMainContent\(\{([^}]*)\}\)/;
    const propsMatch = content.match(propsRegex);
    
    if (propsMatch) {
      const updatedProps = propsMatch[1].includes('showProductManagement,') 
        ? propsMatch[1].replace('showProductManagement,', 'showProductManagement, showServiceManagement,')
        : propsMatch[1] + ', showServiceManagement';
      
      content = content.replace(propsRegex, `function RenderMainContent({${updatedProps}})`);
    }
  }
  
  // Write updated content
  fs.writeFileSync(filePath, content, 'utf8');
  log(`RenderMainContent updated successfully at ${filePath}`);
  
  return true;
};

// Main function
const main = async () => {
  try {
    log('Starting Sales menu navigation fix script...');
    
    // Create SalesServiceManagement component
    createSalesServiceManagement();
    
    // Fix DashboardContent.js
    const dashboardResult = fixDashboardContent();
    
    // Update RenderMainContent.js
    const renderResult = updateRenderMainContent();
    
    // Update script registry
    updateScriptRegistry();
    
    if (dashboardResult && renderResult) {
      log('Sales menu navigation fix completed successfully.');
    } else {
      log('Sales menu navigation fix completed with some issues. Please check the logs.');
    }
  } catch (err) {
    log(`Error: ${err.message}`);
    process.exit(1);
  }
};

// Run the script
main(); 