/**
 * Script: fix_chartjs_error.js
 * Description: Executes the ChartJS fix script for SalesAnalysis.js
 * 
 * This script executes Version0003_fix_ChartJS_SalesAnalysis.js to fix
 * the Chart.js registration error in the SalesAnalysis component.
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
const mainScriptPath = path.join(scriptDir, 'Version0003_fix_ChartJS_SalesAnalysis.js');

// Check if script exists
if (!fs.existsSync(mainScriptPath)) {
  log(`Fix script not found at ${mainScriptPath}`, 'error');
  process.exit(1);
}

// Execute the fix script
try {
  log('Starting Chart.js fix for SalesAnalysis component...', 'step');
  log(`Executing ${path.basename(mainScriptPath)}`);
  
  execSync(`node ${mainScriptPath}`, { stdio: 'inherit' });
  
  log('Chart.js fix completed successfully!', 'success');
  log('The Chart.js registration error in SalesAnalysis.js has been fixed.');
  log('To verify:');
  log('1. Start the application with "pnpm run dev"');
  log('2. Navigate to the dashboard and click on Sales menu');
  log('3. Select the Reports option to view the Sales Analysis charts');
  
} catch (error) {
  log(`Failed to execute fix script: ${error.message}`, 'error');
  process.exit(1);
} 