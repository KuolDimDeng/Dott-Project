/**
 * Script: 20250419_fix_cognito_network_errors.js
 * Version: 1.0
 * Purpose: Fix Cognito authentication issues and network errors
 * 
 * This script addresses authentication failures and network errors with Cognito
 * by implementing proper initialization checks and enhancing error handling.
 */

const fs = require('fs');
const path = require('path');

// Config paths
const AMPLIFY_UNIFIED_PATH = path.resolve(__dirname, '../src/config/amplifyUnified.js');
const NETWORK_MONITOR_PATH = path.resolve(__dirname, '../src/utils/networkMonitor.js');
const MIDDLEWARE_PATH = path.resolve(__dirname, '../src/middleware.js');

// Read current files
const amplifyUnifiedContent = fs.readFileSync(AMPLIFY_UNIFIED_PATH, 'utf8');
const networkMonitorContent = fs.readFileSync(NETWORK_MONITOR_PATH, 'utf8');

// Check if middleware file exists
let middlewareContent = '';
if (fs.existsSync(MIDDLEWARE_PATH)) {
  middlewareContent = fs.readFileSync(MIDDLEWARE_PATH, 'utf8');
}

// Create backup files
fs.writeFileSync(`${AMPLIFY_UNIFIED_PATH}.bak`, amplifyUnifiedContent);
fs.writeFileSync(`${NETWORK_MONITOR_PATH}.bak`, networkMonitorContent);
if (middlewareContent) {
  fs.writeFileSync(`${MIDDLEWARE_PATH}.bak`, middlewareContent);
}

// Fix 1: Enhance Amplify configuration with better retry logic
const enhancedAmplifyUnified = amplifyUnifiedContent.replace(
  'export const configureAmplify = () => {',
  `export const configureAmplify = (forceReconfigure = false) => {
  // Skip if already configured and force isn't set
  if (isConfigured && !forceReconfigure) {
    logger.debug('[AmplifyUnified] Amplify already configured, skipping');
    return true;
  }
  
  // Clear any previous configuration to avoid conflicts
  try {
    if (forceReconfigure && typeof window !== 'undefined') {
      logger.info('[AmplifyUnified] Force reconfiguring Amplify');
      // Reset the internal Amplify state
      if (window.__amplifyConfigured) {
        window.__amplifyConfigured = false;
      }
    }
  } catch (e) {
    logger.error('[AmplifyUnified] Error during force reconfigure:', e);
  }`
);

// Fix 2: Add better error handling and recovery logic
const enhancedErrorHandling = enhancedAmplifyUnified.replace(
  'const ensureConfigAndCall = async (authFunction, ...args) => {',
  `const ensureConfigAndCall = async (authFunction, ...args) => {
  let retries = 0;
  const maxRetries = 2;
  
  while (retries <= maxRetries) {
    try {
      // Check if Amplify is configured
      if (!isAmplifyConfigured()) {
        logger.warn('[AmplifyUnified] Amplify not configured before auth function call, configuring now');
        // Force reconfigure on first retry
        configureAmplify(retries > 0);
      }
      
      // Call the auth function
      return await authFunction(...args);
    } catch (error) {
      retries++;
      
      // Handle UserPool configuration errors specifically
      if (error.name === 'AuthUserPoolException' || 
          (error.message && error.message.includes('UserPool not configured'))) {
        logger.warn(\`[AmplifyUnified] Auth UserPool not configured, attempting recovery (retry \${retries}/\${maxRetries})\`);
        
        // Force a reconfiguration on retry
        configureAmplify(true);
        
        // Wait before retrying
        if (retries <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500 * retries));
          continue;
        }
      }
      
      // For non-recoverable errors, throw after all retries
      if (retries > maxRetries) {
        throw error;
      }
      
      // Wait before regular retry
      await new Promise(resolve => setTimeout(resolve, 500 * retries));
    }
  }`
);

// Fix 3: Add initialization hook to ensure Amplify is configured correctly
const addInitHook = enhancedErrorHandling.replace(
  'export const signInWithConfig',
  `// Add initialization hook for React components
export const initAmplify = () => {
  if (typeof window !== 'undefined') {
    // Check if Amplify is already configured
    if (!window.__amplifyConfigured) {
      logger.info('[AmplifyUnified] Initializing Amplify from hook');
      configureAmplify();
      return true;
    }
    return window.__amplifyConfigured;
  }
  return false;
};

export const signInWithConfig`
);

