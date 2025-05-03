/**
 * run_user_initials_fix.js
 * 
 * This script loads and executes the enhanced user initials fix for the DashAppBar component.
 * It should be run in the browser console or as part of the application startup.
 * 
 * Updated: 2025-04-29 - Now loads the enhanced debugging version (v1.1.0)
 */

(function() {
  console.log('===== USER INITIALS FIX LOADER (v1.1.0) =====');
  
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
        status: status,
        version: '1.1.0'
      };
      
      console.log(`Updated script registry for ${scriptId}: ${status}`);
    } catch (error) {
      console.error('Error updating script registry:', error);
    }
  }
  
  // Function to display debug UI (optional)
  function createDebugUI() {
    if (typeof document === 'undefined') return;
    
    try {
      // Create a small floating debug panel
      const debugPanel = document.createElement('div');
      debugPanel.style.position = 'fixed';
      debugPanel.style.bottom = '10px';
      debugPanel.style.right = '10px';
      debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      debugPanel.style.color = 'white';
      debugPanel.style.padding = '8px';
      debugPanel.style.borderRadius = '4px';
      debugPanel.style.fontSize = '12px';
      debugPanel.style.fontFamily = 'monospace';
      debugPanel.style.zIndex = '9999';
      debugPanel.style.maxWidth = '300px';
      debugPanel.style.maxHeight = '200px';
      debugPanel.style.overflow = 'auto';
      debugPanel.style.display = 'none';
      
      debugPanel.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">User Initials Fix v1.1.0</div>
        <div id="initials-fix-status">Loading...</div>
        <div style="margin-top: 8px; font-size: 10px;">Click to close</div>
      `;
      
      // Add click handler to close
      debugPanel.addEventListener('click', function() {
        debugPanel.style.display = 'none';
      });
      
      // Append to body
      document.body.appendChild(debugPanel);
      
      // Create a function to update the debug panel
      window.__UPDATE_INITIALS_FIX_DEBUG = function(status, data) {
        const statusEl = document.getElementById('initials-fix-status');
        if (statusEl) {
          statusEl.textContent = status;
          
          if (data && data.initials) {
            statusEl.innerHTML += `<br>Initials: ${data.initials}`;
          }
          
          debugPanel.style.display = 'block';
          
          // Auto-hide after 10 seconds
          setTimeout(() => {
            debugPanel.style.display = 'none';
          }, 10000);
        }
      };
      
      console.log('Created debug UI for user initials fix');
    } catch (error) {
      console.error('Error creating debug UI:', error);
    }
  }
  
  // Main execution function
  async function executeUserInitialsFix() {
    try {
      console.log('Loading and executing enhanced user initials fix...');
      
      // Create debug UI
      createDebugUI();
      
      // Load and execute the fix script
      await loadScript(scriptPath);
      
      // Update script registry
      updateScriptRegistry('Version0003_fix_user_initials_DashAppBar', 'completed');
      
      console.log('Enhanced user initials fix executed successfully');
      
      // Update debug UI if available
      if (window.__UPDATE_INITIALS_FIX_DEBUG) {
        window.__UPDATE_INITIALS_FIX_DEBUG('Fix executed successfully');
      }
    } catch (error) {
      console.error('Error executing user initials fix:', error);
      
      // Update script registry with failure status
      updateScriptRegistry('Version0003_fix_user_initials_DashAppBar', 'failed');
      
      // Update debug UI if available
      if (window.__UPDATE_INITIALS_FIX_DEBUG) {
        window.__UPDATE_INITIALS_FIX_DEBUG('Fix failed to execute');
      }
    }
  }
  
  // Execute the fix
  executeUserInitialsFix();
})(); 