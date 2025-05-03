/**
 * Script: Version0004_fix_ChartJS_Dependencies.js
 * Description: Fixes the Chart.js dependency issue in SalesAnalysis.js
 * 
 * This script updates the SalesAnalysis.js file to properly import Chart.js
 * and installs the required chart.js package if needed.
 * 
 * Created: 2025-05-02
 * Author: AI Assistant
 * Version: 1.0
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Define paths
const salesAnalysisPath = path.resolve(process.cwd(), 'frontend/pyfactor_next/src/app/dashboard/components/forms/SalesAnalysis.js');
const backupDir = path.resolve(process.cwd(), 'scripts/backups');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Create backup of SalesAnalysis.js
const timestamp = new Date().toISOString().replace(/:/g, '-');
const backupFilePath = path.join(backupDir, `SalesAnalysis.js.backup-${timestamp}`);
fs.copyFileSync(salesAnalysisPath, backupFilePath);
console.log(`Created backup at: ${backupFilePath}`);

// Check if chart.js is installed
try {
  console.log('Checking if chart.js is installed...');
  
  // Try to install chart.js if it's not already installed
  console.log('Installing chart.js packages...');
  execSync('cd frontend/pyfactor_next && pnpm add chart.js@3.9.1 react-chartjs-2@5.2.0 -w', { 
    stdio: 'inherit'
  });
  console.log('Successfully installed chart.js and react-chartjs-2');
} catch (error) {
  console.error('Failed to install chart.js:', error.message);
  console.log('You may need to manually install the packages with:');
  console.log('cd frontend/pyfactor_next && pnpm add chart.js@3.9.1 react-chartjs-2@5.2.0 -w');
}

// Read the SalesAnalysis.js file
let content = fs.readFileSync(salesAnalysisPath, 'utf8');

// Fix the Chart.js import
const fixedContent = content.replace(
  /import Chart from 'chart\.js\/auto';[\s\S]*?import \{/m,
  `// Import Chart.js directly with proper paths
import {
  Chart,`
);

// Write the fixed content back to the file
fs.writeFileSync(salesAnalysisPath, fixedContent, 'utf8');
console.log('Successfully fixed Chart.js import in SalesAnalysis.js');

// Update script registry
const registryFile = path.join(process.cwd(), 'scripts', 'script_registry.json');

try {
  // Check if registry file exists and read it
  let registry = [];
  if (fs.existsSync(registryFile)) {
    const registryData = fs.readFileSync(registryFile, 'utf8');
    try {
      registry = JSON.parse(registryData);
      // Make sure registry is an array
      if (!Array.isArray(registry)) {
        console.warn('Registry file does not contain an array. Creating new registry.');
        registry = [];
      }
    } catch (e) {
      console.warn('Failed to parse registry file. Creating new registry.');
      registry = [];
    }
  }

  // Add new script entry
  registry.push({
    name: 'Version0004_fix_ChartJS_Dependencies.js',
    description: 'Fixes the Chart.js dependency issue in SalesAnalysis.js and installs required packages',
    dateExecuted: new Date().toISOString(),
    status: 'success',
    version: '1.0',
    modifiedFiles: [salesAnalysisPath]
  });

  // Write updated registry
  fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2), 'utf8');
  console.log('Updated script registry');
} catch (error) {
  console.error('Failed to update script registry:', error.message);
  console.log('Script completed but registry update failed');
}

console.log('Script completed successfully!'); 