/**
 * Script: Version0002_fix_settings_menu_rendering.js
 * Description: Fixes the rendering of the Settings Management component
 * Changes:
 * - Ensures proper rendering of SettingsManagement component when selected from the menu
 * - Adds logging to help debug rendering issues
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
const renderMainContentPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js');
const dashboardContentPath = path.join(__dirname, '../frontend/pyfactor_next/src/components/Dashboard/DashboardContent.js');

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

// Add renderSettingsTabs function to RenderMainContent if it doesn't exist
function fixRenderMainContent() {
  try {
    // Create backup
    backupFile(renderMainContentPath, 'RenderMainContent.js');

    // Read the file
    let content = fs.readFileSync(renderMainContentPath, 'utf8');

    // Check if renderSettingsTabs is already defined
    if (!content.includes('const renderSettingsTabs =')) {
      // Define the renderSettingsTabs function to add
      const renderSettingsTabsFunction = `
  // Define the renderSettingsTabs function
  const renderSettingsTabs = useMemo(() => {
    console.log('[RenderMainContent] renderSettingsTabs called with selectedSettingsOption:', selectedSettingsOption);
    
    // If there's no selected option, return null
    if (!selectedSettingsOption) {
      return null;
    }
    
    // Handle the case where selectedSettingsOption is exactly 'Settings'
    if (selectedSettingsOption === 'Settings') {
      console.log('[renderSettingsTabs] Settings option handled elsewhere now');
      return null;
    }
    
    // Otherwise, render the appropriate component based on the selected option
    switch (selectedSettingsOption) {
      case 'profile':
        return <ProfileSettings />;
      case 'business':
        return <BusinessSettings />;
      case 'accounting':
        return <AccountingSettings />;
      case 'payroll':
        return <PayrollSettings />;
      case 'device':
        return <DeviceSettings />;
      case 'integrations':
        return <IntegrationSettings />;
      default:
        return null;
    }
  }, [selectedSettingsOption]);
`;

      // Find a good position to insert the function (right before the return statement in the try block)
      const position = content.indexOf('try {') + 6;
      content = content.slice(0, position) + renderSettingsTabsFunction + content.slice(position);
    }

    // Add renderSettingsTabs to the dependency array if it's not there
    if (!content.includes('renderSettingsTabs,')) {
      const dependencyArrayPattern = /(]\), \[[\s\S]*?)(];)/;
      content = content.replace(dependencyArrayPattern, '$1renderSettingsTabs, $2');
    }

    // Make sure selectedSettingsOption logging is improved
    if (!content.includes('DEBUG - Settings rendering check')) {
      const loggingPattern = /console\.log\('\[RenderMainContent\] (.*?) selectedSettingsOption:(.*?)\);/;
      content = content.replace(loggingPattern, 
        `console.log('[RenderMainContent] DEBUG - Settings rendering check:', {
          selectedSettingsOption,
          isSettingsOrHelp,
          settingsComponentKey,
          showMyAccount,
          navigationKey
        });`);
    }

    // Ensure direct rendering of SettingsManagement when 'Settings' is selected
    const settingsRenderPattern = /if \(selectedSettingsOption === 'Settings'\) \{([\s\S]*?)\}/;
    if (!content.match(settingsRenderPattern)) {
      const settingsRenderCode = `
        // For Settings Management, render it directly without nested conditions
        // This fixes the issue where Settings Management wasn't rendering properly
        if (selectedSettingsOption === 'Settings') {
          console.log('[RenderMainContent] Rendering Settings Management directly with navigationKey:', navigationKey);
          
          // Ensure we're creating a fresh component with a unique key
          const uniqueKey = \`settings-management-\${navigationKey}-\${Date.now()}\`;
          
          // Render the actual SettingsManagement component
          return (
            <ContentWrapperWithKey className="settings-management-wrapper">
              <SuspenseWithCleanup componentKey={uniqueKey} fallback={
                <div className="p-4">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Settings Management</h2>
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                </div>
              }>
                <SettingsManagement />
              </SuspenseWithCleanup>
            </ContentWrapperWithKey>
          );
        }
      `;
      
      // Find where to insert the settings render code (right after the isSettingsOrHelp check)
      const insertPosition = content.indexOf('if (isSettingsOrHelp)') + 18;
      content = content.slice(0, insertPosition) + settingsRenderCode + content.slice(insertPosition);
    }

    // Write the updated content back to the file
    fs.writeFileSync(renderMainContentPath, content, 'utf8');
    console.log('✅ Updated RenderMainContent.js with proper settings rendering code');
    return true;
  } catch (error) {
    console.error('❌ Error updating RenderMainContent.js:', error.message);
    return false;
  }
}

// Make sure DashboardContent sets selectedSettingsOption to 'Settings'
function fixDashboardContent() {
  try {
    // Create backup
    backupFile(dashboardContentPath, 'DashboardContent.js');

    // Read the file
    let content = fs.readFileSync(dashboardContentPath, 'utf8');

    // Find the handleSettingsClick function
    const settingsClickPattern = /const handleSettingsClick = useCallback\(\(\) => \{([\s\S]*?)\}, \[([\s\S]*?)\]\);/;
    const settingsClickMatch = content.match(settingsClickPattern);

    if (settingsClickMatch) {
      // Make sure it sets selectedSettingsOption to 'Settings'
      if (!settingsClickMatch[1].includes("setSelectedSettingsOption('Settings')")) {
        const updatedFunction = `const handleSettingsClick = useCallback(() => {
    console.log('[DashboardContent] Settings button clicked - Starting Settings navigation');
    try {
      // Reset all other states first
      resetAllStates();
      
      // Set the necessary states to show the Settings view
      setShowMyAccount(false);
      setShowHelpCenter(false);
      
      // Set the selected settings option to 'Settings'
      console.log('[DashboardContent] Setting selectedSettingsOption to "Settings"');
      setSelectedSettingsOption('Settings');
      
      // Force a re-render with a new navigation key
      const newNavKey = \`settings-\${Date.now()}\`;
      console.log(\`[DashboardContent] Updating navigationKey to: \${newNavKey}\`);
      setNavigationKey(newNavKey);
      
      // Close the menu
      handleClose();
      
      console.log('[DashboardContent] Settings navigation completed');
    } catch (error) {
      console.error('[DashboardContent] Error in handleSettingsClick:', error);
    }
  }, [resetAllStates, setShowMyAccount, setShowHelpCenter, setSelectedSettingsOption, setNavigationKey, handleClose]);`;
        
        content = content.replace(settingsClickPattern, updatedFunction);
      }
    }

    // Write the updated content back to the file
    fs.writeFileSync(dashboardContentPath, content, 'utf8');
    console.log('✅ Updated DashboardContent.js with proper settings handling');
    return true;
  } catch (error) {
    console.error('❌ Error updating DashboardContent.js:', error.message);
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
    scriptName: 'Version0002_fix_settings_menu_rendering.js',
    executionDate: new Date().toISOString(),
    description: 'Fixes the rendering of the Settings Management component',
    status: 'SUCCESS',
    filesModified: [
      '/frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js',
      '/frontend/pyfactor_next/src/components/Dashboard/DashboardContent.js'
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
  console.log('🔧 Starting settings menu rendering fix...');
  
  const renderMainContentFixed = fixRenderMainContent();
  const dashboardContentFixed = fixDashboardContent();
  
  if (renderMainContentFixed && dashboardContentFixed) {
    updateScriptRegistry();
    console.log('✅ Settings menu rendering fix completed successfully!');
  } else {
    console.error('❌ Settings menu rendering fix failed.');
  }
}

// Execute the main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
}); 