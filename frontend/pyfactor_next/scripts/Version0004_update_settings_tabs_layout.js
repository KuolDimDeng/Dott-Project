/**
 * Script: Version0004_update_settings_tabs_layout.js
 * Description: Updates the SettingsManagement component to use a top tab layout for main tabs
 * Changes:
 * - Replaces the sidebar navigation with top tabs for main sections
 * - Maintains the subtabs structure for User Management section
 * - Uses a similar layout to the TimesheetManagement component
 * Version: 1.0
 * Author: Script Generator
 * Date: 2025-05-01
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define file paths
const settingsManagementPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/Settings/components/SettingsManagement.js');

// Create backup directory if it doesn't exist
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Create timestamp for backup filenames
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

// Backup original files
function backupFile(filePath, fileName) {
  const backupPath = path.join(backupDir, `${fileName}.backup-${timestamp}`);
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Backup created: ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating backup for ${fileName}:`, error.message);
    return false;
  }
}

// Update the SettingsManagement component with a new top tab layout
function updateSettingsLayout() {
  try {
    // Create backup
    backupFile(settingsManagementPath, 'SettingsManagement.js');

    // Read the file
    let content = fs.readFileSync(settingsManagementPath, 'utf8');

    // Add Tab import from headlessui/react
    if (!content.includes("import { Tab } from '@headlessui/react';")) {
      content = content.replace(
        "import React, { useState, useEffect, useCallback, useRef } from 'react';",
        "import React, { useState, useEffect, useCallback, useRef } from 'react';\nimport { Tab } from '@headlessui/react';"
      );
    }

    // Replace the render method with the new tab-based layout
    const newRenderCode = `  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <Tab.Group selectedIndex={navigationItems.findIndex(item => item.id === activeSection)} onChange={(index) => setActiveSection(navigationItems[index].id)}>
          <Tab.List className="flex border-b border-gray-200 bg-gray-50">
            {navigationItems.map((item) => (
              <Tab 
                key={item.id}
                className={({ selected }) => \`
                  py-4 px-6 text-sm font-medium outline-none whitespace-nowrap flex items-center
                  \${selected 
                    ? 'text-blue-600 border-b-2 border-blue-500 bg-white' 
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                \`}
              >
                <span className="mr-2">{renderIcon(item.icon)}</span>
                {item.label}
              </Tab>
            ))}
          </Tab.List>
          
          <Tab.Panels className="p-6">
            {navigationItems.map((item) => (
              <Tab.Panel key={item.id}>
                {renderActiveSection()}
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );`;

    // Replace the existing return method
    const returnPattern = /return \(\s*<div[^]*?<\/div>\s*\);/s;
    content = content.replace(returnPattern, newRenderCode);

    // Write the updated content back to the file
    fs.writeFileSync(settingsManagementPath, content, 'utf8');
    console.log('✅ Updated SettingsManagement.js with a new tab-based layout');
    return true;
  } catch (error) {
    console.error('❌ Error updating SettingsManagement.js:', error.message);
    return false;
  }
}

// Create a script registry entry
function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.json');
  let registry = [];

  // Load existing registry if it exists
  if (fs.existsSync(registryPath)) {
    try {
      registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    } catch (error) {
      console.error('Error reading script registry:', error.message);
    }
  }

  // Add entry for this script
  registry.push({
    scriptName: 'Version0004_update_settings_tabs_layout.js',
    executionDate: new Date().toISOString(),
    description: 'Updates the SettingsManagement component to use a top tab layout for main tabs',
    status: 'SUCCESS',
    filesModified: [
      '/frontend/pyfactor_next/src/app/Settings/components/SettingsManagement.js'
    ]
  });

  // Write registry back to file
  try {
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
    console.log('✅ Updated script registry');
  } catch (error) {
    console.error('❌ Error updating script registry:', error.message);
  }
}

// Run all functions
async function main() {
  console.log('🔧 Starting update of settings tab layout...');
  
  const settingsLayoutUpdated = updateSettingsLayout();
  
  if (settingsLayoutUpdated) {
    updateScriptRegistry();
    console.log('✅ Settings tab layout update completed successfully!');
  } else {
    console.error('❌ Settings tab layout update failed.');
  }
}

// Execute the main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
}); 