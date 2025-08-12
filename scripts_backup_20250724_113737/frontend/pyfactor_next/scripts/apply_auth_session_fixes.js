/**
 * Master Script to Apply All Authentication and Session Fixes
 * Issue ID: AUTH-MASTER-2025-06-01
 * Version: v1.0
 * 
 * This script applies all authentication and session management fixes
 * to ensure a smooth sign-in to dashboard flow and proper error handling.
 */

'use strict';

const path = require('path');
const { spawn } = require('child_process');

// Log function
function log(message) {
  console.log(`[AUTH-MASTER] ${message}`);
}

// Function to run a script and return a promise
function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    log(`Running script: ${path.basename(scriptPath)}`);
    
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        log(`✓ Script ${path.basename(scriptPath)} completed successfully`);
        resolve();
      } else {
        log(`✗ Script ${path.basename(scriptPath)} failed with code ${code}`);
        reject(new Error(`Script exited with code ${code}`));
      }
    });
    
    child.on('error', (err) => {
      log(`✗ Error running script ${path.basename(scriptPath)}: ${err.message}`);
      reject(err);
    });
  });
}

// Main function to run all fix scripts
async function applyAllFixes() {
  log('Starting application of all authentication and session fixes...');
  
  try {
    // Get script paths
    const authSessionFixPath = path.resolve(__dirname, 'auth_session_fix.js');
    const employeeSessionFixPath = path.resolve(__dirname, 'employee_session_fix.js');
    const sourceMapFixPath = path.resolve(__dirname, 'source_map_fix.js');
    
    // Run the auth_session_fix.js script first
    log('Step 1/3: Applying general authentication and session fixes');
    await runScript(authSessionFixPath);
    
    // Run the employee_session_fix.js script next
    log('Step 2/3: Applying Employee Management session fixes');
    await runScript(employeeSessionFixPath);
    
    // Run the source_map_fix.js script last
    log('Step 3/3: Applying source map configuration fix');
    await runScript(sourceMapFixPath);
    
    // Success message
    log('All authentication and session fixes applied successfully!');
    
    // Show next steps
    console.log('\n=== Next Steps ===');
    console.log('1. Run the Next.js development server: pnpm run dev:https');
    console.log('2. Test the authentication flow from sign-in to dashboard');
    console.log('3. Verify session handling in the Employee Management component');
    console.log('4. Check for proper error handling when network issues occur');
    
    return {
      success: true,
      message: 'All authentication and session fixes applied successfully'
    };
  } catch (error) {
    log(`ERROR: ${error.message}`);
    console.error(error);
    
    return {
      success: false,
      message: `Failed to apply all fixes: ${error.message}`,
      error
    };
  }
}

// Run the fixes if script is executed directly
if (require.main === module) {
  applyAllFixes()
    .then(result => {
      if (result.success) {
        console.log('\n✅ SUCCESS:', result.message);
        process.exit(0);
      } else {
        console.error('\n❌ ERROR:', result.message);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('\n❌ FATAL ERROR:', err);
      process.exit(1);
    });
} else {
  // Export for use as a module
  module.exports = { applyAllFixes }; 
} 