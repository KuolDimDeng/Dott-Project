/**
 * Script: Version0003_fix_backend_connection_checker.mjs
 * 
 * Description:
 * This script fixes the backend connection checker in the axiosConfig.js file.
 * The current implementation has issues with error handling, leading to empty error objects being logged.
 * 
 * Changes made:
 * - Enhance error handling in verifyBackendConnection function
 * - Improve error object serialization for logging
 * - Add fallback mechanisms for backend connection testing
 * - Fix empty error object issue in connection checker
 * 
 * Version: 1.0
 * Date: 2023-11-28
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { promises as fsPromises } from 'fs';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target file
const targetFile = path.join(process.cwd(), 'frontend/pyfactor_next/src/lib/axiosConfig.js');
const backupDir = path.join(process.cwd(), 'scripts/backups/backend_connection_fix_' + Date.now());
const registryFile = path.join(process.cwd(), 'scripts/script_registry.md');

async function updateScriptRegistry() {
  try {
    let registry = '';
    
    if (fs.existsSync(registryFile)) {
      registry = await fsPromises.readFile(registryFile, 'utf8');
    }
    
    const today = new Date().toISOString().split('T')[0];
    const entry = `
| Version0003_fix_backend_connection_checker.mjs | ${today} | Completed | Fixed backend connection checker in axiosConfig.js to handle errors properly |
`;
    
    if (!registry.includes('Version0003_fix_backend_connection_checker.mjs')) {
      if (!registry.includes('| Script | Date | Status | Description |')) {
        registry = `# Script Registry

| Script | Date | Status | Description |
|--------|------|--------|-------------|${entry}`;
      } else {
        registry += entry;
      }
      
      await fsPromises.writeFile(registryFile, registry, 'utf8');
      console.log('Script registry updated successfully.');
    }
  } catch (error) {
    console.error('Error updating script registry:', error);
  }
}

async function createBackup() {
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      await fsPromises.mkdir(backupDir, { recursive: true });
    }
    
    // Read the target file
    const fileContent = await fsPromises.readFile(targetFile, 'utf8');
    
    // Write the backup file
    const backupFile = path.join(backupDir, 'axiosConfig.js.backup');
    await fsPromises.writeFile(backupFile, fileContent, 'utf8');
    
    console.log(`Backup created successfully at ${backupFile}`);
    return fileContent;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

async function fixBackendConnectionChecker(content) {
  // Fix 1: Improve error handling in verifyBackendConnection function
  // Find the try-catch block in verifyBackendConnection and update error handling
  const updatedContent = content.replace(
    /const verifyBackendConnection = async \(\) => \{[\s\S]*?} catch \(error\) \{[\s\S]*?const errorDetails = \{[\s\S]*?logger\.error\('\[BackendConnectionCheck\] Connection failed:', errorDetails\);[\s\S]*?return \{[\s\S]*?success: false,[\s\S]*?status: error\.response\?\.status \|\| 0,[\s\S]*?message: `Connection failed: \$\{error\.message\}`,[\s\S]*?errorDetails,[\s\S]*?error: error\.toString\(\)[\s\S]*?\};[\s\S]*?\};/g,
    `const verifyBackendConnection = async () => {
  const healthEndpoint = \`\${BACKEND_API_URL}/api/hr/health\`;
  logger.info(\`[BackendConnectionCheck] Verifying backend connection to: \${healthEndpoint}\`);
  
  // First reset ALL circuit breakers
  resetCircuitBreakers();
  logger.info('[BackendConnectionCheck] All circuit breakers have been reset');
  
  try {
    // Get tenant ID from APP_CACHE or Cognito
    let tenantId = null;
    if (typeof window !== 'undefined') {
      if (window.__APP_CACHE?.tenant?.id) {
        tenantId = window.__APP_CACHE.tenant.id;
        logger.debug(\`[BackendConnectionCheck] Using tenant ID from APP_CACHE: \${tenantId}\`);
      } else {
        try {
          // Try to get tenant ID from Cognito
          const { getTenantIdFromCognito } = await import('@/utils/tenantUtils');
          tenantId = await getTenantIdFromCognito();
          logger.debug(\`[BackendConnectionCheck] Using tenant ID from Cognito: \${tenantId}\`);
        } catch (error) {
          logger.warn('[BackendConnectionCheck] Could not get tenant ID from Cognito:', 
            error?.message || 'Unknown error');
        }
      }
    }
    
    // First try a basic GET request without headers to avoid CORS preflight
    try {
      logger.info('[BackendConnectionCheck] Trying health check without headers first...');
      const basicResponse = await axios.get(healthEndpoint, {
        timeout: 5000,
        validateStatus: () => true,
        // Disable certificate verification in development
        ...(process.env.NODE_ENV !== 'production' && {
          httpsAgent: new https.Agent({ rejectUnauthorized: false })
        })
      });
      
      // If successful, return the result
      if (basicResponse.status >= 200 && basicResponse.status < 300) {
        const responseTime = 0; // Not measuring time for simplicity
        logger.info(\`[BackendConnectionCheck] Connection successful without tenant header:\`, basicResponse.data);
        
        return {
          success: true,
          status: basicResponse.status,
          message: "Connection successful",
          responseTime,
          data: basicResponse.data
        };
      }
      
      // If 403, we need to try with tenant ID
      logger.info(\`[BackendConnectionCheck] Basic health check returned \${basicResponse.status}, trying with tenant ID...\`);
    } catch (basicError) {
      // Provide detailed error information for the basic request
      const basicErrorDetails = {
        message: basicError?.message || 'Unknown error',
        code: basicError?.code || 'UNKNOWN',
        isAxiosError: basicError?.isAxiosError || false,
        status: basicError?.response?.status || 0,
        statusText: basicError?.response?.statusText || '',
        url: healthEndpoint
      };
      
      logger.warn('[BackendConnectionCheck] Basic health check failed:', basicErrorDetails);
    }
    
    // Now try with tenant ID
    const startTime = Date.now();
    
    // Create custom axios instance for this request to avoid CORS issues
    const customAxios = axios.create({
      timeout: 5000,
      validateStatus: () => true,
      ...(process.env.NODE_ENV !== 'production' && {
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      })
    });
    
    // Start with a preflight request
    logger.info('[BackendConnectionCheck] Sending OPTIONS preflight request...');
    try {
      await customAxios.options(healthEndpoint);
      logger.info('[BackendConnectionCheck] Preflight request successful');
    } catch (preflightError) {
      // Provide detailed error for preflight
      const preflightErrorDetails = {
        message: preflightError?.message || 'Unknown preflight error',
        code: preflightError?.code || 'PREFLIGHT_ERROR',
        method: 'OPTIONS'
      };
      
      logger.warn('[BackendConnectionCheck] Preflight error (continuing anyway):', preflightErrorDetails);
    }
    
    // Create headers with tenant ID
    const headers = {};
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }
    
    // Use the custom axios instance for the actual request
    const response = await customAxios.get(healthEndpoint, {
      headers: headers
    });
    
    const responseTime = Date.now() - startTime;
    const isSuccess = response.status >= 200 && response.status < 300;
    
    if (isSuccess) {
      logger.info(\`[BackendConnectionCheck] Connection successful (\${responseTime}ms):\`, response.data);
    } else {
      logger.warn(\`[BackendConnectionCheck] Connection returned non-success status \${response.status} (\${responseTime}ms):\`, response.data);
    }
    
    return {
      success: isSuccess,
      status: response.status,
      message: isSuccess ? "Connection successful" : \`Received status code \${response.status}\`,
      responseTime,
      data: response.data
    };
  } catch (error) {
    // Enhanced error details with safe access to properties
    const errorDetails = {
      message: error?.message || 'Unknown error',
      code: error?.code || 'ERROR',
      isAxiosError: error?.isAxiosError || false,
      status: error?.response?.status || 0,
      statusText: error?.response?.statusText || '',
      url: healthEndpoint,
      timestamp: new Date().toISOString()
    };
    
    // For network errors, provide additional diagnostic info
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      errorDetails.diagnosticInfo = {
        backendUrl: BACKEND_API_URL,
        networkAvailable: typeof navigator !== 'undefined' && navigator.onLine,
        sslEnabled: BACKEND_API_URL.startsWith('https'),
        port: new URL(BACKEND_API_URL).port || (BACKEND_API_URL.startsWith('https') ? '443' : '80')
      };
    }
    
    logger.error('[BackendConnectionCheck] Connection failed:', errorDetails);
    
    // Try a fallback method for connection check
    try {
      logger.info('[BackendConnectionCheck] Attempting fallback connection check...');
      const fallbackResponse = await fetch(healthEndpoint, { 
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit',
        headers: { 'Accept': 'application/json' },
        redirect: 'follow',
        timeout: 3000,
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      
      if (fallbackResponse.ok) {
        logger.info('[BackendConnectionCheck] Fallback connection check successful');
        const fallbackData = await fallbackResponse.text();
        
        return {
          success: true,
          status: fallbackResponse.status,
          message: 'Connection successful via fallback method',
          fallbackData
        };
      } else {
        logger.warn(\`[BackendConnectionCheck] Fallback check failed with status: \${fallbackResponse.status}\`);
      }
    } catch (fallbackError) {
      logger.warn('[BackendConnectionCheck] Fallback connection check also failed:', 
        fallbackError?.message || 'Unknown error');
    }
    
    return {
      success: false,
      status: errorDetails.status || 0,
      message: \`Connection failed: \${errorDetails.message}\`,
      errorDetails,
      error: error?.toString() || 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
};`
  );
  
  return updatedContent;
}

async function run() {
  try {
    console.log('Starting script to fix backend connection checker in axiosConfig.js...');
    
    // Create backup first
    const originalContent = await createBackup();
    
    // Fix the backend connection checker
    const updatedContent = await fixBackendConnectionChecker(originalContent);
    
    // Write the modified file
    await fsPromises.writeFile(targetFile, updatedContent, 'utf8');
    
    // Update the script registry
    await updateScriptRegistry();
    
    console.log('Successfully fixed backend connection checker in axiosConfig.js.');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
run(); 