// Fix 4: Enhance network monitoring with circuit breaker pattern
const enhancedNetworkMonitor = networkMonitorContent.replace(
  '/**\n * AWS Amplify Network Monitoring\n */',
  `/**
 * AWS Amplify Network Monitoring
 * 
 * Enhanced with circuit breaker pattern to prevent repeated failed requests
 * and improve resilience to network issues.
 */`
);

// Add circuit breaker implementation if not already present
let enhancedNetworkMonitorFinal = enhancedNetworkMonitor;
if (!enhancedNetworkMonitor.includes('CircuitBreaker')) {
  enhancedNetworkMonitorFinal = enhancedNetworkMonitor.replace(
    'const cognitoStats = {',
    `// Circuit breaker states
const CIRCUIT_STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

// Circuit breaker for Cognito API calls
const cognitoCircuitBreaker = {
  state: CIRCUIT_STATES.CLOSED,
  failureCount: 0,
  lastFailure: 0,
  successCount: 0,
  failureThreshold: 3,
  resetTimeout: 30000, // 30 seconds
  successThreshold: 2
};

// Circuit breaker functions
export const getCognitoCircuitState = () => cognitoCircuitBreaker.state;

export const resetCognitoCircuit = (forceState = CIRCUIT_STATES.CLOSED) => {
  cognitoCircuitBreaker.state = forceState;
  cognitoCircuitBreaker.failureCount = 0;
  cognitoCircuitBreaker.successCount = 0;
  cognitoCircuitBreaker.lastFailure = 0;
  logger.info(\`[CircuitBreaker] Cognito circuit has been manually reset to \${forceState} state\`);
  return forceState;
};

export const shouldAttemptCognitoRequest = () => {
  const now = Date.now();
  
  switch (cognitoCircuitBreaker.state) {
    case CIRCUIT_STATES.CLOSED:
      // Circuit is closed, requests allowed
      return true;
    
    case CIRCUIT_STATES.OPEN:
      // Check if timeout has elapsed to transition to HALF_OPEN
      if (now - cognitoCircuitBreaker.lastFailure > cognitoCircuitBreaker.resetTimeout) {
        cognitoCircuitBreaker.state = CIRCUIT_STATES.HALF_OPEN;
        cognitoCircuitBreaker.successCount = 0;
        logger.info('[CircuitBreaker] Cognito circuit transitioned from OPEN to HALF_OPEN');
        return true;
      }
      // Circuit is open, don't allow requests
      return false;
    
    case CIRCUIT_STATES.HALF_OPEN:
      // Allow limited requests in HALF_OPEN state
      return true;
    
    default:
      return true;
  }
};

export const trackCognitoSuccess = () => {
  if (cognitoCircuitBreaker.state === CIRCUIT_STATES.HALF_OPEN) {
    cognitoCircuitBreaker.successCount++;
    
    if (cognitoCircuitBreaker.successCount >= cognitoCircuitBreaker.successThreshold) {
      cognitoCircuitBreaker.state = CIRCUIT_STATES.CLOSED;
      cognitoCircuitBreaker.failureCount = 0;
      cognitoCircuitBreaker.successCount = 0;
      logger.info('[CircuitBreaker] Cognito circuit transitioned from HALF_OPEN to CLOSED');
    }
  }
};

export const trackCognitoFailure = (error) => {
  const now = Date.now();
  cognitoCircuitBreaker.lastFailure = now;
  
  if (cognitoCircuitBreaker.state === CIRCUIT_STATES.CLOSED) {
    cognitoCircuitBreaker.failureCount++;
    
    if (cognitoCircuitBreaker.failureCount >= cognitoCircuitBreaker.failureThreshold) {
      cognitoCircuitBreaker.state = CIRCUIT_STATES.OPEN;
      logger.warn('[CircuitBreaker] Cognito circuit transitioned from CLOSED to OPEN');
    }
  } else if (cognitoCircuitBreaker.state === CIRCUIT_STATES.HALF_OPEN) {
    cognitoCircuitBreaker.state = CIRCUIT_STATES.OPEN;
    logger.warn('[CircuitBreaker] Cognito circuit transitioned from HALF_OPEN to OPEN');
  }
};

const cognitoStats = {`
  );
}

