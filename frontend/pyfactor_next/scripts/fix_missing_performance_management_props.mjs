/**
 * Script to fix the missing showPerformanceManagement in mainContentProps in DashboardContent.js
 * 
 * Author: System
 * Date: 2025-04-28
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const DASHBOARD_CONTENT_PATH = path.join(process.cwd(), 'frontend/pyfactor_next/src/components/Dashboard/DashboardContent.js');

// Create a backup of the file
function createBackup(filePath) {
  const backupDir = path.join(process.cwd(), 'scripts/backups');
  // Ensure the backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = path.join(backupDir, `${path.basename(filePath)}.backup-${timestamp}`);
  
  // Copy the original file to the backup location
  fs.copyFileSync(filePath, backupPath);
  console.log(`✅ Created backup at ${backupPath}`);
  
  return backupPath;
}

// Main function
async function main() {
  try {
    console.log('Starting to fix missing showPerformanceManagement in mainContentProps...');
    
    // Create a backup before making changes
    createBackup(DASHBOARD_CONTENT_PATH);
    
    // Read the file content
    let content = fs.readFileSync(DASHBOARD_CONTENT_PATH, 'utf8');
    let madeChanges = false;
    
    // Check if showPerformanceManagement is included in mainContentProps
    if (content.includes('showPerformanceManagement: uiState.showPerformanceManagement')) {
      console.log('✅ showPerformanceManagement is already included in mainContentProps');
    } else {
      console.log('❌ showPerformanceManagement is missing from mainContentProps');
      
      // Find a good insertion point in the mainContentProps object
      // Look for showReportsManagement in the props list
      let updatedContent;
      
      // Try with showReportsManagement
      const regex1 = /(showReportsManagement: uiState\.showReportsManagement,\s*)/;
      if (content.match(regex1)) {
        updatedContent = content.replace(
          regex1,
          `$1showPerformanceManagement: uiState.showPerformanceManagement,\n    `
        );
        madeChanges = true;
      } else {
        // Try with showBenefitsManagement
        const regex2 = /(showBenefitsManagement: uiState\.showBenefitsManagement,\s*)/;
        if (content.match(regex2)) {
          updatedContent = content.replace(
            regex2,
            `$1showPerformanceManagement: uiState.showPerformanceManagement,\n    `
          );
          madeChanges = true;
        } else {
          // Try other HR-related props
          const regex3 = /(showHRDashboard: uiState\.showHRDashboard,\s*)/;
          if (content.match(regex3)) {
            updatedContent = content.replace(
              regex3,
              `$1showPerformanceManagement: uiState.showPerformanceManagement,\n    `
            );
            madeChanges = true;
          } else {
            console.log('❌ Could not find appropriate insertion point in mainContentProps');
            return;
          }
        }
      }
      
      if (madeChanges) {
        // Write the updated content back to the file
        fs.writeFileSync(DASHBOARD_CONTENT_PATH, updatedContent);
        console.log('✅ Added showPerformanceManagement to mainContentProps');
      }
    }
    
    // Check if uiState.showPerformanceManagement is included in the dependency array
    if (content.includes('uiState.showPerformanceManagement')) {
      // Find the dependency array in a simpler way
      const depsRegex = /\, uiState\.showBenefitsManagement\]\)/;
      if (content.match(depsRegex)) {
        console.log('Found dependency array end pattern');
        // Add showPerformanceManagement to the dependency array
        const updatedContent = content.replace(
          depsRegex,
          ', uiState.showBenefitsManagement, uiState.showPerformanceManagement])'
        );
        
        if (updatedContent !== content) {
          fs.writeFileSync(DASHBOARD_CONTENT_PATH, updatedContent);
          madeChanges = true;
          console.log('✅ Added uiState.showPerformanceManagement to the dependency array');
        } else {
          console.log('❌ No changes were made to the dependency array');
        }
      } else {
        console.log('❌ Could not find dependency array pattern');
      }
    }
    
    console.log('✅ Fix completed successfully!');
  } catch (error) {
    console.error('Error during fix:', error);
  }
}

// Run the main function
main(); 