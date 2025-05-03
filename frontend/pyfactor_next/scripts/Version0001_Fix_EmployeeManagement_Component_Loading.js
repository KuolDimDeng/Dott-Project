#!/usr/bin/env node

/**
 * Version0001_Fix_EmployeeManagement_Component_Loading.js
 * 
 * This script fixes the ChunkLoadError issue with the EmployeeManagement component
 * by ensuring the component file is properly synchronized between the frontend
 * directory and the source directory.
 * 
 * The error occurs because the EmployeeManagement.js file exists in both locations,
 * but the Next.js chunk loader is looking for it in a specific location that doesn't match
 * where the component actually is.
 * 
 * Error: ChunkLoadError: Loading chunk _app-pages-browser_src_app_dashboard_components_forms_EmployeeManagement_js failed.
 * (missing: https://localhost:3000/_next/static/chunks/_app-pages-browser_src_app_dashboard_components_forms_EmployeeManagement_js.js)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Source file - the working version in the frontend directory
  sourceFile: '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js',
  
  // Target file - the file in the src directory
  targetFile: '/Users/kuoldeng/projectx/src/app/dashboard/components/forms/EmployeeManagement.js',
  
  // Next.js cache directory
  nextCacheDir: '/Users/kuoldeng/projectx/frontend/pyfactor_next/.next',
  
  // Backup directory for the existing file before overwriting
  backupDir: '/Users/kuoldeng/projectx/src/app/dashboard/components/forms',
  
  // Backup suffix for the file
  backupSuffix: `.backup-${new Date().toISOString()}`
};

// Main function
async function main() {
  console.log('Starting Employee Management component fix script...');
  
  try {
    // 1. Check if source file exists
    if (!fs.existsSync(CONFIG.sourceFile)) {
      throw new Error(`Source file not found: ${CONFIG.sourceFile}`);
    }
    
    // 2. Create a backup of the target file if it exists
    if (fs.existsSync(CONFIG.targetFile)) {
      const backupFile = `${CONFIG.targetFile}${CONFIG.backupSuffix}`;
      fs.copyFileSync(CONFIG.targetFile, backupFile);
      console.log(`Created backup of target file: ${backupFile}`);
    }
    
    // 3. Copy the source file to the target location
    fs.copyFileSync(CONFIG.sourceFile, CONFIG.targetFile);
    console.log(`Successfully copied the EmployeeManagement component to: ${CONFIG.targetFile}`);
    
    // 4. Optionally clear the Next.js cache to ensure fresh loading
    if (fs.existsSync(CONFIG.nextCacheDir)) {
      // Only clear specific chunks cache related to this component
      const chunksDir = path.join(CONFIG.nextCacheDir, 'static', 'chunks');
      if (fs.existsSync(chunksDir)) {
        const chunkFiles = fs.readdirSync(chunksDir);
        const employeeManagementChunks = chunkFiles.filter(file => 
          file.includes('EmployeeManagement') || 
          file.includes('employee-management')
        );
        
        employeeManagementChunks.forEach(file => {
          const chunkFile = path.join(chunksDir, file);
          if (fs.existsSync(chunkFile)) {
            fs.unlinkSync(chunkFile);
            console.log(`Removed Next.js chunk file: ${chunkFile}`);
          }
        });
      }
      
      console.log('Cleared Next.js component chunks cache');
    }
    
    console.log('\nFix complete! Please restart your Next.js server with:');
    console.log('pnpm run dev:https');
    console.log('\nThe EmployeeManagement component should now load correctly.');
    
  } catch (error) {
    console.error('Error fixing EmployeeManagement component:', error);
    process.exit(1);
  }
}

// Run the script
main(); 