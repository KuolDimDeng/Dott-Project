/**
 * Script to fix the missing showPerformanceManagement prop in RenderMainContent.js
 * Error: "showPerformanceManagement is not defined"
 * 
 * Author: System
 * Date: 2025-04-28
 */

const fs = require('fs');
const path = require('path');

// Define paths
const RENDER_MAIN_CONTENT_PATH = 'frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js';

// Create a backup of the file
function createBackup(filePath) {
  const backupDir = 'scripts/backups';
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
    console.log('Starting to fix the showPerformanceManagement undefined error...');
    
    // Create a backup before making changes
    createBackup(RENDER_MAIN_CONTENT_PATH);
    
    // Read the file content
    const content = fs.readFileSync(RENDER_MAIN_CONTENT_PATH, 'utf8');
    
    // 1. Check if showPerformanceManagement is already declared in the props
    const hasShowPerformanceManagement = content.includes('showPerformanceManagement,');
    
    if (hasShowPerformanceManagement) {
      console.log('✅ showPerformanceManagement is already declared in the props list');
    } else {
      console.log('❌ showPerformanceManagement is missing from the props list');
      
      // Add showPerformanceManagement to props
      let updatedContent = content;
      
      // Find the position after showReportsManagement
      const showReportsManagementIndex = content.indexOf('showReportsManagement,');
      if (showReportsManagementIndex !== -1) {
        // Insert showPerformanceManagement after showReportsManagement
        updatedContent = content.slice(0, showReportsManagementIndex + 'showReportsManagement,'.length) + 
          '\n  showPerformanceManagement,' + 
          content.slice(showReportsManagementIndex + 'showReportsManagement,'.length);
        
        // Write the updated content back to the file
        fs.writeFileSync(RENDER_MAIN_CONTENT_PATH, updatedContent);
        console.log('✅ Added showPerformanceManagement to props list');
      } else {
        console.log('❌ Could not find showReportsManagement to insert after');
        return;
      }
    }
    
    // 2. Check if showPerformanceManagement is included in the dependency array
    const dependencyArrayMatch = content.match(/\], \[([\s\S]*?)\]\);/);
    if (dependencyArrayMatch) {
      const dependencyArray = dependencyArrayMatch[1];
      
      if (dependencyArray.includes('showPerformanceManagement')) {
        console.log('✅ showPerformanceManagement is already in the dependency array');
      } else {
        console.log('❌ showPerformanceManagement is missing from the dependency array');
        
        // Add showPerformanceManagement to the dependency array
        const updatedContent = content.replace(
          /showReportsManagement,(\s+)\/\/ Add mountedComponents/,
          'showReportsManagement,\n    showPerformanceManagement,$1// Add mountedComponents'
        );
        
        // Write the updated content back to the file
        fs.writeFileSync(RENDER_MAIN_CONTENT_PATH, updatedContent);
        console.log('✅ Added showPerformanceManagement to dependency array');
      }
    }
    
    console.log('✅ Fix completed successfully!');
  } catch (error) {
    console.error('Error during fix:', error);
  }
}

// Run the main function
main(); 