/**
 * Script: fix_sales_menu.js
 * Description: Executes the Sales menu fix script
 * 
 * This script executes the Version0001_fix_SalesMenu_DashboardContent.js script
 * to implement the handleSalesClick function in DashboardContent.js and make
 * the Sales menu items work properly.
 * 
 * Created: 2025-05-01
 * Author: AI Assistant
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
const mainScriptPath = path.join(scriptDir, 'Version0001_fix_SalesMenu_DashboardContent.js');

// Check if script exists
if (!fs.existsSync(mainScriptPath)) {
  log(`Fix script not found at ${mainScriptPath}`, 'error');
  process.exit(1);
}

// Execute the fix script
try {
  log('Starting Sales menu fix...', 'step');
  log(`Executing ${path.basename(mainScriptPath)}`);
  
  execSync(`node ${mainScriptPath}`, { stdio: 'inherit' });
  
  log('Sales menu fix completed successfully!', 'success');
  log('All Sales submenu items (Products, Services, Estimates, Orders, Invoices, Reports) should now be working correctly.');
  log('To verify:');
  log('1. Start the application with "pnpm run dev"');
  log('2. Navigate to the dashboard');
  log('3. Click on the Sales menu and test each submenu item');
  
} catch (error) {
  log(`Failed to execute fix script: ${error.message}`, 'error');
  process.exit(1);
} 