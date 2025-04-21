/**
 * Auth and Session Management Fix Script
 * Issue ID: AUTH-FIX-2025-06-01
 * Version: v1.0
 * 
 * This script fixes authentication and session management issues:
 * 1. Increases session timeout values
 * 2. Improves error handling in authentication flow
 * 3. Adds more graceful fallbacks for failed session loading
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Root directory paths
const rootDir = path.resolve(__dirname, '..');
const hookDir = path.join(rootDir, 'src', 'hooks');
const utilsDir = path.join(rootDir, 'src', 'utils');
const configDir = path.join(rootDir, 'src', 'config');
const componentsDir = path.join(rootDir, 'src', 'app', 'dashboard', 'components');

// Backup function
function backupFile(filePath) {
  const backupPath = `${filePath}.backup-${new Date().toISOString()}`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`Created backup: ${backupPath}`);
  return backupPath;
}

// Log function
function log(message) {
  console.log(`[AUTH-FIX] ${message}`);
}

// Main function to apply all fixes
async function applyFixes() {
  log('Starting auth and session management fixes...');
  
  try {
    // 1. Fix useSession hook timeout issues
    const useSessionPath = path.join(hookDir, 'useSession.js');
    if (fs.existsSync(useSessionPath)) {
      log('Fixing useSession hook...');
      backupFile(useSessionPath);
      
      let useSessionContent = fs.readFileSync(useSessionPath, 'utf8');
      
      // Increase timeout values and add better error handling
      useSessionContent = useSessionContent.replace(
        'const LOADING_TIMEOUT = 10000;', 
        'const LOADING_TIMEOUT = 20000; // Increased from 10s to 20s'
      );
      
      useSessionContent = useSessionContent.replace(
        'const MIN_REFRESH_INTERVAL = 30000;',
        'const MIN_REFRESH_INTERVAL = 20000; // Reduced from 30s to 20s for more responsive refreshes'
      );
      
      // Improve session timeout error handling by adding fallback mechanism
      // Find the section where loading timeout is handled
      let timeoutSectionRegex = /\/\/ Set a timeout to clear loading state after LOADING_TIMEOUT regardless of session result[\s\S]*?setTimeout\(\(\) => \{[\s\S]*?setIsLoading\(false\);[\s\S]*?\}, LOADING_TIMEOUT\);/;
      
      let improvedTimeoutSection = `// Set a timeout to clear loading state after LOADING_TIMEOUT regardless of session result
      loadingTimeoutRef.current = setTimeout(() => {
        if (!isMounted.current) return;
        
        setIsLoading(false);
        
        if (shouldLogSessionMessage('[useSession] Loading timeout reached')) {
          logger.warn('[useSession] Global loading timeout reached, forcing loading state to false');
        }
        
        // Try to get attributes from Cognito as fallback
        getUserAttributesFromCognito().then(attributes => {
          if (!isMounted.current) return;
          
          if (attributes) {
            if (shouldLogSessionMessage('[useSession] Using Cognito attributes fallback after timeout')) {
              logger.info('[useSession] Loading timed out with no session. Using Cognito attributes fallback.');
            }
            // Use cached tokens if available, otherwise create minimal session
            const cachedTokens = getTokens();
            setSession({ 
              tokens: cachedTokens || {},
              userAttributes: attributes,
              isPartial: true // Flag to indicate this is a partial session
            });
            
            // Set a flag to indicate we had to use a fallback
            if (typeof window !== 'undefined') {
              window.__sessionUsedFallback = true;
            }
          }
        }).catch(err => {
          logger.warn('[useSession] Failed to get fallback attributes after timeout:', err);
        });
      }, LOADING_TIMEOUT);`;
      
      useSessionContent = useSessionContent.replace(timeoutSectionRegex, improvedTimeoutSection);
      
      fs.writeFileSync(useSessionPath, useSessionContent);
      log('✓ Fixed useSession hook with increased timeouts and better fallbacks');
    }

    // 2. Fix amplifyResiliency.js for better error handling
    const amplifyResiliencyPath = path.join(utilsDir, 'amplifyResiliency.js');
    if (fs.existsSync(amplifyResiliencyPath)) {
      log('Improving Amplify resiliency...');
      backupFile(amplifyResiliencyPath);
      
      let resiliencyContent = fs.readFileSync(amplifyResiliencyPath, 'utf8');
      
      // Add more aggressive caching for user attributes
      let cacheSection = /export const cacheUserAttributes = \(attributes\) => \{[\s\S]*?return (true|false);[\s\S]*?\};/;
      
      let improvedCacheSection = `export const cacheUserAttributes = (attributes) => {
  if (attributes && Object.keys(attributes).length > 0) {
    cachedValues.userAttributes = { ...attributes };
    cachedValues.timestamp = Date.now();
    
    // Also cache in AppCache for cross-component resilience
    try {
      if (typeof window !== 'undefined') {
        // Only store in sessionStorage if allowed
        try {
          sessionStorage.setItem('amplify_cached_attributes', JSON.stringify({
            attributes: cachedValues.userAttributes,
            timestamp: cachedValues.timestamp
          }));
        } catch (e) {
          // Ignore storage errors
        }
        
        // Always store in APP_CACHE
        if (window.__APP_CACHE) {
          window.__APP_CACHE.user = window.__APP_CACHE.user || {};
          window.__APP_CACHE.user.attributes = { ...attributes };
          window.__APP_CACHE.user.timestamp = Date.now();
        }
      }
    } catch (e) {
      // Ignore storage errors
      logger.debug('[AmplifyResiliency] Error caching user attributes:', e);
    }
    
    return true;
  }
  return false;
};`;
      
      resiliencyContent = resiliencyContent.replace(cacheSection, improvedCacheSection);
      
      // Improve cache loading from multiple sources
      let cacheLoadingSection = /\/\/ Load cached attributes from sessionStorage during initialization[\s\S]*?if \(typeof window !== 'undefined'\) \{[\s\S]*?}\s*} catch \(e\) \{[\s\S]*?}\s*}/;
      
      let improvedCacheLoadingSection = `// Load cached attributes from multiple sources during initialization
if (typeof window !== 'undefined') {
  try {
    // Try to load from sessionStorage first
    const storedCache = sessionStorage.getItem('amplify_cached_attributes');
    if (storedCache) {
      const parsed = JSON.parse(storedCache);
      if (parsed.attributes && parsed.timestamp && 
          (Date.now() - parsed.timestamp < 3600000)) { // 1 hour max age
        cachedValues.userAttributes = parsed.attributes;
        cachedValues.timestamp = parsed.timestamp;
        logger.debug(\`[AmplifyResiliency] Loaded cached user attributes from sessionStorage (\${(Date.now() - parsed.timestamp) / 1000}s old)\`);
      }
    }
    
    // Then check APP_CACHE as a backup
    if (window.__APP_CACHE && window.__APP_CACHE.user && window.__APP_CACHE.user.attributes) {
      const appCacheTimestamp = window.__APP_CACHE.user.timestamp || 0;
      
      // Use APP_CACHE if it's newer or if we don't have attributes yet
      if (!cachedValues.userAttributes || (appCacheTimestamp > cachedValues.timestamp)) {
        cachedValues.userAttributes = { ...window.__APP_CACHE.user.attributes };
        cachedValues.timestamp = appCacheTimestamp;
        logger.debug(\`[AmplifyResiliency] Loaded cached user attributes from APP_CACHE (\${(Date.now() - appCacheTimestamp) / 1000}s old)\`);
      }
    }
  } catch (e) {
    // Ignore storage errors
    logger.debug('[AmplifyResiliency] Error loading cached attributes:', e);
  }
}`;
      
      resiliencyContent = resiliencyContent.replace(cacheLoadingSection, improvedCacheLoadingSection);
      
      fs.writeFileSync(amplifyResiliencyPath, resiliencyContent);
      log('✓ Improved Amplify resiliency with better caching mechanisms');
    }

    // 3. Fix DashAppBar component to handle errors better
    const dashAppBarPath = path.join(componentsDir, 'DashAppBar.js');
    if (fs.existsSync(dashAppBarPath)) {
      log('Fixing DashAppBar component...');
      backupFile(dashAppBarPath);
      
      let dashAppBarContent = fs.readFileSync(dashAppBarPath, 'utf8');
      
      // Fix duplicate log message
      const duplicateLogRegex = /logger\.info\('\[DashAppBar\] Component initialized - Using ONLY Cognito and AppCache for data sources \(NO GRAPHQL\)'\);/g;
      let match;
      let count = 0;
      while ((match = duplicateLogRegex.exec(dashAppBarContent)) !== null) {
        count++;
        if (count > 1) {
          // Remove all but the first instance
          dashAppBarContent = dashAppBarContent.replace(match[0], '// Removed duplicate log');
        }
      }
      
      // Improve business name handling to prevent null business name
      const businessNameRegex = /const newBusinessName = cognitoName \|\| userDataName \|\| profileDataName \|\| cachedName;/;
      
      const improvedBusinessNameHandling = `const newBusinessName = cognitoName || userDataName || profileDataName || cachedName || '';
    
    // Log the source of the business name for debugging
    if (cognitoName) {
      logger.info('[DashAppBar] Setting business name from data source:', { name: cognitoName, source: 'cognito' });
    } else if (userDataName) {
      logger.info('[DashAppBar] Setting business name from data source:', { name: userDataName, source: 'userData' });
    } else if (profileDataName) {
      logger.info('[DashAppBar] Setting business name from data source:', { name: profileDataName, source: 'profileData' });
    } else if (cachedName) {
      logger.info('[DashAppBar] Setting business name from data source:', { name: cachedName, source: 'cachedData' });
    } else {
      logger.warn('[DashAppBar] No business name found in any data source, using default');
    }`;
      
      dashAppBarContent = dashAppBarContent.replace(businessNameRegex, improvedBusinessNameHandling);
      
      fs.writeFileSync(dashAppBarPath, dashAppBarContent);
      log('✓ Fixed DashAppBar component with improved error handling');
    }

    // 4. Fix amplifyUnified.js for better auth stability
    const amplifyUnifiedPath = path.join(configDir, 'amplifyUnified.js');
    if (fs.existsSync(amplifyUnifiedPath)) {
      log('Improving Amplify unified configuration...');
      backupFile(amplifyUnifiedPath);
      
      let unifiedContent = fs.readFileSync(amplifyUnifiedPath, 'utf8');
      
      // Fix ensureConfigAndCall function to better handle retries
      const ensureConfigRegex = /const ensureConfigAndCall = async \(authFunction, ...args\) => \{[\s\S]*?let retries = 0;[\s\S]*?const maxRetries = 2;[\s\S]*?while \(retries <= maxRetries\) \{[\s\S]*?}\s*\};/;
      
      const improvedEnsureConfig = `const ensureConfigAndCall = async (authFunction, ...args) => {
  let retries = 0;
  const maxRetries = 3; // Increased from 2 to 3
  
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
      
      // Handle network errors with a longer retry
      if (error.name === 'NetworkError' || 
          (error.message && error.message.includes('network')) ||
          error.code === 'NETWORK_ERROR') {
        logger.warn(\`[AmplifyUnified] Network error, attempting retry (\${retries}/\${maxRetries})\`);
        
        // Wait longer for network errors
        if (retries <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
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
  }
};`;
      
      unifiedContent = unifiedContent.replace(ensureConfigRegex, improvedEnsureConfig);
      
      fs.writeFileSync(amplifyUnifiedPath, unifiedContent);
      log('✓ Improved Amplify unified configuration for better auth stability');
    }

    // 5. Create source map package.json update
    log('Creating source map configuration fix...');
    const sourceMapFixPath = path.join(rootDir, 'scripts', 'source_map_fix.js');
    
    const sourceMapFixContent = `/**
 * Source Map Fix Script
 * Issue ID: AUTH-FIX-2025-06-01
 * Version: v1.0
 * 
 * This script adds proper source map configuration to the Next.js build
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Root directory paths
const rootDir = path.resolve(__dirname, '..');
const nextConfigPath = path.join(rootDir, 'next.config.js');

// Backup function
function backupFile(filePath) {
  const backupPath = \`\${filePath}.backup-\${new Date().toISOString()}\`;
  fs.copyFileSync(filePath, backupPath);
  console.log(\`Created backup: \${backupPath}\`);
  return backupPath;
}

// Main function
function applySourceMapFix() {
  console.log('[SOURCE-MAP-FIX] Starting source map configuration fix...');
  
  if (fs.existsSync(nextConfigPath)) {
    backupFile(nextConfigPath);
    
    let configContent = fs.readFileSync(nextConfigPath, 'utf8');
    
    // Check if productionBrowserSourceMaps is already configured
    if (!configContent.includes('productionBrowserSourceMaps')) {
      // Find the module.exports section
      const moduleExportsMatch = configContent.match(/module\.exports\s*=\s*{[^}]*}/);
      
      if (moduleExportsMatch) {
        // Extract the existing config
        const existingConfig = moduleExportsMatch[0];
        
        // Replace with updated config that includes source maps
        const updatedConfig = existingConfig.replace(
          /module\.exports\s*=\s*{/, 
          'module.exports = {\n  productionBrowserSourceMaps: true,'
        );
        
        configContent = configContent.replace(existingConfig, updatedConfig);
      } else {
        // If no module.exports found, add one
        configContent += \`\n\nmodule.exports = {
  productionBrowserSourceMaps: true
};\n\`;
      }
      
      fs.writeFileSync(nextConfigPath, configContent);
      console.log('[SOURCE-MAP-FIX] ✓ Added source map configuration to next.config.js');
    } else {
      console.log('[SOURCE-MAP-FIX] Source maps already configured in next.config.js');
    }
  } else {
    console.log('[SOURCE-MAP-FIX] next.config.js not found, creating new file');
    
    const newConfigContent = \`/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
  swcMinify: true
};

module.exports = nextConfig;
\`;
    
    fs.writeFileSync(nextConfigPath, newConfigContent);
    console.log('[SOURCE-MAP-FIX] ✓ Created new next.config.js with source map configuration');
  }
}

// Run the fix
try {
  applySourceMapFix();
  console.log('[SOURCE-MAP-FIX] Source map fix completed successfully');
} catch (error) {
  console.error('[SOURCE-MAP-FIX] Error applying source map fix:', error);
}
`;
    
    fs.writeFileSync(sourceMapFixPath, sourceMapFixContent);
    log('✓ Created source map fix script');

    // 6. Update script registry
    const scriptRegistryPath = path.join(rootDir, 'scripts', 'script_registry.json');
    let registry = {};
    
    if (fs.existsSync(scriptRegistryPath)) {
      try {
        registry = JSON.parse(fs.readFileSync(scriptRegistryPath, 'utf8'));
      } catch (e) {
        log('Could not parse existing script registry, creating new one');
        registry = { scripts: [] };
      }
    } else {
      registry = { scripts: [] };
    }
    
    // Add our scripts to the registry
    registry.scripts.push({
      id: 'AUTH-FIX-2025-06-01',
      name: 'Auth and Session Management Fix',
      path: 'auth_session_fix.js',
      version: 'v1.0',
      execution_date: new Date().toISOString(),
      status: 'completed',
      description: 'Fixes authentication and session management issues'
    });
    
    registry.scripts.push({
      id: 'AUTH-FIX-2025-06-01-SM',
      name: 'Source Map Fix',
      path: 'source_map_fix.js',
      version: 'v1.0',
      execution_date: new Date().toISOString(),
      status: 'ready',
      description: 'Fixes source map configuration for better debugging'
    });
    
    fs.writeFileSync(scriptRegistryPath, JSON.stringify(registry, null, 2));
    log('✓ Updated script registry');

    log('All fixes applied successfully!');
    log('Run source map fix with: node scripts/source_map_fix.js');
    
    return {
      success: true,
      message: 'Auth and session management fixes applied successfully'
    };
  } catch (error) {
    log(`ERROR: ${error.message}`);
    console.error(error);
    
    return {
      success: false,
      message: `Failed to apply fixes: ${error.message}`,
      error
    };
  }
}

// Run the fixes if script is executed directly
if (require.main === module) {
  applyFixes()
    .then(result => {
      if (result.success) {
        console.log('\n✅ SUCCESS:', result.message);
        process.exit(0);
      } else {
        console.error('\n❌ ERROR:', result.message);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('\n❌ FATAL ERROR:', err);
      process.exit(1);
    });
} else {
  // Export for use as a module
  module.exports = { applyFixes };
} 