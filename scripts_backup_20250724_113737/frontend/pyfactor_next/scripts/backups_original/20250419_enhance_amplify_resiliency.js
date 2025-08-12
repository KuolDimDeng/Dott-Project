/**
 * Script: 20250419_enhance_amplify_resiliency.js
 * Version: 1.0
 * Purpose: Enhance Amplify resiliency module with better error handling
 * 
 * This script enhances the amplifyResiliency.js file with integration for the 
 * circuit breaker pattern to prevent cascading failures during network issues.
 */

const fs = require('fs');
const path = require('path');

// Path to the amplifyResiliency.js file
const RESILIENCY_PATH = path.resolve(__dirname, '../src/utils/amplifyResiliency.js');

// Ensure the file exists
if (!fs.existsSync(RESILIENCY_PATH)) {
  console.error(`Error: ${RESILIENCY_PATH} does not exist`);
  process.exit(1);
}

// Read current content
const originalContent = fs.readFileSync(RESILIENCY_PATH, 'utf8');

// Create a backup
fs.writeFileSync(`${RESILIENCY_PATH}.bak`, originalContent);

// Add the shouldAttemptCognitoRequest import
let updatedContent = originalContent.replace(
  'import { \n  trackCognitoFailure, \n  isCognitoUnreliable, \n  getCognitoTimeout, \n  resetCognitoFailures',
  'import { \n  trackCognitoFailure, \n  trackCognitoSuccess, \n  isCognitoUnreliable, \n  getCognitoTimeout, \n  resetCognitoFailures, \n  shouldAttemptCognitoRequest'
);

// Enhance the resilientFetchUserAttributes function with circuit breaker pattern
updatedContent = updatedContent.replace(
  'export const resilientFetchUserAttributes = async (fetchUserAttributesFn, options = {}) => {',
  `export const resilientFetchUserAttributes = async (fetchUserAttributesFn, options = {}) => {
  // Check circuit breaker state before attempting request
  if (!shouldAttemptCognitoRequest()) {
    logger.warn('[AmplifyResiliency] Circuit breaker is OPEN, using cached attributes');
    
    // Use cached attributes if available
    if (fallbackToCache && cachedValues.userAttributes) {
      const age = Date.now() - cachedValues.timestamp;
      logger.info(\`[AmplifyResiliency] Using cached user attributes (\${age / 1000}s old)\`);
      return cachedValues.userAttributes;
    }
    
    // Try fallback tenant ID if no cached attributes
    const tenantId = getFallbackTenantId();
    if (tenantId) {
      logger.info('[AmplifyResiliency] Using emergency fallback user attributes with tenant ID:', tenantId);
      return {
        'custom:tenant_ID': tenantId,
        'custom:tenantId': tenantId
      };
    }
    
    throw new Error('Circuit breaker is open and no fallback data available');
  }`
);

// Add circuit breaker tracking for success
updatedContent = updatedContent.replace(
  '// Log performance info\n        logger.debug(`[AmplifyResiliency] Successfully fetched user attributes in ${duration}ms`);',
  `// Log performance info
        logger.debug(\`[AmplifyResiliency] Successfully fetched user attributes in \${duration}ms\`);
        
        // Track success for circuit breaker
        trackCognitoSuccess();`
);

// Add the same circuit breaker check to resilientGetCurrentUser
updatedContent = updatedContent.replace(
  'export const resilientGetCurrentUser = async (getCurrentUserFn, options = {}) => {',
  `export const resilientGetCurrentUser = async (getCurrentUserFn, options = {}) => {
  // Check circuit breaker state before attempting request
  if (!shouldAttemptCognitoRequest()) {
    logger.warn('[AmplifyResiliency] Circuit breaker is OPEN, skipping getCurrentUser request');
    throw new Error('Circuit breaker is open, request blocked to prevent cascading failures');
  }`
);

// Add circuit breaker tracking for getCurrentUser success
updatedContent = updatedContent.replace(
  '// Log performance info\n          logger.debug(`[AmplifyResiliency] Successfully got current user in ${duration}ms`);',
  `// Log performance info
          logger.debug(\`[AmplifyResiliency] Successfully got current user in \${duration}ms\`);
          
          // Track success for circuit breaker
          trackCognitoSuccess();`
);

