/**
 * Version0019_fix_root_route_and_api_proxy.js
 * 
 * Script to fix the root route 404 issue and correct API proxy configuration
 * 
 * PROBLEM: 
 * 1. Root route (/) returns 404 because there's no index page
 * 2. API proxy configuration still trying to use localhost instead of 127.0.0.1
 * 
 * SOLUTION: 
 * 1. Create a basic index page for the root route
 * 2. Update rewrites in next.config.js to correctly proxy API requests
 */

import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  backupDir: '/Users/kuoldeng/projectx/scripts/backups',
  baseDir: '/Users/kuoldeng/projectx',
  frontendDir: '/Users/kuoldeng/projectx/frontend/pyfactor_next',
  scriptRegistryPath: '/Users/kuoldeng/projectx/scripts/script_registry.json'
};

// Create backup directory if it doesn't exist
if (!fs.existsSync(CONFIG.backupDir)) {
  fs.mkdirSync(CONFIG.backupDir, { recursive: true });
}

// Logger utility
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
  warn: (message) => console.log(`[WARNING] ${message}`)
};

/**
 * Creates a backup of a target file
 */
function createBackup(filePath) {
  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = path.join(CONFIG.backupDir, `${fileName}.backup-${timestamp}`);
  
  try {
    fs.copyFileSync(filePath, backupPath);
    logger.info(`Backup created at: ${backupPath}`);
    return backupPath;
  } catch (error) {
    logger.error(`Failed to create backup: ${error.message}`);
    throw error;
  }
}

/**
 * Updates the script registry
 */
function updateScriptRegistry(status, filesModified) {
  try {
    let registry = [];
    
    // Create registry file if it doesn't exist or read existing registry
    if (fs.existsSync(CONFIG.scriptRegistryPath)) {
      const registryContent = fs.readFileSync(CONFIG.scriptRegistryPath, 'utf8');
      registry = JSON.parse(registryContent);
    }
    
    // Format entry to match existing registry
    const newEntry = {
      "scriptName": "Version0019_fix_root_route_and_api_proxy.js",
      "executionDate": new Date().toISOString(),
      "description": "Fix root route 404 issue and API proxy configuration",
      "status": status ? "SUCCESS" : "FAILED",
      "filesModified": filesModified
    };
    
    // Add new entry to registry
    registry.push(newEntry);
    
    fs.writeFileSync(
      CONFIG.scriptRegistryPath, 
      JSON.stringify(registry, null, 2), 
      'utf8'
    );
    
    logger.info('Script registry updated');
  } catch (error) {
    logger.error(`Failed to update script registry: ${error.message}`);
  }
}

/**
 * Main function to fix root route and API proxy
 */
