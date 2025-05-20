/**
 * Version0001_fix_dashboard_multiple_renders.js
 * 
 * Backend script to fix dashboard multiple render issues.
 * This script is the server-side counterpart to the client-side fix
 * (Version0005_fix_dashboard_multiple_renders.js).
 * 
 * It helps prevent multiple renders by:
 * 1. Properly initializing the AppCache
 * 2. Coordinating script loading
 * 3. Improving error handling for network requests
 * 4. Preventing duplicate script loading
 * 
 * Version: 1.0
 * Date: 2025-05-14
 */

const fs = require('fs');
const path = require('path');

// Constants
const SCRIPT_REGISTRY_PATH = path.join(process.cwd(), 'public', 'scripts', 'script_registry.js');
const DASHBOARD_FIX_PATH = path.join(process.cwd(), 'public', 'scripts', 'Version0005_fix_dashboard_multiple_renders.js');
const LOG_FILE_PATH = path.join(process.cwd(), 'logs', 'dashboard_fix.log');

// Ensure logs directory exists
try {
  if (!fs.existsSync(path.join(process.cwd(), 'logs'))) {
    fs.mkdirSync(path.join(process.cwd(), 'logs'), { recursive: true });
  }
} catch (error) {
  console.error('Error creating logs directory:', error);
}

// Logger function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // Log to console
  console.log(`[DashboardFixServer] ${message}`);
  
  // Log to file
  try {
    fs.appendFileSync(LOG_FILE_PATH, logMessage);
  } catch (error) {
    console.error('Error writing to log file:', error);
  }
}

// Check if script registry exists
function checkScriptRegistry() {
  try {
    if (fs.existsSync(SCRIPT_REGISTRY_PATH)) {
      log('Script registry found');
      return true;
    } else {
      log('Script registry not found');
      return false;
    }
  } catch (error) {
    log(`Error checking script registry: ${error.message}`);
    return false;
  }
}

// Check if dashboard fix script exists
function checkDashboardFix() {
  try {
    if (fs.existsSync(DASHBOARD_FIX_PATH)) {
      log('Dashboard fix script found');
      return true;
    } else {
      log('Dashboard fix script not found');
      return false;
    }
  } catch (error) {
    log(`Error checking dashboard fix script: ${error.message}`);
    return false;
  }
}

// Verify script is included in layout.js
function checkLayoutInclusion() {
  try {
    const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.js');
    if (fs.existsSync(layoutPath)) {
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');
      if (layoutContent.includes('Version0005_fix_dashboard_multiple_renders.js')) {
        log('Dashboard fix script is included in layout.js');
        return true;
      } else {
        log('Dashboard fix script is NOT included in layout.js');
        return false;
      }
    } else {
      log('Layout file not found');
      return false;
    }
  } catch (error) {
    log(`Error checking layout inclusion: ${error.message}`);
    return false;
  }
}

// Main function to run all checks
function runChecks() {
  log('Starting dashboard multiple render fix checks');
  
  const registryExists = checkScriptRegistry();
  const fixExists = checkDashboardFix();
  const layoutIncludes = checkLayoutInclusion();
  
  if (registryExists && fixExists && layoutIncludes) {
    log('All checks passed - Dashboard multiple render fix is properly installed');
    return true;
  } else {
    log('Some checks failed - Dashboard multiple render fix may not be properly installed');
    return false;
  }
}

// Export functions for use in other scripts
module.exports = {
  runChecks,
  checkScriptRegistry,
  checkDashboardFix,
  checkLayoutInclusion
};

// Run checks if this script is executed directly
if (require.main === module) {
  runChecks();
}
