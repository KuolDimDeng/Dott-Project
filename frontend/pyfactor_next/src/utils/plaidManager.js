'use client';

class PlaidManager {
  constructor() {
    this.isInitialized = false;
    this.initPromise = null;
    this.initCallbacks = [];
  }

  async waitForPlaid(timeout = 10000) {
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
      
      const checkPlaid = () => {
        // Check if Plaid is available
        if (window.Plaid && typeof window.Plaid.create === 'function') {
          console.log('🏦 [PlaidManager] Plaid is ready');
          this.isInitialized = true;
          
          // Notify all waiting callbacks
          this.initCallbacks.forEach(cb => cb(true));
          this.initCallbacks = [];
          
          resolve(true);
          return;
        }

        // Check if we've exceeded the timeout
        if (Date.now() - startTime > timeout) {
          console.error('🏦 [PlaidManager] Timeout waiting for Plaid');
          reject(new Error('Plaid SDK failed to load within timeout'));
          return;
        }

        // Check again in 100ms
        setTimeout(checkPlaid, 100);
      };

      // Start checking immediately
      checkPlaid();
    });

    return this.initPromise;
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