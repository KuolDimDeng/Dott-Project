/**
 * Script: Version0097_fix_auth0_custom_domain_with_debug.mjs
 * Purpose: Fix Auth0 login to use custom domain and add comprehensive debugging
 * Date: 2025-06-06
 * 
 * This script addresses the Auth0 custom domain issue and adds detailed logging
 * throughout the authentication flow. It fixes:
 * 
 * 1. Auth0 login route to use the custom domain instead of default domain
 * 2. Enhances logging to track token flow and validation attempts
 * 3. Adds debugging utilities to identify auth issues in real-time
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Main function to execute script
async function main() {
  console.log('Starting Auth0 custom domain fix with enhanced debugging...');
  
  // Step 1: Create Auth0 debugging utility
  const authDebuggerPath = createAuthDebugUtility();
  console.log(`✅ Created Auth0 debugging utility at: ${authDebuggerPath}`);
  
  // Step 2: Fix Auth0 login route
  const loginRoutePath = fixAuthLoginRoute();
  console.log(`✅ Fixed Auth0 login route at: ${loginRoutePath}`);
  
  // Step 3: Enhance Auth0 config
  const auth0ConfigPath = enhanceAuth0Config();
  console.log(`✅ Enhanced Auth0 config at: ${auth0ConfigPath}`);
  
  // Step 4: Update script registry
  updateScriptRegistry();
  console.log('✅ Updated script registry');
  
  console.log('\n📝 SUMMARY OF CHANGES:');
  console.log('1. Created Auth0 debugging utility to track token flow');
  console.log('2. Fixed Auth0 login route to always use custom domain (auth.dottapps.com)');
  console.log('3. Enhanced Auth0 config with detailed logging');
  console.log('\n🚀 Auth0 custom domain fix with enhanced debugging completed successfully!');
}

// Create Auth0 debugging utility
function createAuthDebugUtility() {
  const authDebugUtilPath = path.join(projectRoot, 'src/utils/authDebugger.js');
  
  console.log(`Creating Auth0 debugging utility at ${authDebugUtilPath}`);
  
  const authDebuggerCode = `/**
 * Auth0 Debugging Utility
 * 
 * This utility provides enhanced debugging for Auth0 authentication flows
 * and helps diagnose token validation issues across the application.
 */

// Storage for auth flow debugging
const authDebugStorage = {
  flowEvents: [],
  tokenInfo: {},
  errors: [],
  environmentInfo: {}
};

/**
 * Log Auth0 configuration and environment info
 */
