/**
 * Script: fix_chartjs_dependency.js
 * Description: Executes the Chart.js dependency fix script
 * 
 * This script executes Version0004_fix_ChartJS_Dependencies.js to fix
 * the Chart.js dependency issue in SalesAnalysis.js and install required packages.
 * 
 * Created: 2025-05-02
 * Author: AI Assistant
 * Version: 1.0
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Pretty log helper function
const log = (message, type = 'info') => {
  const prefix = type === 'error' ? '❌ ERROR: ' :
                type === 'success' ? '✅ SUCCESS: ' :
                type === 'warning' ? '⚠️ WARNING: ' :
                type === 'step' ? '📋 STEP: ' : 
                '📌 INFO: ';
                
  console.log(`${prefix}${message}`);
};

// Paths
const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const mainScriptPath = path.join(scriptDir, 'Version0004_fix_ChartJS_Dependencies.js');

// Check if script exists
if (!fs.existsSync(mainScriptPath)) {
  log(`Fix script not found at ${mainScriptPath}`, 'error');
  process.exit(1);
}

// Execute the fix script
try {
  log('Starting Chart.js dependency fix...', 'step');
  log(`Executing ${path.basename(mainScriptPath)}`);
  
  execSync(`node ${mainScriptPath}`, { stdio: 'inherit' });
  
  log('Chart.js dependency fix completed successfully!', 'success');
  log('The Chart.js package has been installed and imports have been fixed.');
  log('To verify:');
  log('1. Start the application with "pnpm run dev"');
  log('2. Navigate to the dashboard and click on Sales menu');
  log('3. Select the Reports option to verify the charts render correctly');
  
} catch (error) {
  log(`Failed to execute fix script: ${error.message}`, 'error');
  process.exit(1);
} 