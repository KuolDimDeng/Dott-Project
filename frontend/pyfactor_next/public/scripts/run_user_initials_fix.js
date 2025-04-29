/**
 * run_user_initials_fix.js
 * 
 * This script loads and executes the user initials fix for the DashAppBar component.
 * It should be run in the browser console or as part of the application startup.
 */

(function() {
  console.log('===== USER INITIALS FIX LOADER =====');
  
  // Path to the fix script
  const scriptPath = '/scripts/Version0003_fix_user_initials_DashAppBar.js';
  
  // Function to load and execute the script
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      
      script.onload = () => {
        console.log(`Script loaded successfully: ${url}`);
        resolve();
      };
      
      script.onerror = (error) => {
        console.error(`Error loading script ${url}:`, error);
        reject(error);
      };
      
      document.head.appendChild(script);
    });
  }
  
  // Function to update the script registry
  function updateScriptRegistry(scriptId, status) {
    try {
      if (typeof window.__SCRIPT_REGISTRY === 'undefined') {
        window.__SCRIPT_REGISTRY = {};
      }
      
      window.__SCRIPT_REGISTRY[scriptId] = {
        executed: new Date().toISOString(),
        status: status
      };
      
      console.log(`Updated script registry for ${scriptId}: ${status}`);
    } catch (error) {
      console.error('Error updating script registry:', error);
    }
  }
  
  // Main execution function
  async function executeUserInitialsFix() {
    try {
      console.log('Loading and executing user initials fix...');
      
      // Load and execute the fix script
      await loadScript(scriptPath);
      
      // Update script registry
      updateScriptRegistry('Version0003_fix_user_initials_DashAppBar', 'completed');
      
      console.log('User initials fix executed successfully');
    } catch (error) {
      console.error('Error executing user initials fix:', error);
      
      // Update script registry with failure status
      updateScriptRegistry('Version0003_fix_user_initials_DashAppBar', 'failed');
    }
  }
  
  // Execute the fix
  executeUserInitialsFix();
})(); 