/**
 * Script: Version0003_fix_ChartJS_SalesAnalysis.js
 * Description: Fixes the Chart.js registration error in SalesAnalysis.js
 * 
 * This script corrects the Chart.js import and registration in SalesAnalysis.js
 * to resolve the error: "chart_js__WEBPACK_IMPORTED_MODULE_3__.Chart.register is not a function"
 * 
 * Created: 2025-05-02
 * Author: AI Assistant
 * Version: 1.0
 */

import fs from 'fs';
import path from 'path';

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

// Read the SalesAnalysis.js file
let content = fs.readFileSync(salesAnalysisPath, 'utf8');

// Fix the Chart.js import and registration
const fixedContent = content.replace(
  /import {[\s\S]*?} from 'chart.js';[\s\S]*?ChartJS.register\([\s\S]*?\);/m,
  `import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  RadialLinearScale,
} from 'chart.js';

// Register Chart.js components correctly
Chart.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  RadialLinearScale
);`
);

// Write the fixed content back to the file
fs.writeFileSync(salesAnalysisPath, fixedContent, 'utf8');
console.log('Successfully fixed Chart.js import and registration in SalesAnalysis.js');

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
    name: 'Version0003_fix_ChartJS_SalesAnalysis.js',
    description: 'Fixes the Chart.js registration error in SalesAnalysis.js',
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