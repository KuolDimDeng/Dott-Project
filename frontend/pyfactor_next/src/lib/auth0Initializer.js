'use client';

/**
 * Initialize Auth0 authentication
 * This ensures Auth0 configuration is available throughout the app
 */
export function initializeAuth0() {
  try {
    // Auth0 configuration is handled by the @auth0/nextjs-auth0 package
    // through environment variables, so no manual initialization required
    
    // Verify required environment variables are present
    const requiredVars = [
      'AUTH0_SECRET',
      'AUTH0_BASE_URL', 
      'AUTH0_ISSUER_BASE_URL',
      'AUTH0_CLIENT_ID',
      'AUTH0_CLIENT_SECRET'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn('[Auth0Initializer] Missing environment variables:', missingVars);
      return false;
    }
    
    console.log('[Auth0Initializer] Auth0 configuration verified');
    return true;
  } catch (error) {
    console.error('[Auth0Initializer] Error initializing Auth0:', error);
    return false;
  }
}

// Auto-initialize when this module is imported
initializeAuth0();

export default { initializeAuth0 };