async function fixRootRouteAndApiProxy() {
  logger.info('Starting root route and API proxy fix...');
  const filesModified = [];
  
  try {
    // 1. Create a basic index page at the root level
    const srcAppDir = path.join(CONFIG.frontendDir, 'src', 'app');
    const indexPagePath = path.join(srcAppDir, 'page.js');
    
    // Check if the file already exists
    if (!fs.existsSync(indexPagePath)) {
      // Create a simple index page that redirects to login or dashboard
      const indexPageContent = `/**
 * Root index page - provides redirection to login or dashboard based on auth state
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Auth } from 'aws-amplify';

// Components
import Loading from '@/components/Loading';

/**
 * Root page component that redirects based on authentication status
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndRedirect() {
      try {
        // Check if user is authenticated
        const user = await Auth.currentAuthenticatedUser();
        
        if (user) {
          // Get tenant ID from user attributes if available
          let tenantId = null;
          try {
            const userAttributes = await Auth.currentUserInfo();
            tenantId = userAttributes?.attributes?.['custom:tenant_id'];
          } catch (err) {
            console.error('Error fetching user attributes:', err);
          }
          
          // Redirect to dashboard if tenant ID is available
          if (tenantId) {
            router.push(\`/tenant/\${tenantId}/dashboard\`);
          } else {
            // Redirect to general dashboard if no tenant ID
            router.push('/dashboard');
          }
        } else {
          // Redirect to login if not authenticated
          router.push('/auth/signin');
        }
      } catch (error) {
        // User is not authenticated, redirect to sign in
        router.push('/auth/signin');
      }
    }

    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Loading />
      <p className="mt-4 text-lg text-gray-600">Redirecting...</p>
    </div>
  );
}`;

      // Create directory if it doesn't exist
      fs.mkdirSync(srcAppDir, { recursive: true });
      
      // Write the index page
      fs.writeFileSync(indexPagePath, indexPageContent, 'utf8');
      logger.success('Created root index page at: ' + indexPagePath);
      filesModified.push(indexPagePath);
    } else {
      logger.info('Index page already exists, skipping creation');
    }

    // 2. Update next.config.js to fix API proxy configuration
    const nextConfigPath = path.join(CONFIG.frontendDir, 'next.config.js');
    
    if (fs.existsSync(nextConfigPath)) {
      // Create backup
      createBackup(nextConfigPath);
      
      // Read the file content
      let nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');
      
      // Make sure any remaining localhost:8000 references are updated to 127.0.0.1:8000
      if (nextConfigContent.includes('localhost:8000')) {
        nextConfigContent = nextConfigContent.replace(/localhost:8000/g, '127.0.0.1:8000');
        logger.success('Updated API proxy URL from localhost:8000 to 127.0.0.1:8000');
      }
      
      // Update the rewrites section to ensure it's properly configured
      // Look for the rewrites function
      if (nextConfigContent.includes('async rewrites()')) {
        // Extract the rewrites function to check if it's correctly configured
        const rewritesMatch = nextConfigContent.match(/async rewrites\(\)\s*{[\s\S]*?return \[([\s\S]*?)\][\s\S]*?}/);
        
        if (rewritesMatch) {
          const rewritesContent = rewritesMatch[1];
          
          // Check if the rewrites includes the correct API path
          if (!rewritesContent.includes('/api/:path*')) {
            // Replace the existing rewrites with the corrected version
            const correctedRewrites = `async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://127.0.0.1:8000/api/:path*',
      },
    ];
  }`;
            
            nextConfigContent = nextConfigContent.replace(/async rewrites\(\)\s*{[\s\S]*?return \[([\s\S]*?)\][\s\S]*?}/, correctedRewrites);
            logger.success('Updated rewrites configuration in next.config.js');
          } else if (rewritesContent.includes('localhost:8000')) {
            // If the correct path exists but uses localhost, update to 127.0.0.1
            nextConfigContent = nextConfigContent.replace(/localhost:8000/g, '127.0.0.1:8000');
            logger.success('Updated API destination in rewrites from localhost:8000 to 127.0.0.1:8000');
          }
        } else {
          // If the rewrites function exists but isn't properly structured, fix it
          const rewritesFunctionMatch = nextConfigContent.match(/async rewrites\(\)\s*{[\s\S]*?}/);
          if (rewritesFunctionMatch) {
            const correctedRewrites = `async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://127.0.0.1:8000/api/:path*',
      },
    ];
  }`;
            
            nextConfigContent = nextConfigContent.replace(/async rewrites\(\)\s*{[\s\S]*?}/, correctedRewrites);
            logger.success('Fixed malformed rewrites function in next.config.js');
          }
        }
      } else {
        // If rewrites function doesn't exist, add it
        const moduleExportsMatch = nextConfigContent.match(/module\.exports\s*=\s*(?:withTM\()?(nextConfig)/);
        
        if (moduleExportsMatch) {
          // Add the rewrites function before the module.exports
          const rewritesFunction = `\n// API proxying configuration
nextConfig.rewrites = async () => {
  return [
    {
      source: '/api/:path*',
      destination: 'https://127.0.0.1:8000/api/:path*',
    },
  ];
};\n\n`;
          
          nextConfigContent = nextConfigContent.replace(/module\.exports\s*=/, rewritesFunction + 'module.exports =');
          logger.success('Added rewrites function to next.config.js');
        }
      }
      
      // Write the updated config back to the file
      fs.writeFileSync(nextConfigPath, nextConfigContent, 'utf8');
      logger.success('Updated next.config.js with correct API proxy configuration');
      filesModified.push(nextConfigPath);
    } else {
      logger.error('next.config.js not found');
      return {
        success: false,
        message: 'next.config.js not found',
        filesModified
      };
    }
    
    // Success!
    logger.success('Root route and API proxy fixes completed!');
    updateScriptRegistry(true, filesModified);
    
    return {
      success: true,
      message: 'Root route and API proxy configuration fixed',
      filesModified
    };
  } catch (error) {
    logger.error(`Error fixing root route and API proxy: ${error.message}`);
    updateScriptRegistry(false, filesModified);
    
    return {
      success: false,
      message: `Error: ${error.message}`,
      filesModified
    };
  }
}

// Execute the function
fixRootRouteAndApiProxy().then(result => {
  if (result.success) {
    logger.success(`${result.message}`);
    if (result.filesModified.length > 0) {
      logger.info(`Files modified: ${result.filesModified.join(', ')}`);
    }
  } else {
    logger.error(result.message);
  }
}); 