export function logAuth0Config(config) {
  console.log('🔍 [Auth0Debug] Configuration:', {
    domain: config.domain,
    audience: config.audience,
    clientId: config.clientId ? config.clientId.substring(0, 8) + '...' : undefined,
    useCustomDomain: config.useCustomDomain,
    environment: process.env.NODE_ENV
  });
  
  // Store config details for debugging
  authDebugStorage.environmentInfo = {
    domain: config.domain,
    audience: config.audience,
    clientId: config.clientId ? \`\${config.clientId.substring(0, 8)}...\` : undefined,
    useCustomDomain: config.useCustomDomain,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };
  
  // Verify if environment variables match expected values
  if (process.env.NEXT_PUBLIC_AUTH0_DOMAIN && process.env.NEXT_PUBLIC_AUTH0_DOMAIN !== config.domain) {
    console.warn('⚠️ [Auth0Debug] Domain mismatch! ENV:', process.env.NEXT_PUBLIC_AUTH0_DOMAIN, 'Config:', config.domain);
    logAuthEvent({
      type: 'warning',
      message: \`Domain mismatch between ENV (\${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}) and Config (\${config.domain})\`
    });
  }
  
  return config;
}

/**
 * Log token details without exposing sensitive data
 */
export function logTokenDetails(token) {
  if (!token) {
    console.warn('⚠️ [Auth0Debug] No token provided to logTokenDetails');
    return { valid: false };
  }
  
  try {
    // For JWT tokens (structure: header.payload.signature)
    const parts = token.split('.');
    if (parts.length === 3) {
      try {
        const header = JSON.parse(atob(parts[0]));
        console.log('🔍 [Auth0Debug] JWT Token Header:', header);
        
        let payload = {};
        try {
          payload = JSON.parse(atob(parts[1]));
          console.log('🔍 [Auth0Debug] JWT Payload Preview:', {
            iss: payload.iss,
            sub: payload.sub?.substring(0, 10) + '...',
            exp: new Date(payload.exp * 1000).toISOString(),
            tokenType: 'JWT'
          });
        } catch (e) {
          console.warn('⚠️ [Auth0Debug] Could not parse JWT payload');
        }
        
        return { valid: true, type: 'JWT', header, payloadPreview: payload };
      } catch (e) {
        console.warn('⚠️ [Auth0Debug] Error parsing JWT parts:', e.message);
      }
    } 
    // For JWE tokens (structure: header.encryptedKey.iv.ciphertext.tag)
    else if (parts.length === 5) {
      try {
        const header = JSON.parse(atob(parts[0]));
        console.log('🔍 [Auth0Debug] JWE Token Header:', header);
        return { valid: true, type: 'JWE', header, encrypted: true };
      } catch (e) {
        console.warn('⚠️ [Auth0Debug] Error parsing JWE header:', e.message);
      }
    }
    
    // Token format doesn't match JWT or JWE
    console.warn('⚠️ [Auth0Debug] Unrecognized token format');
    return { valid: false, reason: 'Unrecognized token format' };
  } catch (e) {
    console.error('❌ [Auth0Debug] Token parsing error:', e);
    return { valid: false, error: e.message };
  }
}

/**
 * Log auth flow event for debugging
 */
export function logAuthEvent(event) {
  const enrichedEvent = {
    ...event,
    timestamp: new Date().toISOString()
  };
  
  console.log(\`🔄 [Auth0Debug] Event: \${event.type} - \${event.message || ''}\`);
  authDebugStorage.flowEvents.push(enrichedEvent);
  
  // If this is an error, add to errors collection
  if (event.type === 'error' || event.type === 'warning') {
    authDebugStorage.errors.push(enrichedEvent);
  }
  
  return enrichedEvent;
}

/**
 * Log API request with auth token
 */
export function logApiRequest(url, options = {}, tokenPreview) {
  console.log(\`🌐 [Auth0Debug] API Request to \${url}\`);
  
  if (options.headers?.Authorization && !tokenPreview) {
    const authHeader = options.headers.Authorization;
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      tokenPreview = token.substring(0, 15) + '...';
      
      // Analyze token format
      logTokenDetails(token);
    }
  }
  
  logAuthEvent({
    type: 'api_request',
    url,
    method: options.method || 'GET',
    tokenPreview
  });
}

/**
 * Log API response for debugging
 */
export function logApiResponse(url, response, data) {
  console.log(\`🌐 [Auth0Debug] API Response from \${url}: \${response.status} \${response.statusText}\`);
  
  logAuthEvent({
    type: 'api_response',
    url,
    status: response.status,
    statusText: response.statusText,
    data: data ? JSON.stringify(data).substring(0, 100) + '...' : undefined
  });
  
  if (!response.ok) {
    console.error(\`❌ [Auth0Debug] API Error: \${response.status} \${response.statusText}\`);
    logAuthEvent({
      type: 'error',
      message: \`API Error: \${response.status} \${response.statusText}\`,
      url
    });
  }
  
  return { response, data };
}

/**
 * Get debugging summary
 */
export function getAuthDebugSummary() {
  return {
    events: authDebugStorage.flowEvents,
    errors: authDebugStorage.errors,
    config: authDebugStorage.environmentInfo,
    timestamp: new Date().toISOString()
  };
}

/**
 * Detect custom domain usage
 */
export function detectCustomDomain(domain) {
  // Check if using custom domain vs default Auth0 domain
  const isCustomDomain = !domain.includes('.auth0.com');
  const domainType = isCustomDomain ? 'Custom Domain' : 'Default Auth0 Domain';
  
  console.log(\`🔍 [Auth0Debug] Domain Type: \${domainType} (\${domain})\`);
  logAuthEvent({
    type: 'domain_detection',
    isCustomDomain,
    domain,
    domainType
  });
  
  return { isCustomDomain, domain, domainType };
}

export default {
  logAuth0Config,
  logTokenDetails,
  logAuthEvent,
  logApiRequest,
  logApiResponse,
  getAuthDebugSummary,
  detectCustomDomain
};`;

  fs.writeFileSync(authDebugUtilPath, authDebuggerCode);
  return authDebugUtilPath;
}

// Fix Auth0 login route to use custom domain
function fixAuthLoginRoute() {
  const loginRoutePath = path.join(projectRoot, 'src/app/api/auth/login/route.js');
  console.log(`Fixing Auth0 login route at ${loginRoutePath}`);
  
  // Create backup
  const backupPath = `${loginRoutePath}.backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
  fs.copyFileSync(loginRoutePath, backupPath);
  console.log(`Backup created at ${backupPath}`);
  
  // Create updated code with fixes and detailed logging
  const updatedCode = `import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import authDebugger from '@/utils/authDebugger';

/**
 * Get Auth0 authorization URL with enhanced debugging
 * @returns {string} Auth0 authorization URL
 */
function getAuth0AuthorizationUrl() {
  // Get Auth0 domain with preference for custom domain
  const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
  const redirectUri = \`\${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback\`;
  const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com';
  
  // Log domain information for debugging
  const domainInfo = authDebugger.detectCustomDomain(auth0Domain);
  
  // Force the use of custom domain if default domain was detected
  const effectiveDomain = auth0Domain.includes('.auth0.com') 
    ? 'auth.dottapps.com' // Force custom domain if default is detected
    : auth0Domain;
  
  if (effectiveDomain !== auth0Domain) {
    console.warn(\`⚠️ [Auth Login Route] Overriding default domain with custom domain: \${effectiveDomain}\`);
    authDebugger.logAuthEvent({
      type: 'domain_override',
      originalDomain: auth0Domain,
      effectiveDomain,
      reason: 'Forcing custom domain to prevent token issuer mismatch'
    });
  }
  
  // Create Auth0 authorization URL
  const queryParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    audience: audience,
  });
  
  const authUrl = \`https://\${effectiveDomain}/authorize?\${queryParams.toString()}\`;
  
  // Log complete Auth0 configuration for debugging
  console.log('[Auth Login Route] Auth0 Configuration:', {
    domain: effectiveDomain,
    clientId: clientId ? \`\${clientId.substring(0, 8)}...\` : undefined,
    redirectUri,
    audience,
    authUrl: \`\${authUrl.substring(0, 50)}...\`,
    environment: process.env.NODE_ENV
  });
  
  // Log auth event
  authDebugger.logAuthEvent({
    type: 'login_redirect',
    authUrl: authUrl,
    domain: effectiveDomain,
    clientId: clientId ? \`\${clientId.substring(0, 8)}...\` : undefined,
    redirectUri,
    audience
  });
  
  return authUrl;
}

export async function GET(request) {
  console.log('[Auth Login Route] Processing login request');
  
  try {
    // Get Auth0 authorization URL with enhanced logging
    const authUrl = getAuth0AuthorizationUrl();
    
    console.log(\`[Auth Login Route] Redirecting to Auth0: \${authUrl}\`);
    
    // Create a response that redirects to Auth0
    const response = NextResponse.redirect(authUrl);
    
    // Set headers to prevent RSC payload fetch errors
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    // Log complete response headers for debugging
    console.log('[Auth Login Route] Response headers:', Object.fromEntries([...response.headers.entries()]));
    
    return response;
  } catch (error) {
    console.error('[Auth Login Route] Error during login redirect:', error);
    
    // Log auth error event
    authDebugger.logAuthEvent({
      type: 'error',
      message: \`Login redirect error: \${error.message}\`,
      stack: error.stack
    });
    
    // Return error response
    return new NextResponse(
      JSON.stringify({ error: 'Authentication redirect failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request) {
  // Same behavior as GET for simplicity
  return GET(request);
}`;

  // Write the updated file
  fs.writeFileSync(loginRoutePath, updatedCode);
  console.log(`Updated Auth0 login route with custom domain fix and enhanced debugging`);
  
  return loginRoutePath;
}

// Fix Auth0 config with comprehensive debugging
function enhanceAuth0Config() {
  const auth0ConfigPath = path.join(projectRoot, 'src/config/auth0.js');
  console.log(`Enhancing Auth0 config at ${auth0ConfigPath}`);
  
  // Create backup
  const backupPath = `${auth0ConfigPath}.backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
  fs.copyFileSync(auth0ConfigPath, backupPath);
  console.log(`Backup created at ${backupPath}`);
  
  // Create updated code with enhanced debugging
  const updatedCode = `// Auth0 Configuration and Utilities
// Version: 2025-06-06 - Enhanced with comprehensive debugging
import { createAuth0Client } from '@auth0/auth0-spa-js';
import authDebugger from '@/utils/authDebugger';

// Get Auth0 configuration from environment variables or use defaults
const getAuth0Config = () => {
  // Always prefer environment variables, fallback to custom domain
  const config = {
    domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com',
    audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com',
    clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF'
  };
  
  // Log configuration for debugging
  console.log('[Auth0Config] Initial configuration:', {
    domain: config.domain,
    audience: config.audience,
    clientId: config.clientId.substring(0, 8) + '...',
    source: 'ENVIRONMENT_VARIABLES'
  });
  
  // Detect if using default Auth0 domain instead of custom domain
  const domainInfo = authDebugger.detectCustomDomain(config.domain);
  
  // Override domain if using default Auth0 domain
  if (!domainInfo.isCustomDomain) {
    console.warn('⚠️ [Auth0Config] Using default Auth0 domain! Overriding with custom domain');
    config.domain = 'auth.dottapps.com';
    
    // Log the override
    authDebugger.logAuthEvent({
      type: 'config_override',
      message: 'Overriding default Auth0 domain with custom domain',
      originalDomain: domainInfo.domain,
      newDomain: config.domain
    });
  }
  
  // Enhanced logging via authDebugger
  return authDebugger.logAuth0Config(config);
};

// Auth0 client instance
let auth0Client = null;

/**
 * Initialize Auth0 client with JWT-optimized configuration
 */
export const initAuth0 = async () => {
  if (!auth0Client) {
    const authConfig = getAuth0Config();
    
    // Detect custom domain usage
    const domainInfo = authDebugger.detectCustomDomain(authConfig.domain);
    
    const config = {
      domain: authConfig.domain,
      clientId: authConfig.clientId,
      authorizationParams: {
        redirect_uri: typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : '',
        // Use audience to force JWT tokens (not JWE)
        audience: authConfig.audience,
        response_type: 'code',
        scope: 'openid profile email'
      },
      cacheLocation: 'localstorage',
      useRefreshTokens: true,
      // Always use custom domain if available
      useCustomDomain: domainInfo.isCustomDomain
    };
    
    // Log final configuration for debugging
    console.log('[Auth0Config] Final Auth0 Client Configuration:', {
      domain: config.domain,
      audience: config.authorizationParams.audience,
      useCustomDomain: config.useCustomDomain,
      tokenType: 'JWT (forced via audience)'
    });
    
    // Log initialization event
    authDebugger.logAuthEvent({
      type: 'client_init',
      config: {
        domain: config.domain,
        audience: config.authorizationParams.audience,
        useCustomDomain: config.useCustomDomain
      }
    });

    try {
      auth0Client = await createAuth0Client(config);
      console.log('✅ [Auth0Config] Auth0 client initialized successfully');
    } catch (error) {
      console.error('❌ [Auth0Config] Error initializing Auth0 client:', error);
      
      // Log error event
      authDebugger.logAuthEvent({
        type: 'error',
        message: \`Auth0 client initialization error: \${error.message}\`,
        stack: error.stack
      });
      
      throw error;
    }
  }
  return auth0Client;
};

/**
 * Get Auth0 client instance
 */
export const getAuth0Client = async () => {
  if (!auth0Client) {
    await initAuth0();
  }
  return auth0Client;
};

// Auth0 utility functions
export const auth0Utils = {
  /**
   * Get real access token from Auth0
   */
  getAccessToken: async () => {
    try {
      const client = await getAuth0Client();
      const authConfig = getAuth0Config();
      
      // Log token request
      authDebugger.logAuthEvent({
        type: 'token_request',
        audience: authConfig.audience,
        domain: authConfig.domain
      });
      
      // Force fresh token request
      const token = await client.getTokenSilently({
        ignoreCache: true, // Force fresh token
        audience: authConfig.audience, // Use configured audience
        cacheLocation: 'memory', // Avoid localStorage cache
        responseType: 'code', // Explicit response type
        grantType: 'authorization_code' // Explicit grant type
      });
      
      console.log('[Auth0] Real access token retrieved (forced fresh)');
      console.log('[Auth0] Using audience:', authConfig.audience);
      
      // Analyze token format and log
      const tokenInfo = authDebugger.logTokenDetails(token);
      
      // Log token retrieval
      authDebugger.logAuthEvent({
        type: 'token_received',
        tokenType: tokenInfo.type || 'unknown',
        audience: authConfig.audience,
        domain: authConfig.domain,
        valid: tokenInfo.valid
      });
      
      return token;
    } catch (error) {
      console.error('[Auth0] Error getting access token:', error);
      
      // Log error event
      authDebugger.logAuthEvent({
        type: 'error',
        message: \`Error getting access token: \${error.message}\`,
        stack: error.stack
      });
      
      // Fallback: try from API route
      try {
        console.log('[Auth0] Attempting fallback to API route for token');
        
        authDebugger.logAuthEvent({
          type: 'token_fallback',
          message: 'Using API route fallback for token'
        });
        
        const response = await fetch('/api/auth/token');
        
        // Log API response
        authDebugger.logApiResponse('/api/auth/token', response);
        
        if (response.ok) {
          const data = await response.json();
          
          // Analyze fallback token
          if (data.accessToken) {
            authDebugger.logTokenDetails(data.accessToken);
          }
          
          return data.accessToken;
        }
      } catch (apiError) {
        console.error('[Auth0] API fallback failed:', apiError);
        
        // Log API fallback error
        authDebugger.logAuthEvent({
          type: 'error',
          message: \`API fallback failed: \${apiError.message}\`,
          stack: apiError.stack
        });
      }
      
      return null;
    }
  },
  
  /**
   * Get user from Auth0
   */
  getUser: async () => {
    try {
      const client = await getAuth0Client();
      
      // Log user request
      authDebugger.logAuthEvent({
        type: 'user_request',
        message: 'Requesting user from Auth0 client'
      });
      
      const user = await client.getUser();
      console.log('[Auth0] User retrieved from Auth0');
      
      // Log user received (limited info for privacy)
      if (user) {
        console.log('[Auth0] User info:', {
          sub: user.sub?.substring(0, 10) + '...',
          email: user.email ? \`\${user.email.split('@')[0]}@...\` : undefined,
          hasEmail: !!user.email
        });
        
        authDebugger.logAuthEvent({
          type: 'user_received',
          hasUser: !!user,
          hasEmail: !!user.email,
          hasSub: !!user.sub
        });
      } else {
        console.warn('[Auth0] No user received from Auth0');
        
        authDebugger.logAuthEvent({
          type: 'warning',
          message: 'No user received from Auth0'
        });
      }
      
      return user;
    } catch (error) {
      console.error('[Auth0] Error getting user:', error);
      
      // Log error event
      authDebugger.logAuthEvent({
        type: 'error',
        message: \`Error getting user: \${error.message}\`,
        stack: error.stack
      });
      
      // Fallback: try from API route
      try {
        console.log('[Auth0] Attempting fallback to API route for user');
        
        authDebugger.logAuthEvent({
          type: 'user_fallback',
          message: 'Using API route fallback for user'
        });
        
        const response = await fetch('/api/auth/me');
        
        // Log API response
        authDebugger.logApiResponse('/api/auth/me', response);
        
        if (response.ok) {
          const userData = await response.json();
          
          // Log fallback user received
          if (userData) {
            authDebugger.logAuthEvent({
              type: 'user_fallback_received',
              hasUser: !!userData,
              hasEmail: !!userData.email,
              hasSub: !!userData.sub
            });
          }
          
          return userData;
        }
      } catch (apiError) {
        console.error('[Auth0] API fallback failed:', apiError);
        
        // Log API fallback error
        authDebugger.logAuthEvent({
          type: 'error',
          message: \`API fallback failed: \${apiError.message}\`,
          stack: apiError.stack
        });
      }
      
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: async () => {
    try {
      const client = await getAuth0Client();
      const authenticated = await client.isAuthenticated();
      
      console.log(\`[Auth0] Authentication status: \${authenticated ? 'Authenticated' : 'Not authenticated'}\`);
      
      // Log authentication check
      authDebugger.logAuthEvent({
        type: 'auth_check',
        authenticated
      });
      
      return authenticated;
    } catch (error) {
      console.error('[Auth0] Error checking authentication:', error);
      
      // Log error event
      authDebugger.logAuthEvent({
        type: 'error',
        message: \`Authentication check error: \${error.message}\`,
        stack: error.stack
      });
      
      return false;
    }
  },

  /**
   * Login with Auth0
   */
  login: async (options = {}) => {
    try {
      const client = await getAuth0Client();
      
      // Get Auth0 config for debugging
      const authConfig = getAuth0Config();
      
      // Enhanced options with domain info
      const enhancedOptions = {
        authorizationParams: {
          screen_hint: 'login',
          ...options
        }
      };
      
      // Log login attempt with domain info
      console.log('[Auth0] Initiating login with redirect', {
        domain: authConfig.domain,
        useCustomDomain: !authConfig.domain.includes('.auth0.com'),
        options: enhancedOptions
      });
      
      // Log login event
      authDebugger.logAuthEvent({
        type: 'login_initiated',
        domain: authConfig.domain,
        useCustomDomain: !authConfig.domain.includes('.auth0.com'),
        options: enhancedOptions
      });
      
      await client.loginWithRedirect(enhancedOptions);
    } catch (error) {
      console.error('[Auth0] Login failed:', error);
      
      // Log error event
      authDebugger.logAuthEvent({
        type: 'error',
        message: \`Login failed: \${error.message}\`,
        stack: error.stack
      });
      
      throw error;
    }
  },

  /**
   * Logout from Auth0
   */
  logout: async () => {
    try {
      const client = await getAuth0Client();
      
      // Log logout attempt
      console.log('[Auth0] Initiating logout');
      
      // Log logout event
      authDebugger.logAuthEvent({
        type: 'logout_initiated',
        returnTo: typeof window !== 'undefined' ? window.location.origin : ''
      });
      
      await client.logout({
        logoutParams: {
          returnTo: typeof window !== 'undefined' ? window.location.origin : ''
        }
      });
    } catch (error) {
      console.error('[Auth0] Logout failed:', error);
      
      // Log error event
      authDebugger.logAuthEvent({
        type: 'error',
        message: \`Logout failed: \${error.message}\`,
        stack: error.stack
      });
      
      throw error;
    }
  },
  
  /**
   * Get authentication debugging summary
   */
  getDebugSummary: () => {
    return authDebugger.getAuthDebugSummary();
  }
};

export default auth0Utils;`;

  // Write the updated file
  fs.writeFileSync(auth0ConfigPath, updatedCode);
  console.log(`Updated Auth0 config with enhanced debugging`);
  
  return auth0ConfigPath;
}

// Update script registry
function updateScriptRegistry() {
  const registryPath = path.join(projectRoot, 'scripts/script_registry.md');
  
  if (fs.existsSync(registryPath)) {
    console.log(`Updating script registry at ${registryPath}`);
    
    const registryContent = fs.readFileSync(registryPath, 'utf8');
    const newEntry = `
| Version0097_fix_auth0_custom_domain_with_debug.mjs | 2025-06-06 | Fixed Auth0 login to always use custom domain (auth.dottapps.com) and added comprehensive debugging | Success |
`;
    
    if (!registryContent.includes('Version0097_fix_auth0_custom_domain_with_debug.mjs')) {
      fs.appendFileSync(registryPath, newEntry);
      console.log('Added new entry to script registry');
    } else {
      console.log('Script already registered in registry');
    }
  } else {
    console.warn(`Script registry not found at ${registryPath}`);
  }
}

// Execute the script
main().catch(error => {
  console.error('Error executing script:', error);
  process.exit(1);
});
