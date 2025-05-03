/**
 * Script to fix the missing showPerformanceManagement prop in RenderMainContent.js
 * Error: "showPerformanceManagement is not defined"
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
const RENDER_MAIN_CONTENT_PATH = path.join(process.cwd(), 'frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js');

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
    console.log('Starting to fix the showPerformanceManagement undefined error...');
    
    // Create a backup before making changes
    createBackup(RENDER_MAIN_CONTENT_PATH);
    
    // Read the file content
    let content = fs.readFileSync(RENDER_MAIN_CONTENT_PATH, 'utf8');
    let updatedContent = content;
    let madeChanges = false;
    
    // 1. Check if showPerformanceManagement is already declared in the props
    const hasShowPerformanceManagement = content.includes('showPerformanceManagement,');
    
    if (hasShowPerformanceManagement) {
      console.log('✅ showPerformanceManagement is already declared in the props list');
    } else {
      console.log('❌ showPerformanceManagement is missing from the props list');
      
      // Find the position after showReportsManagement
      const showReportsManagementIndex = content.indexOf('showReportsManagement,');
      if (showReportsManagementIndex !== -1) {
        // Insert showPerformanceManagement after showReportsManagement
        updatedContent = content.slice(0, showReportsManagementIndex + 'showReportsManagement,'.length) + 
          '\n  showPerformanceManagement,' + 
          content.slice(showReportsManagementIndex + 'showReportsManagement,'.length);
        
        content = updatedContent;
        madeChanges = true;
        console.log('✅ Added showPerformanceManagement to props list');
      } else {
        console.log('❌ Could not find showReportsManagement to insert after');
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
        updatedContent = content.replace(
          /showReportsManagement,(\s+)\/\/ Add mountedComponents/,
          'showReportsManagement,\n    showPerformanceManagement,$1// Add mountedComponents'
        );
        
        if (updatedContent !== content) {
          madeChanges = true;
          console.log('✅ Added showPerformanceManagement to dependency array');
        } else {
          // Try an alternative pattern
          updatedContent = content.replace(
            /showReportsManagement,[\s\n]+mountedComponents/,
            'showReportsManagement,\n    showPerformanceManagement,\n    mountedComponents'
          );
          
          if (updatedContent !== content) {
            madeChanges = true;
            console.log('✅ Added showPerformanceManagement to dependency array (alternative pattern)');
          } else {
            console.log('❌ Could not find appropriate location in dependency array');
          }
        }
      }
    }
    
    // Write changes if any were made
    if (madeChanges) {
      fs.writeFileSync(RENDER_MAIN_CONTENT_PATH, updatedContent);
      console.log('✅ Wrote changes to file');
    }
    
    console.log('✅ Fix completed successfully!');
  } catch (error) {
    console.error('Error during fix:', error);
  }
}

// Run the main function
main(); 