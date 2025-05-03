/**
 * Script: Version0006_implement_company_profile.js
 * Description: Implements the Company Profile section in the Settings Management component
 * Changes:
 * - Creates a proper renderCompanyProfile function
 * - Updates the renderActiveSection function to use the new tabs structure
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

// Update the SettingsManagement component to implement Company Profile
function implementCompanyProfile() {
  try {
    // Create backup
    backupFile(settingsManagementPath, 'SettingsManagement.js');

    // Read the file
    let content = fs.readFileSync(settingsManagementPath, 'utf8');

    // Add the Company Profile render function
    const companyProfileCode = `  // Render the Company Profile section
  const renderCompanyProfile = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Company Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Company details and branding settings.</p>
          </div>
          
          <div className="border-b border-gray-200">
            <dl>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Company name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <input
                    type="text"
                    defaultValue={process.env.NEXT_PUBLIC_COMPANY_NAME || 'Your Company Name'}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Contact email</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <input
                    type="email"
                    defaultValue="contact@example.com"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <textarea
                    rows={3}
                    defaultValue="123 Business St.\\nSuite 100\\nCity, State 12345"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <input
                    type="tel"
                    defaultValue="(555) 123-4567"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Website</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <input
                    type="url"
                    defaultValue="https://example.com"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </dd>
              </div>
            </dl>
          </div>
          
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <button
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save
            </button>
          </div>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Brand Settings</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Logo and branding color configuration.</p>
          </div>
          
          <div className="border-b border-gray-200">
            <dl>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Logo</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="flex items-center space-x-5">
                    <div className="flex-shrink-0 h-16 w-16 bg-gray-100 rounded-md flex items-center justify-center">
                      <svg className="h-10 w-10 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 13H5v-2h14v2Z" />
                      </svg>
                    </div>
                    <div>
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Upload new logo
                      </button>
                    </div>
                  </div>
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Primary color</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="color"
                      defaultValue="#3B82F6"
                      className="h-8 w-16 p-0 border-0"
                    />
                    <span className="ml-3 text-sm text-gray-500">#3B82F6</span>
                  </div>
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Secondary color</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="color"
                      defaultValue="#1E3A8A"
                      className="h-8 w-16 p-0 border-0"
                    />
                    <span className="ml-3 text-sm text-gray-500">#1E3A8A</span>
                  </div>
                </dd>
              </div>
            </dl>
          </div>
          
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <button
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };`;

    // Add the render section after the last icon rendering function
    const afterLastIconFunc = /    };\n  };/;
    content = content.replace(afterLastIconFunc, '    };\n  };\n\n' + companyProfileCode);

    // Update the renderActiveSection function
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

    // Replace existing renderActiveSection function
    const renderActiveSectionPattern = /\/\/ Render the active section[\s\S]*?switch \(activeSection\) {[\s\S]*?}\n  };/;
    content = content.replace(renderActiveSectionPattern, newRenderActiveSection);

    // Write the updated content back to the file
    fs.writeFileSync(settingsManagementPath, content, 'utf8');
    console.log('✅ Updated SettingsManagement.js with Company Profile implementation');
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
    scriptName: 'Version0006_implement_company_profile.js',
    executionDate: new Date().toISOString(),
    description: 'Implements the Company Profile section in the Settings Management component',
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
  console.log('🔧 Starting to implement Company Profile section...');
  
  const companyProfileImplemented = implementCompanyProfile();
  
  if (companyProfileImplemented) {
    updateScriptRegistry();
    console.log('✅ Company Profile implementation completed successfully!');
  } else {
    console.error('❌ Company Profile implementation failed.');
  }
}

// Execute the main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
}); 