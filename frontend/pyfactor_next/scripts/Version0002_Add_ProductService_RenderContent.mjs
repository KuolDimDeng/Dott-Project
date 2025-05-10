/**
 * @fileoverview This script updates RenderMainContent.js to handle product-management
 * and service-management views for the Products and Services menu items.
 * 
 * @version 1.0.0
 * @author Claude AI
 * @date 2023-11-15T14:00:00.000Z
 * 
 * This script complements Version0001_ProductServices_listItems.mjs which updated
 * the navigation in the Sales menu for Products and Services.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const sourceFilePath = path.join(__dirname, '../src/app/dashboard/components/RenderMainContent.js');
const backupFilePath = path.join(__dirname, 'backups', `RenderMainContent.js.backup-${new Date().toISOString().replace(/:/g, '-')}`);

// Create registry entry
const registryEntry = {
  scriptName: 'Version0002_Add_ProductService_RenderContent.mjs',
  executionDate: new Date().toISOString(),
  purpose: 'Update RenderMainContent.js to handle product-management and service-management views',
  status: 'pending'
};

console.log('Starting script to update RenderMainContent.js...');

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
  
  // First pattern: Find the spot just before the final return in renderContent
  // Look for a good spot before the final catch statement at the end of renderContent
  const insertPoint = content.indexOf('// Default or unknown view (main dashboard)');
  
  if (insertPoint === -1) {
    throw new Error('Could not find insertion point in the file. The file structure may have changed.');
  }
  
  // The code to insert for handling product-management and service-management views
  const codeToInsert = `
      // Product Management and Service Management views
      if (view === 'product-management') {
        const productMgmtComponentKey = \`product-management-\${navigationKey || 'default'}\`;
        console.log('[RenderMainContent] Rendering ProductManagement with key:', productMgmtComponentKey);
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={productMgmtComponentKey} fallback={
              <div className="p-4">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Product Management</h2>
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              </div>
            }>
              <ProductManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
      
      if (view === 'service-management') {
        const serviceMgmtComponentKey = \`service-management-\${navigationKey || 'default'}\`;
        console.log('[RenderMainContent] Rendering ServiceManagement with key:', serviceMgmtComponentKey);
        return (
          <ContentWrapperWithKey>
            <SuspenseWithCleanup componentKey={serviceMgmtComponentKey} fallback={
              <div className="p-4">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Service Management</h2>
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              </div>
            }>
              <ServiceManagement />
            </SuspenseWithCleanup>
          </ContentWrapperWithKey>
        );
      }
`;
  
  // Insert the code just before the default or unknown view section
  const updatedContent = content.slice(0, insertPoint) + codeToInsert + content.slice(insertPoint);
  
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