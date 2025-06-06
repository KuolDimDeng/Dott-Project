/**
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
    clientId: config.clientId ? `${config.clientId.substring(0, 8)}...` : undefined,
    useCustomDomain: config.useCustomDomain,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };
  
  // Verify if environment variables match expected values
  if (process.env.NEXT_PUBLIC_AUTH0_DOMAIN && process.env.NEXT_PUBLIC_AUTH0_DOMAIN !== config.domain) {
    console.warn('⚠️ [Auth0Debug] Domain mismatch! ENV:', process.env.NEXT_PUBLIC_AUTH0_DOMAIN, 'Config:', config.domain);
    logAuthEvent({
      type: 'warning',
      message: `Domain mismatch between ENV (${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}) and Config (${config.domain})`
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
  
  console.log(`🔄 [Auth0Debug] Event: ${event.type} - ${event.message || ''}`);
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
  console.log(`🌐 [Auth0Debug] API Request to ${url}`);
  
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
  console.log(`🌐 [Auth0Debug] API Response from ${url}: ${response.status} ${response.statusText}`);
  
  logAuthEvent({
    type: 'api_response',
    url,
    status: response.status,
    statusText: response.statusText,
    data: data ? JSON.stringify(data).substring(0, 100) + '...' : undefined
  });
  
  if (!response.ok) {
    console.error(`❌ [Auth0Debug] API Error: ${response.status} ${response.statusText}`);
    logAuthEvent({
      type: 'error',
      message: `API Error: ${response.status} ${response.statusText}`,
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
  
  console.log(`🔍 [Auth0Debug] Domain Type: ${domainType} (${domain})`);
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
};