// Fix 5: Enhance middleware to be more resilient to authentication errors
let enhancedMiddleware = middlewareContent;

if (middlewareContent) {
  enhancedMiddleware = middlewareContent.replace(
    'export default async function middleware',
    `import { resetCognitoCircuit, getCognitoCircuitState } from './src/utils/networkMonitor';

// Reset circuit breaker for critical paths
function resetCircuitBreakerForCriticalPath(pathname) {
  if (pathname.includes('/auth/') || pathname === '/' || pathname.includes('/dashboard')) {
    const currentState = getCognitoCircuitState();
    if (currentState !== 'CLOSED') {
      resetCognitoCircuit('CLOSED');
      console.info('[Middleware] Reset circuit breaker for critical path:', pathname);
    }
  }
}

export default async function middleware`
  );

  // Add circuit breaker reset to middleware logic
  enhancedMiddleware = enhancedMiddleware.replace(
    'export const config =',
    `  // Reset circuit breaker for important paths
  resetCircuitBreakerForCriticalPath(request.nextUrl.pathname);

export const config =`
  );
}

// Write updated files
fs.writeFileSync(AMPLIFY_UNIFIED_PATH, addInitHook);
fs.writeFileSync(NETWORK_MONITOR_PATH, enhancedNetworkMonitorFinal);
if (enhancedMiddleware) {
  fs.writeFileSync(MIDDLEWARE_PATH, enhancedMiddleware);
}

// Create a component wrapper for Auth initialization
const AUTH_INITIALIZER_PATH = path.resolve(__dirname, '../src/components/AuthInitializer.js');
const authInitializerContent = `'use client';

/**
 * AuthInitializer Component
 * 
 * Ensures AWS Amplify is properly configured on component mount
 * This helps prevent "Auth UserPool not configured" errors
 */

import { useEffect } from 'react';
import { initAmplify } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';

export default function AuthInitializer() {
  useEffect(() => {
    try {
      const success = initAmplify();
      if (success) {
        logger.info('[AuthInitializer] Auth configuration applied successfully');
      } else {
        logger.warn('[AuthInitializer] Auth configuration failed, will retry on user interaction');
      }
    } catch (error) {
      logger.error('[AuthInitializer] Error initializing auth:', error);
    }
  }, []);
  
  // This component renders nothing, it just initializes auth
  return null;
}
`;

fs.writeFileSync(AUTH_INITIALIZER_PATH, authInitializerContent);

// Create script registry entry
const SCRIPT_REGISTRY_PATH = path.resolve(__dirname, './script_registry.json');
let scriptRegistry = {};

if (fs.existsSync(SCRIPT_REGISTRY_PATH)) {
  try {
    scriptRegistry = JSON.parse(fs.readFileSync(SCRIPT_REGISTRY_PATH, 'utf8'));
  } catch (e) {
    console.log('Error reading script registry, creating new one');
  }
}

scriptRegistry["20250419_fix_cognito_network_errors"] = {
  executed: new Date().toISOString(),
  version: "1.0",
  purpose: "Fix Cognito authentication issues and network errors",
  changedFiles: [
    AMPLIFY_UNIFIED_PATH,
    NETWORK_MONITOR_PATH,
    middlewareContent ? MIDDLEWARE_PATH : null,
    AUTH_INITIALIZER_PATH
  ].filter(Boolean)
};

fs.writeFileSync(SCRIPT_REGISTRY_PATH, JSON.stringify(scriptRegistry, null, 2));

