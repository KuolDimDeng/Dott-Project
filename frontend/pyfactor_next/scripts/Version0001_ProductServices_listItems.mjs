/**
 * @fileoverview This script modifies the listItems.js file to update the Sales menu 
 * so that Products and Services links load their respective management pages.
 * 
 * @version 1.0.0
 * @author Claude AI
 * @date 2023-11-15T12:00:00.000Z
 * 
 * This is a one-time script that should be run to update the navigation functionality
 * in the Sales menu of the application.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const sourceFilePath = path.join(__dirname, '../src/app/dashboard/components/lists/listItems.js');
const backupFilePath = path.join(__dirname, 'backups', `listItems.js.backup-${new Date().toISOString().replace(/:/g, '-')}`);

// Create registry entry
const registryEntry = {
  scriptName: 'Version0001_ProductServices_listItems.mjs',
  executionDate: new Date().toISOString(),
  purpose: 'Update Sales menu Products and Services items to load their management pages',
  status: 'pending'
};

console.log('Starting script to update listItems.js Sales menu navigation...');

// Function to update the registry file
const updateRegistry = (status, message = '') => {
  const registryFilePath = path.join(__dirname, 'script_registry.json');
  let registry = [];
  
  // Read existing registry if it exists
  try {
    if (fs.existsSync(registryFilePath)) {
      const registryContent = fs.readFileSync(registryFilePath, 'utf8');
      registry = JSON.parse(registryContent);
    }
  } catch (error) {
    console.error('Error reading registry file:', error);
  }
  
  // Update the current entry
  registryEntry.status = status;
  registryEntry.completionDate = new Date().toISOString();
  if (message) {
    registryEntry.message = message;
  }
  
  // Add the entry to the registry
  registry.push(registryEntry);
  
  // Write the updated registry
  try {
    fs.writeFileSync(registryFilePath, JSON.stringify(registry, null, 2), 'utf8');
    console.log('Registry updated successfully');
  } catch (error) {
    console.error('Error updating registry file:', error);
  }
};

// Main execution
try {
  // Check if the source file exists
  if (!fs.existsSync(sourceFilePath)) {
    throw new Error(`Source file not found: ${sourceFilePath}`);
  }
  
  console.log('Reading source file...');
  
  // Read the file content
  let content = fs.readFileSync(sourceFilePath, 'utf8');
  
  // Create a backup of the original file
  console.log('Creating backup...');
  fs.writeFileSync(backupFilePath, content, 'utf8');
  
  console.log('Backup created successfully at:', backupFilePath);
  
  // The pattern to find the Sales menu items section
  const salesMenuPattern = /{\s*label: 'Products',\s*onClick: handleSalesClick,\s*value: 'products'\s*},\s*{\s*label: 'Services',\s*onClick: handleSalesClick,\s*value: 'services'\s*},/g;
  
  // The replacement text with updated onClick functionality
  const replacementText = `{ 
        label: 'Products', 
        onClick: (value) => {
          // Create navigation event for products
          const navigationKey = \`nav-\${Date.now()}\`;
          const payload = { 
            item: 'product-management', 
            navigationKey,
            originalItem: 'Products'
          };
          
          // Dispatch navigation events
          window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
          window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
          
          // Load the ProductManagement component
          if (typeof handleSalesClick === 'function') {
            handleSalesClick('products');
          }
        }, 
        value: 'products' 
      },
      { 
        label: 'Services', 
        onClick: (value) => {
          // Create navigation event for services
          const navigationKey = \`nav-\${Date.now()}\`;
          const payload = { 
            item: 'service-management', 
            navigationKey,
            originalItem: 'Services'
          };
          
          // Dispatch navigation events
          window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
          window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
          
          // Load the ServiceManagement component
          if (typeof handleSalesClick === 'function') {
            handleSalesClick('services');
          }
        }, 
        value: 'services' 
      },`;
  
  // Replace the pattern in the content
  const updatedContent = content.replace(salesMenuPattern, replacementText);
  
  // Check if any replacements were made
  if (content === updatedContent) {
    throw new Error('No changes made to the file. Pattern not found.');
  }
  
  // Write the updated content back to the file
  console.log('Writing updated content...');
  fs.writeFileSync(sourceFilePath, updatedContent, 'utf8');
  
  console.log('File updated successfully!');
  
  // Update the registry with success status
  updateRegistry('completed');
  
  console.log('Script execution completed successfully.');
} catch (error) {
  console.error('Error:', error.message);
  
  // Update the registry with error status
  updateRegistry('failed', error.message);
  
  // Exit with error code
  process.exit(1);
} 