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
      console.log('🏦 [PlaidManager] Plaid script already exists');
      return;
    }

    console.log('🏦 [PlaidManager] Injecting Plaid script manually');
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('🏦 [PlaidManager] Manual script injection successful');
    };
    
    script.onerror = (error) => {
      console.error('🏦 [PlaidManager] Manual script injection failed:', error);
    };
    
    document.head.appendChild(script);
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
    const existingScript = document.querySelector('script[src*="plaid.com"]');
    if (existingScript) {
      existingScript.remove();
    }
    
    // Clear window.Plaid
    if (window.Plaid) {
      delete window.Plaid;
    }
    
    // Reset manager state
    this.reset();
    
    // Create new script tag
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    
    return new Promise((resolve, reject) => {
      script.onload = () => {
        console.log('🏦 [PlaidManager] Script reloaded successfully');
        resolve();
      };
      
      script.onerror = (error) => {
        console.error('🏦 [PlaidManager] Failed to reload script:', error);
        reject(new Error('Failed to load Plaid script'));
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