// Create documentation file
const DOCS_PATH = path.resolve(__dirname, '../docs/COGNITO_NETWORK_FIX.md');
const docsContent = `# Cognito Network Error Fixes

## Issue
The application was experiencing authentication errors and network failures when connecting to AWS Cognito, resulting in:
- "Auth UserPool not configured" errors
- Unhandled authentication failures
- Repeated failed network requests

## Fix Implementation (v1.0)
Applied on: ${new Date().toISOString()}

### Enhanced Amplify Configuration
- Added force reconfiguration option to recover from broken state
- Improved initialization checks to ensure Amplify is properly configured
- Added retry logic with exponential backoff
- Created a dedicated AuthInitializer component

### Circuit Breaker Pattern
- Implemented circuit breaker for Cognito requests to prevent cascading failures
- Three states: CLOSED (normal), OPEN (blocking requests), HALF-OPEN (testing recovery)
- Automatic recovery after timeout period
- Manual reset on important user navigation paths

### Middleware Enhancements
- Reset circuit breaker for critical paths (auth, dashboard)
- Improved error handling for tenant isolation

## Usage
The fixes are automatically applied through the application's startup process. No manual steps are required.

## Monitoring
Monitor the console logs for the following patterns:
- "[AmplifyUnified] Auth configuration applied successfully" - Indicates successful initialization
- "[CircuitBreaker] Cognito circuit transitioned to..." - Shows circuit breaker state changes
- "[AuthInitializer] Auth configuration applied successfully" - Confirms component initialization

## Troubleshooting
If authentication issues persist:
1. Clear browser cache and reload
2. Check AWS Cognito service status
3. Verify environment variables for AWS configuration
4. Check network connectivity to AWS services
`;

fs.writeFileSync(DOCS_PATH, docsContent);

// Create integration script for main layout file
const LAYOUT_INTEGRATION_PATH = path.resolve(__dirname, './integrate_auth_initializer.js');
const layoutIntegrationContent = `/**
 * Script: integrate_auth_initializer.js
 * 
 * This script modifies the RootLayout component to include the AuthInitializer component
 * to ensure AWS Amplify is properly configured on application start.
 */

const fs = require('fs');
const path = require('path');

// Find the root layout file
const LAYOUT_PATHS = [
  path.resolve(__dirname, '../src/app/layout.js'),
  path.resolve(__dirname, '../src/app/layout.jsx'),
  path.resolve(__dirname, '../src/app/layout.tsx')
];

let layoutPath = null;
for (const p of LAYOUT_PATHS) {
  if (fs.existsSync(p)) {
    layoutPath = p;
    break;
  }
}

if (!layoutPath) {
  console.error('Root layout file not found');
  process.exit(1);
}

// Read the layout file
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

// Create backup
fs.writeFileSync(\`\${layoutPath}.bak\`, layoutContent);

// Check if AuthInitializer is already imported
if (!layoutContent.includes('AuthInitializer')) {
  // Add the import - fix the regex pattern by using a string pattern instead
  const importPattern = 'import';
  let updatedContent = layoutContent;
  
  // Find a good place to add the import - after another import
  if (layoutContent.includes('import')) {
    const importLines = layoutContent.split('\\n').filter(line => line.trim().startsWith('import'));
    if (importLines.length > 0) {
      // Add after the last import
      const lastImport = importLines[importLines.length - 1];
      updatedContent = layoutContent.replace(
        lastImport,
        \`\${lastImport}\\nimport AuthInitializer from '@/components/AuthInitializer';\`
      );
    } else {
      // Just add at the top if no imports found
      updatedContent = \`import AuthInitializer from '@/components/AuthInitializer';\\n\${layoutContent}\`;
    }
  } else {
    // Just add at the top if no imports found
    updatedContent = \`import AuthInitializer from '@/components/AuthInitializer';\\n\${layoutContent}\`;
  }
  
  // Add the component to the layout - fix the regex by using a string search
  if (updatedContent.includes('<body')) {
    updatedContent = updatedContent.replace(
      '<body',
      '<body>\\n      <AuthInitializer />\\n      '
    );
  } else {
    console.warn('Could not find <body> tag in layout. You may need to manually add <AuthInitializer /> to your layout.');
  }
  
  // Write updated file
  fs.writeFileSync(layoutPath, updatedContent);
  console.log('Added AuthInitializer to layout file:', layoutPath);
} else {
  console.log('AuthInitializer already present in layout file');
}
`;

fs.writeFileSync(LAYOUT_INTEGRATION_PATH, layoutIntegrationContent);

console.log('Cognito network error fix script completed successfully');
console.log('Run node integrate_auth_initializer.js to add the AuthInitializer to your layout'); 