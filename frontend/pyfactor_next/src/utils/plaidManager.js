'use client';

class PlaidManager {
  constructor() {
    this.isInitialized = false;
    this.initPromise = null;
    this.initCallbacks = [];
  }

  async waitForPlaid(timeout = 30000) {
    // If already initialized, return immediately
    if (this.isInitialized && window.Plaid) {
      return true;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = new Promise((resolve, reject) => {
      const startTime = Date.now();
      let attemptCount = 0;
      
      const checkPlaid = () => {
        attemptCount++;
        
        // Check if Plaid is available
        if (window.Plaid && typeof window.Plaid.create === 'function') {
          console.log(`🏦 [PlaidManager] Plaid is ready after ${attemptCount} attempts in ${Date.now() - startTime}ms`);
          this.isInitialized = true;
          
          // Notify all waiting callbacks
          this.initCallbacks.forEach(cb => cb(true));
          this.initCallbacks = [];
          
          resolve(true);
          return;
        }

        // Check if we've exceeded the timeout
        if (Date.now() - startTime > timeout) {
          console.error(`🏦 [PlaidManager] Timeout waiting for Plaid after ${attemptCount} attempts over ${timeout}ms`);
          
          // Try to manually inject the script as a last resort
          if (attemptCount < 300) { // Only try once
            console.log('🏦 [PlaidManager] Attempting manual script injection');
            this.ensureScriptExists();
            // Give it a bit more time after manual injection
            setTimeout(checkPlaid, 2000);
            return;
          }
          
          reject(new Error('Plaid SDK failed to load within timeout'));
          return;
        }

        // Check again in 100ms for first 50 attempts, then 500ms
        const interval = attemptCount < 50 ? 100 : 500;
        setTimeout(checkPlaid, interval);
      };

      // Ensure script exists before starting checks
      this.ensureScriptExists();
      
      // Start checking immediately
      checkPlaid();
    });

    return this.initPromise;
  }

  // Ensure the Plaid script exists in the DOM
  ensureScriptExists() {
    const existingScript = document.querySelector('script[src*="plaid.com"]');
    if (existingScript) {
      console.log('🏦 [PlaidManager] Plaid script already exists:', {
        src: existingScript.src,
        loaded: existingScript.readyState || 'unknown',
        hasOnload: !!existingScript.onload,
        hasOnerror: !!existingScript.onerror
      });
      
      // Check if the script loaded but failed to initialize
      if (!window.Plaid) {
        console.log('🏦 [PlaidManager] Script loaded but window.Plaid not available. Checking for errors...');
        
        // Try to access the script element and see its state
        console.log('🏦 [PlaidManager] Script element details:', {
          readyState: existingScript.readyState,
          complete: existingScript.complete,
          async: existingScript.async,
          defer: existingScript.defer,
          crossOrigin: existingScript.crossOrigin,
          integrity: existingScript.integrity,
          type: existingScript.type
        });
        
        // Check for any JavaScript errors in the console
        console.log('🏦 [PlaidManager] Checking window for Plaid-related properties...');
        const plaidRelated = Object.keys(window).filter(key => 
          key.toLowerCase().includes('plaid') || 
          key.toLowerCase().includes('link')
        );
        console.log('🏦 [PlaidManager] Found Plaid-related window properties:', plaidRelated);
      }
      
      return;
    }

    console.log('🏦 [PlaidManager] Injecting Plaid script manually');
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.defer = false; // Remove defer to load immediately
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      console.log('🏦 [PlaidManager] Manual script injection successful');
      console.log('🏦 [PlaidManager] window.Plaid after manual load:', typeof window.Plaid);
      
      // Give it a moment and check again
      setTimeout(() => {
        console.log('🏦 [PlaidManager] window.Plaid after 1s delay:', typeof window.Plaid);
        if (window.Plaid) {
          console.log('🏦 [PlaidManager] Plaid methods:', Object.keys(window.Plaid));
        }
      }, 1000);
    };
    
    script.onerror = (error) => {
      console.error('🏦 [PlaidManager] Manual script injection failed:', error);
      console.error('🏦 [PlaidManager] Error details:', {
        message: error.message,
        filename: error.filename,
        lineno: error.lineno,
        colno: error.colno,
        error: error.error
      });
    };
    
    document.head.appendChild(script);
    console.log('🏦 [PlaidManager] Script appended to head, waiting for load...');
  }

