/**
 * PDF Modules Cleanup Script
 * 
 * This script removes unnecessary PDF.js worker files and minimizes
 * the memory footprint of PDF.js in the application.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths to clean up
const PATHS_TO_CLEAN = [
  '../node_modules/pdfjs-dist/build/pdf.worker.js',
  '../node_modules/pdfjs-dist/build/pdf.worker.min.js',
  '../node_modules/pdfjs-dist/legacy/build/pdf.worker.js',
  '../node_modules/pdfjs-dist/lib/web/pdf_viewer.js',
  '../node_modules/pdfjs-dist/web/pdf_viewer.js',
  '../node_modules/pdf-lib/dist/pdf-lib.js',
  '../node_modules/pdf-lib/dist/pdf-lib.min.js'
];

// Path to our stub
const STUB_PATH = path.join(__dirname, '../utils/stubs/pdfjs-stub.js');

// Function to get the size of a file in MB
function getFileSizeMB(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return (stats.size / (1024 * 1024)).toFixed(2);
  } catch (e) {
    return 'N/A';
  }
}

// Main cleanup function
function cleanupPdfModules() {
  console.log('Starting PDF modules cleanup...');
  
  let totalSizeMB = 0;
  let totalFilesCleaned = 0;
  
  // Process each path
  PATHS_TO_CLEAN.forEach(relativePath => {
    const fullPath = path.resolve(__dirname, relativePath);
    
    if (fs.existsSync(fullPath)) {
      try {
        // Get file size before cleaning
        const sizeMB = getFileSizeMB(fullPath);
        totalSizeMB += parseFloat(sizeMB);
        
        console.log(`Processing ${relativePath} (${sizeMB} MB)...`);
        
        // Create backup if it doesn't exist
        const backupPath = `${fullPath}.bak`;
        if (!fs.existsSync(backupPath)) {
          fs.copyFileSync(fullPath, backupPath);
          console.log(`  ✓ Created backup at ${backupPath}`);
        }
        
        // Replace with minimal version
        const stubContent = fs.readFileSync(STUB_PATH, 'utf8');
        fs.writeFileSync(fullPath, stubContent);
        console.log(`  ✓ Replaced with stub (${getFileSizeMB(fullPath)} MB)`);
        
        totalFilesCleaned++;
      } catch (error) {
        console.error(`  ✗ Error processing ${relativePath}:`, error.message);
      }
    } else {
      console.log(`Skipping ${relativePath} - file not found`);
    }
  });
  
  console.log(`\nCleanup complete!`);
  console.log(`Files processed: ${totalFilesCleaned}/${PATHS_TO_CLEAN.length}`);
  console.log(`Total space saved: ${totalSizeMB.toFixed(2)} MB`);
  
  console.log('\nTo restore original files:');
  console.log('  1. Delete the current files');
  console.log('  2. Rename the .bak files back to their original names');
  console.log('  3. Or reinstall the packages with "npm install"');
}

// Run the cleanup
cleanupPdfModules(); 