/**
 * Version0015_create_tenant_test_page.js
 * 
 * Script to create a simple test page for the tenant dashboard
 * 
 * PROBLEM: Dashboard page routes give 404 errors when accessed directly
 * 
 * SOLUTION: Create a client-side test page to help diagnose and fix tenant dashboard routes
 */

import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  baseDir: '/Users/kuoldeng/projectx',
  frontendDir: '/Users/kuoldeng/projectx/frontend/pyfactor_next',
  scriptRegistryPath: '/Users/kuoldeng/projectx/scripts/script_registry.json'
};

// Logger utility
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
  warn: (message) => console.log(`[WARNING] ${message}`)
};

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
      "scriptName": "Version0015_create_tenant_test_page.js",
      "executionDate": new Date().toISOString(),
      "description": "Create a test page to diagnose tenant dashboard routing",
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
 * Main function to create a tenant dashboard test page
 */
async function createTenantTestPage() {
  logger.info('Creating tenant dashboard test page...');
  const filesModified = [];
  
  try {
    // Create a direct test page in the app directory
    const tenantTestPagePath = path.join(CONFIG.frontendDir, 'src/app/tenant-test/page.js');
    
    // Create directory if it doesn't exist
    const tenantTestDir = path.dirname(tenantTestPagePath);
    if (!fs.existsSync(tenantTestDir)) {
      fs.mkdirSync(tenantTestDir, { recursive: true });
    }
    
    // Create tenant test page content
    const tenantTestPage = `'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Tenant Dashboard Test Page
 * 
 * This is a diagnostic page to help test tenant dashboard functionality
 */
export default function TenantTest() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState('');
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savedTenants, setSavedTenants] = useState([]);
  
  // Check for saved tenant IDs on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check localStorage
      try {
        const storedTenantId = localStorage.getItem('tenantId');
        const storedBusinessId = localStorage.getItem('businessid');
        
        // Check cookies
        const getCookie = (name) => {
          const value = \`; \${document.cookie}\`;
          const parts = value.split(\`; \${name}=\`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        };
        
        const cookieTenantId = getCookie('tenant_id');
        const cookieBusinessId = getCookie('businessid');
        
        // Get window.__APP_CACHE if available
        const appCacheTenantId = window.__APP_CACHE?.tenantId;
        const appCacheBusinessId = window.__APP_CACHE?.businessid;
        
        // Collect all possible tenant IDs
        const tenants = [
          { source: 'localStorage:tenantId', value: storedTenantId },
          { source: 'localStorage:businessid', value: storedBusinessId },
          { source: 'cookie:tenant_id', value: cookieTenantId },
          { source: 'cookie:businessid', value: cookieBusinessId },
          { source: 'AppCache:tenantId', value: appCacheTenantId },
          { source: 'AppCache:businessid', value: appCacheBusinessId }
        ].filter(item => item.value);
        
        setSavedTenants(tenants);
        
        // Set first found tenant ID as default
        if (tenants.length > 0 && !tenantId) {
          setTenantId(tenants[0].value);
        }
      } catch (error) {
        console.error('Error checking stored tenant IDs:', error);
      }
    }
  }, [tenantId]);
  
  // Test routing to tenant dashboard
  const testTenantDashboard = async (tid) => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      const targetTenantId = tid || tenantId;
      if (!targetTenantId) {
        setTestResults(prev => [...prev, 
          { type: 'error', message: 'Please enter a tenant ID' }
        ]);
        setIsLoading(false);
        return;
      }
      
      // Test if the app route exists
      const testAppRoute = async () => {
        try {
          const response = await fetch(\`/tenant/\${targetTenantId}/dashboard\`, {
            method: 'HEAD'
          });
          
          setTestResults(prev => [...prev, {
            type: response.ok ? 'success' : 'error',
            message: \`Tenant dashboard route test: \${response.status} \${response.statusText}\`
          }]);
          
          return response.ok;
        } catch (error) {
          setTestResults(prev => [...prev, {
            type: 'error',
            message: \`Tenant dashboard route error: \${error.message}\`
          }]);
          return false;
        }
      };
      
      // Test local storage
      const testLocalStorage = () => {
        try {
          localStorage.setItem('tenantId', targetTenantId);
          localStorage.setItem('businessid', targetTenantId);
          
          setTestResults(prev => [...prev, {
            type: 'success',
            message: 'Set tenant ID in localStorage'
          }]);
          return true;
        } catch (error) {
          setTestResults(prev => [...prev, {
            type: 'error',
            message: \`LocalStorage error: \${error.message}\`
          }]);
          return false;
        }
      };
      
      // Test cookies
      const testCookies = () => {
        try {
          document.cookie = \`tenant_id=\${targetTenantId}; path=/; max-age=86400\`;
          document.cookie = \`businessid=\${targetTenantId}; path=/; max-age=86400\`;
          
          setTestResults(prev => [...prev, {
            type: 'success',
            message: 'Set tenant ID in cookies'
          }]);
          return true;
        } catch (error) {
          setTestResults(prev => [...prev, {
            type: 'error',
            message: \`Cookie error: \${error.message}\`
          }]);
          return false;
        }
      };
      
      // Run tests
      await testAppRoute();
      testLocalStorage();
      testCookies();
      
      setTestResults(prev => [...prev, {
        type: 'info',
        message: 'All tests completed'
      }]);
    } catch (error) {
      setTestResults(prev => [...prev, {
        type: 'error',
        message: \`Test error: \${error.message}\`
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">Tenant Dashboard Test Page</h1>
        
        <div className="bg-blue-50 p-4 rounded-md mb-6">
          <p className="text-blue-800">
            This page helps diagnose tenant dashboard routing issues. 
            You can use it to test different tenant IDs and see if the dashboard route works.
          </p>
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-700 mb-2">Detected Tenant IDs</h2>
          {savedTenants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {savedTenants.map((tenant, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between bg-gray-50 p-2 rounded border"
                >
                  <div>
                    <span className="text-sm text-gray-500">{tenant.source}:</span>
                    <span className="ml-1 font-mono text-sm">{tenant.value}</span>
                  </div>
                  <button
                    onClick={() => testTenantDashboard(tenant.value)}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                  >
                    Test
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No tenant IDs detected in storage</p>
          )}
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-700 mb-2">Manual Test</h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="Enter tenant ID to test"
              className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => testTenantDashboard()}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Testing...' : 'Test Dashboard'}
            </button>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-700 mb-2">Quick Links</h2>
          <div className="flex flex-wrap gap-2">
            {tenantId && (
              <>
                <Link 
                  href={\`/tenant/\${tenantId}\`}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm"
                >
                  Tenant Home
                </Link>
                <Link 
                  href={\`/tenant/\${tenantId}/dashboard\`}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm"
                >
                  Tenant Dashboard
                </Link>
              </>
            )}
            <Link 
              href="/"
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm"
            >
              Site Root
            </Link>
            <Link 
              href="/dashboard-test.html"
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm"
            >
              Static Test Page
            </Link>
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-medium text-gray-700 mb-2">Test Results</h2>
          {testResults.length > 0 ? (
            <div className="border rounded overflow-hidden">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={\`p-2 \${
                    result.type === 'success' ? 'bg-green-50 text-green-800' : 
                    result.type === 'error' ? 'bg-red-50 text-red-800' : 
                    'bg-blue-50 text-blue-800'
                  } \${index !== 0 ? 'border-t' : ''}\`}
                >
                  {result.message}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No tests run yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
`;
    
    fs.writeFileSync(tenantTestPagePath, tenantTestPage, 'utf8');
    logger.success('Created tenant test page at: /tenant-test');
    filesModified.push(tenantTestPagePath);
    
    // Success!
    updateScriptRegistry(true, filesModified);
    
    return {
      success: true,
      message: 'Tenant test page created successfully',
      filesModified
    };
  } catch (error) {
    logger.error(`Error creating tenant test page: ${error.message}`);
    updateScriptRegistry(false, filesModified);
    
    return {
      success: false,
      message: `Error: ${error.message}`,
      filesModified
    };
  }
}

// Execute the function
createTenantTestPage().then(result => {
  if (result.success) {
    logger.success(`${result.message}`);
    if (result.filesModified.length > 0) {
      logger.info(`Files created/modified: ${result.filesModified.join('\n - ')}`);
    }
  } else {
    logger.error(result.message);
  }
}); 