  async createHandler(config, retries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🏦 [PlaidManager] Attempt ${attempt}/${retries} to create handler`);
        
        // Reset state if this is a retry
        if (attempt > 1) {
          this.reset();
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
        
        // Ensure Plaid is loaded
        try {
          await this.waitForPlaid();
        } catch (waitError) {
          console.log('🏦 [PlaidManager] Initial wait failed, attempting script reload');
          
          // Try reloading the script once
          if (attempt === 1) {
            await this.reloadScript();
            await this.waitForPlaid();
          } else {
            throw waitError;
          }
        }
        
        if (!window.Plaid || typeof window.Plaid.create !== 'function') {
          throw new Error('Plaid SDK is not properly loaded');
        }

        console.log('🏦 [PlaidManager] Creating Plaid handler with config:', {
          ...config,
          token: config.token ? config.token.substring(0, 20) + '...' : 'no token'
        });
        
        // Create the handler
        const handler = window.Plaid.create(config);
        
        if (!handler) {
          throw new Error('Plaid.create returned null handler');
        }
        
        console.log('🏦 [PlaidManager] Handler created successfully');
        
        return handler;
      } catch (error) {
        console.error(`🏦 [PlaidManager] Error on attempt ${attempt}:`, error);
        lastError = error;
        
        // If this is the last attempt, throw the error
        if (attempt === retries) {
          throw lastError;
        }
      }
    }
    
    throw lastError || new Error('Failed to create Plaid handler');
  }

  // Reset state (useful for testing or error recovery)
  reset() {
    this.isInitialized = false;
    this.initPromise = null;
    this.initCallbacks = [];
  }

  // Force reload the Plaid script
  async reloadScript() {
    console.log('🏦 [PlaidManager] Force reloading Plaid script');
    
    // Remove existing Plaid script
    const existingScripts = document.querySelectorAll('script[src*="plaid.com"]');
    existingScripts.forEach(script => script.remove());
    
    // Clear window.Plaid
    if (window.Plaid) {
      delete window.Plaid;
    }
    
    // Reset manager state
    this.reset();
    
    // Try multiple script URLs as fallback
    const scriptUrls = [
      'https://cdn.plaid.com/link/v2/stable/link-initialize.js',
      'https://cdn.plaid.com/link/v2/stable/link-initialize.min.js',
      'https://cdn.plaid.com/link/stable/link-initialize.js'
    ];
    
    for (let i = 0; i < scriptUrls.length; i++) {
      const url = scriptUrls[i];
      console.log(`🏦 [PlaidManager] Trying script URL ${i + 1}/${scriptUrls.length}: ${url}`);
      
      try {
        await this.loadScriptUrl(url);
        console.log(`🏦 [PlaidManager] Successfully loaded from: ${url}`);
        return;
      } catch (error) {
        console.error(`🏦 [PlaidManager] Failed to load from ${url}:`, error);
        if (i === scriptUrls.length - 1) {
          throw new Error('Failed to load Plaid script from any URL');
        }
      }
    }
  }

  // Load script from specific URL
  loadScriptUrl(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.defer = false;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        console.log(`🏦 [PlaidManager] Script loaded from: ${url}`);
        // Wait a bit for Plaid to initialize
        setTimeout(() => {
          if (window.Plaid) {
            resolve();
          } else {
            reject(new Error('Script loaded but window.Plaid not available'));
          }
        }, 1000);
      };
      
      script.onerror = (error) => {
        reject(new Error(`Failed to load script from ${url}`));
      };
      
      document.head.appendChild(script);
    });
  }
}

// Create singleton instance
const plaidManager = new PlaidManager();

// Expose for debugging
if (typeof window !== 'undefined') {
  window.plaidManager = plaidManager;
}

export default plaidManager;