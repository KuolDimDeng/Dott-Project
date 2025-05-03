/**
 * Script: fix_sales_analysis_api.js
 * Description: Executes the SalesAnalysis API error fix script
 * 
 * This script executes Version0005_fix_SalesAnalysis_API_Error.js to fix
 * the API error in SalesAnalysis.js by properly handling failed requests.
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
const mainScriptPath = path.join(scriptDir, 'Version0005_fix_SalesAnalysis_API_Error.js');

// Check if script exists
if (!fs.existsSync(mainScriptPath)) {
  log(`Fix script not found at ${mainScriptPath}`, 'error');
  process.exit(1);
}

// Execute the fix script
try {
  log('Starting SalesAnalysis API error fix...', 'step');
  log(`Executing ${path.basename(mainScriptPath)}`);
  
  execSync(`node ${mainScriptPath}`, { stdio: 'inherit' });
  
  log('SalesAnalysis API error fix completed successfully!', 'success');
  log('The SalesAnalysis component now gracefully handles API errors by using mock data.');
  log('To verify:');
  log('1. Start the application with "pnpm run dev"');
  log('2. Navigate to the dashboard and click on Sales menu');
  log('3. Select the Reports option to verify the charts render without errors');
  
} catch (error) {
  log(`Failed to execute fix script: ${error.message}`, 'error');
  process.exit(1);
} 