/**
 * Script: Version0007_final_settings_validation.js
 * Description: Validates and fixes any remaining issues with the Settings Management component
 * Changes:
 * - Ensures all required imports are present
 * - Makes sure the company profile integration is properly connected
 * - Validates the user management tab structure
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

// Update the SettingsManagement component to fix remaining issues
function validateSettingsManagement() {
  try {
    // Create backup
    backupFile(settingsManagementPath, 'SettingsManagement.js');

    // Read the file
    let content = fs.readFileSync(settingsManagementPath, 'utf8');

    // Make sure imports are correct
    if (!content.includes("import { Tab } from '@headlessui/react';")) {
      console.log('⚠️ Tab import is missing, adding it...');
      content = content.replace(
        "import React, { useState, useEffect, useCallback, useRef } from 'react';",
        "import React, { useState, useEffect, useCallback, useRef } from 'react';\nimport { Tab } from '@headlessui/react';"
      );
    }

    // Ensure we have the logger import correctly set up
    if (!content.includes("import { logger } from")) {
      console.log('⚠️ Logger import is missing, adding it...');
      content = content.replace(
        "import { Tab } from '@headlessui/react';",
        "import { Tab } from '@headlessui/react';\nimport { logger } from '@/utils/logger';"
      );
    }

    // Ensure the API import is present
    if (!content.includes("import api from")) {
      console.log('⚠️ API import is missing, adding it...');
      content = content.replace(
        "import { logger } from '@/utils/logger';",
        "import { logger } from '@/utils/logger';\nimport api from '@/services/api';"
      );
    }

    // Ensure the notification helpers are present
    if (!content.includes("const notifySuccess") && !content.includes("const notifyError")) {
      console.log('⚠️ Notification helpers are missing, adding them...');
      const notificationHelpers = `
  // Notification helpers
  const notifySuccess = (message) => {
    console.log('[SUCCESS]', message);
    // Implement toast/notification system here
  };
  
  const notifyError = (message) => {
    console.error('[ERROR]', message);
    // Implement toast/notification system here
  };`;
      
      // Insert after component definition
      content = content.replace(
        /const SettingsManagement = \(\) => {/,
        `const SettingsManagement = () => {${notificationHelpers}`
      );
    }

    // Check for isOwner function
    if (!content.includes("const isOwner = () =>")) {
      console.log('⚠️ isOwner function is missing, adding it...');
      const isOwnerFunc = `
  // Check if current user is owner
  const isOwner = () => {
    const userRole = localStorage.getItem('userRole') || '';
    return userRole.toLowerCase().includes('owner');
  };`;
      
      // Insert after notification helpers
      if (content.includes("// Notification helpers")) {
        content = content.replace(
          /\/\/ Implement toast\/notification system here\n  };/,
          "// Implement toast/notification system here\n  };" + isOwnerFunc
        );
      } else {
        // Insert after component definition
        content = content.replace(
          /const SettingsManagement = \(\) => {/,
          `const SettingsManagement = () => {\n  // Check if current user is owner
  const isOwner = () => {
    const userRole = localStorage.getItem('userRole') || '';
    return userRole.toLowerCase().includes('owner');
  };`
        );
      }
    }

    // Ensure the render function has both sections correctly implemented
    const renderSectionsPattern = /  \/\/ Render the active section[\s\S]*?switch \(activeSection\) {[\s\S]*?}\n  };/;
    if (!renderSectionsPattern.test(content)) {
      console.log('⚠️ renderActiveSection function is not properly defined, fixing it...');
      
      const newRenderActiveSection = `  // Render the active section based on state
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'companyProfile':
        return renderCompanyProfile();
      case 'userManagement':
        return renderUserManagement();
      default:
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold">Section Not Found</h3>
            <p className="text-gray-600">The requested settings section was not found.</p>
          </div>
        );
    }
  };`;
      
      // Find the position to insert the renderActiveSection function
      // Insert after the last render function
      const lastRenderFuncEnd = content.lastIndexOf('  };') + 4;
      content = content.slice(0, lastRenderFuncEnd) + '\n\n' + newRenderActiveSection + content.slice(lastRenderFuncEnd);
    }

    // Fix the final render method if it's incorrect
    const finalRenderMethod = `  return (
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

    // Replace the return statement at the end of the file
    const returnPattern = /  return \(\s*<div[\s\S]*?<\/div>\s*\);/g;
    const returnMatches = content.match(returnPattern);
    if (returnMatches && returnMatches.length > 0) {
      // Replace the last occurrence
      const lastReturnMatch = returnMatches[returnMatches.length - 1];
      content = content.replace(lastReturnMatch, finalRenderMethod);
    }

    // Write the updated content back to the file
    fs.writeFileSync(settingsManagementPath, content, 'utf8');
    console.log('✅ Updated SettingsManagement.js with final validations');
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
    scriptName: 'Version0007_final_settings_validation.js',
    executionDate: new Date().toISOString(),
    description: 'Validates and fixes any remaining issues with the Settings Management component',
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
  console.log('🔧 Starting final validation of Settings Management component...');
  
  const validationCompleted = validateSettingsManagement();
  
  if (validationCompleted) {
    updateScriptRegistry();
    console.log('✅ Settings Management validation completed successfully!');
  } else {
    console.error('❌ Settings Management validation failed.');
  }
}

// Execute the main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
}); 