// Add circuit breaker check to resilientFetchAuthSession
updatedContent = updatedContent.replace(
  'export const resilientFetchAuthSession = async (fetchAuthSessionFn, options = {}) => {',
  `export const resilientFetchAuthSession = async (fetchAuthSessionFn, options = {}) => {
  // Check circuit breaker state before attempting request
  if (!shouldAttemptCognitoRequest()) {
    logger.warn('[AmplifyResiliency] Circuit breaker is OPEN, using cached session if available');
    
    // Return cached session if available
    if (cachedValues.session) {
      const age = Date.now() - cachedValues.timestamp;
      logger.info(\`[AmplifyResiliency] Using cached session (\${age / 1000}s old)\`);
      return cachedValues.session;
    }
    
    throw new Error('Circuit breaker is open and no cached session available');
  }`
);

// Add success tracking for fetchAuthSession
updatedContent = updatedContent.replace(
  '// Cache the session for potential future use\n          cacheSession(session);',
  `// Cache the session for potential future use
          cacheSession(session);
          
          // Track success for circuit breaker
          trackCognitoSuccess();`
);

// Add function to help with AWS AppCache integration
const appCacheIntegrationFunction = `
/**
 * Unified function to get AWS AppCache value with fallback to Cognito
 * This provides a resilient data access pattern when Cognito may be unreliable
 * 
 * @param {string} key - The cache key to retrieve
 * @param {Function} cognitoFetchFn - Function to fetch from Cognito if cache misses
 * @param {Object} options - Options including fallback value
 * @returns {Promise<any>} The value from cache, Cognito, or fallback
 */
export const getResiliantCacheValue = async (key, cognitoFetchFn, options = {}) => {
  const { 
    fallbackValue = null,
    cacheTTL = 3600000, // 1 hour default
    logPrefix = '[AppCache]'
  } = options;
  
  try {
    // First try AppCache if available
    if (typeof window !== 'undefined' && window.__APP_CACHE) {
      const cachedValue = window.__APP_CACHE[key];
      const cachedTime = window.__APP_CACHE[key + '_timestamp'];
      
      // If we have a valid cached value and it's not expired
      if (cachedValue && cachedTime && (Date.now() - cachedTime < cacheTTL)) {
        logger.debug(\`\${logPrefix} Using cached value for \${key} (\${(Date.now() - cachedTime) / 1000}s old)\`);
        return cachedValue;
      }
    }
    
    // Check circuit breaker before trying Cognito
    if (!shouldAttemptCognitoRequest()) {
      logger.warn(\`\${logPrefix} Circuit breaker is OPEN, using fallback value for \${key}\`);
      return fallbackValue;
    }
    
    // No cache hit, try Cognito
    logger.debug(\`\${logPrefix} Cache miss for \${key}, fetching from Cognito\`);
    const value = await cognitoFetchFn();
    
    // Save to AppCache for future use
    if (typeof window !== 'undefined') {
      if (!window.__APP_CACHE) window.__APP_CACHE = {};
      window.__APP_CACHE[key] = value;
      window.__APP_CACHE[key + '_timestamp'] = Date.now();
    }
    
    // Track success for circuit breaker
    trackCognitoSuccess();
    
    return value;
  } catch (error) {
    logger.error(\`\${logPrefix} Error fetching \${key}:\`, error);
    
    // Track failure for circuit breaker
    trackCognitoFailure(error);
    
    // Return fallback
    return fallbackValue;
  }
};
`;

// Add the new function to the end of the file
updatedContent += appCacheIntegrationFunction;

// Write the updated file
fs.writeFileSync(RESILIENCY_PATH, updatedContent);

// Create an entry in the script registry
const SCRIPT_REGISTRY_PATH = path.resolve(__dirname, './script_registry.json');
let scriptRegistry = {};

if (fs.existsSync(SCRIPT_REGISTRY_PATH)) {
  try {
    scriptRegistry = JSON.parse(fs.readFileSync(SCRIPT_REGISTRY_PATH, 'utf8'));
  } catch (e) {
    console.log('Error reading script registry, creating new one');
  }
}

scriptRegistry["20250419_enhance_amplify_resiliency"] = {
  executed: new Date().toISOString(),
  version: "1.0",
  purpose: "Enhance Amplify resiliency module with better error handling",
  changedFiles: [RESILIENCY_PATH]
};

fs.writeFileSync(SCRIPT_REGISTRY_PATH, JSON.stringify(scriptRegistry, null, 2));

console.log('Amplify resiliency enhancement completed successfully');
console.log(`Updated file: ${RESILIENCY_PATH}`);
console.log('Backup created at: ' + RESILIENCY_PATH + '.bak'); 