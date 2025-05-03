/**
 * Version0014_fix_dashboard_routes.js
 * 
 * Script to diagnose and fix dashboard routing and loading issues
 * 
 * PROBLEM: After fixing the user initials issue, there are still 404 errors 
 * when trying to access the dashboard at /tenant/[tenantId]/dashboard
 * 
 * SOLUTION: Create a diagnostic script to check and fix any routing issues
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
      "scriptName": "Version0014_fix_dashboard_routes.js",
      "executionDate": new Date().toISOString(),
      "description": "Fix dashboard routing and 404 issues",
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
 * Main function to diagnose and fix routing issues
 */
async function diagnoseDashboardRoutes() {
  logger.info('Starting diagnosis of dashboard routing issues...');
  const filesModified = [];
  
  try {
    // 1. Check the dashboard route files exist and are correctly structured
    const routePaths = [
      { 
        path: path.join(CONFIG.frontendDir, 'src/app/tenant/[tenantId]/dashboard/page.js'),
        name: 'Tenant Dashboard Page'
      },
      { 
        path: path.join(CONFIG.frontendDir, 'src/app/tenant/[tenantId]/dashboard/layout.js'),
        name: 'Tenant Dashboard Layout'
      },
      { 
        path: path.join(CONFIG.frontendDir, 'src/components/Dashboard/DashboardContent.js'),
        name: 'Dashboard Content Component'
      }
    ];
    
    // Check each route file
    for (const route of routePaths) {
      if (!fs.existsSync(route.path)) {
        logger.error(`Missing route file: ${route.path}`);
        return {
          success: false,
          message: `Missing required file: ${route.name}`
        };
      }
      
      logger.info(`Found route file: ${route.name}`);
    }
    
    // 2. Check if we have DashAppBar import working correctly
    const dashboardContentPath = path.join(CONFIG.frontendDir, 'src/components/Dashboard/DashboardContent.js');
    const dashboardContent = fs.readFileSync(dashboardContentPath, 'utf8');
    
    // Check for correct DashAppBar import
    if (!dashboardContent.includes('DashAppBar from \'../../app/dashboard/components/DashAppBar')) {
      logger.warn('Potential issue with DashAppBar import path in DashboardContent.js');
      
      // Create backup
      createBackup(dashboardContentPath);
      
      // Fix the import path if needed
      const updatedContent = dashboardContent.replace(
        /import\s+DashAppBar\s+from\s+['"](.+?)['"]/,
        'import DashAppBar from \'../../app/dashboard/components/DashAppBar\''
      );
      
      if (updatedContent !== dashboardContent) {
        fs.writeFileSync(dashboardContentPath, updatedContent, 'utf8');
        logger.success('Fixed DashAppBar import in DashboardContent.js');
        filesModified.push(dashboardContentPath);
      }
    }
    
    // 3. Check if the _document.js file exists and is valid (needed for HTML structure)
    const documentPath = path.join(CONFIG.frontendDir, 'src/app/_document.js');
    if (!fs.existsSync(documentPath)) {
      logger.warn('Missing _document.js file in app directory, which might cause rendering issues');
    }
    
    // 4. Make sure DashboardContent is properly exported and imported
    const dashContentApp = path.join(CONFIG.frontendDir, 'src/app/dashboard/DashboardContent.js');
    if (fs.existsSync(dashContentApp)) {
      const dashContentAppContent = fs.readFileSync(dashContentApp, 'utf8');
      if (!dashContentAppContent.includes('export { default } from \'@/components/Dashboard/DashboardContent\'')) {
        logger.warn('Potential issue with DashboardContent export in app/dashboard/DashboardContent.js');
        
        // Create backup
        createBackup(dashContentApp);
        
        // Ensure proper export
        const updatedExport = `/**
 * DEPRECATED: REDIRECTOR FILE
 * 
 * IMPORTANT: This file is a redirect to the primary DashboardContent file.
 * The primary file is located at:
 * - /src/components/Dashboard/DashboardContent.js
 * 
 * Please use the primary file for all development and imports.
 * This file exists only to maintain backward compatibility with existing imports.
 */

'use client';

// Re-export the primary DashboardContent component
export { default } from '@/components/Dashboard/DashboardContent';
export * from '@/components/Dashboard/DashboardContent';
`;
        
        fs.writeFileSync(dashContentApp, updatedExport, 'utf8');
        logger.success('Fixed DashboardContent export in app/dashboard/DashboardContent.js');
        filesModified.push(dashContentApp);
      }
    }
    
    // 5. Check the layout.js file at the app level
    const appLayoutPath = path.join(CONFIG.frontendDir, 'src/app/layout.js');
    if (fs.existsSync(appLayoutPath)) {
      const appLayoutContent = fs.readFileSync(appLayoutPath, 'utf8');
      
      // Check for any route redirection issues
      if (appLayoutContent.includes('return redirect(')) {
        logger.warn('Found redirection logic in app/layout.js that could be causing issues');
        
        // Create backup
        createBackup(appLayoutPath);
        
        // Fix any overly aggressive redirections
        let updatedLayout = appLayoutContent;
        
        // Only redirect on root route, not on all routes
        if (appLayoutContent.includes('if (tenantId && !isTenantPath)')) {
          updatedLayout = updatedLayout.replace(
            'if (tenantId && !isTenantPath)',
            'if (tenantId && !isTenantPath && pathname === \'\')'
          );
        }
        
        if (updatedLayout !== appLayoutContent) {
          fs.writeFileSync(appLayoutPath, updatedLayout, 'utf8');
          logger.success('Updated redirection logic in app/layout.js to be more specific');
          filesModified.push(appLayoutPath);
        }
      }
    }
    
    // 6. Ensure the AuthInitializer component is present and working
    const authInitializerPath = path.join(CONFIG.frontendDir, 'src/components/AuthInitializer.js');
    if (!fs.existsSync(authInitializerPath)) {
      logger.warn('Missing AuthInitializer component which might be causing authentication issues');
    }
    
    // 7. Check that tenant/[tenantId]/dashboard/page.js imports DashboardContent correctly
    const tenantDashboardPath = path.join(CONFIG.frontendDir, 'src/app/tenant/[tenantId]/dashboard/page.js');
    const tenantDashboardContent = fs.readFileSync(tenantDashboardPath, 'utf8');
    
    // Make sure it's importing the correct DashboardContent
    if (!tenantDashboardContent.includes('import DashboardContent from \'@/app/dashboard/DashboardContent\'') &&
        !tenantDashboardContent.includes('import DashboardContent from \'@/components/Dashboard/DashboardContent\'')) {
      logger.warn('Potential issue with DashboardContent import in tenant dashboard page');
      
      // Create backup
      createBackup(tenantDashboardPath);
      
      // Fix the import if needed
      const updatedTenantDashboard = tenantDashboardContent.replace(
        /import\s+DashboardContent\s+from\s+['"](.+?)['"]/,
        'import DashboardContent from \'@/app/dashboard/DashboardContent\''
      );
      
      if (updatedTenantDashboard !== tenantDashboardContent) {
        fs.writeFileSync(tenantDashboardPath, updatedTenantDashboard, 'utf8');
        logger.success('Fixed DashboardContent import in tenant dashboard page');
        filesModified.push(tenantDashboardPath);
      }
    }
    
    // 8. Create a simple test HTML file to check if the server is running properly
    const testHtmlPath = path.join(CONFIG.frontendDir, 'public/dashboard-test.html');
    const testHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Route Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #333;
        }
        .success {
            color: green;
            font-weight: bold;
        }
        .error {
            color: red;
            font-weight: bold;
        }
        pre {
            background: #f4f4f4;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
        button {
            padding: 8px 16px;
            background: #0070f3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        }
        button:hover {
            background: #0051a8;
        }
    </style>
</head>
<body>
    <h1>Dashboard Route Test Page</h1>
    <p>This page helps diagnose routing issues with the tenant dashboard.</p>
    
    <div id="results">
        <h2>Test Results:</h2>
        <div id="test-results">
            <p>Click the buttons below to test routes.</p>
        </div>
    </div>
    
    <h2>Available Routes Tests:</h2>
    <div>
        <button onclick="testStaticFiles()">Test Static Files</button>
        <button onclick="testTenantRedirect()">Test Tenant Redirect</button>
        <button onclick="testHomeEndpoint()">Test Home Endpoint</button>
    </div>
    
    <h2>Debugging Info:</h2>
    <pre id="debug-info">
User Agent: <script>document.write(navigator.userAgent)</script>
URL: <script>document.write(window.location.href)</script>
App Version: Next.js 15.3.1
    </pre>
    
    <script>
        // Initialize test results
        const results = document.getElementById('test-results');
        
        // Test basic static file serving
        async function testStaticFiles() {
            try {
                const response = await fetch('/dashboard-test.html');
                if (response.ok) {
                    results.innerHTML += '<p class="success">✅ Static files test passed</p>';
                } else {
                    results.innerHTML += '<p class="error">❌ Static files test failed</p>';
                }
            } catch (error) {
                results.innerHTML += '<p class="error">❌ Static files test error: ' + error.message + '</p>';
            }
        }
        
        // Test tenant redirect logic
        async function testTenantRedirect() {
            try {
                // Save some fake tenant data
                localStorage.setItem('tenantId', 'test-tenant-id');
                
                // Try to access root
                const startTime = performance.now();
                const response = await fetch('/', {
                    method: 'HEAD',
                    redirect: 'manual'
                });
                const endTime = performance.now();
                
                results.innerHTML += '<p>Response status: ' + response.status + '</p>';
                results.innerHTML += '<p>Response time: ' + (endTime - startTime).toFixed(2) + 'ms</p>';
                
                // Check if there was a redirect
                if (response.redirected) {
                    results.innerHTML += '<p class="success">✅ Tenant redirect test passed</p>';
                } else {
                    results.innerHTML += '<p class="error">❌ No redirect detected</p>';
                }
                
                // Clean up
                localStorage.removeItem('tenantId');
            } catch (error) {
                results.innerHTML += '<p class="error">❌ Tenant redirect test error: ' + error.message + '</p>';
            }
        }
        
        // Test home endpoint
        async function testHomeEndpoint() {
            try {
                const response = await fetch('/', {
                    method: 'GET'
                });
                
                if (response.ok) {
                    results.innerHTML += '<p class="success">✅ Home endpoint accessible</p>';
                } else {
                    results.innerHTML += '<p class="error">❌ Home endpoint error: ' + response.status + '</p>';
                }
            } catch (error) {
                results.innerHTML += '<p class="error">❌ Home endpoint test error: ' + error.message + '</p>';
            }
        }
    </script>
</body>
</html>
`;
    fs.writeFileSync(testHtmlPath, testHtml, 'utf8');
    logger.success('Created dashboard test HTML file to help diagnose routing issues');
    filesModified.push(testHtmlPath);
    
    // Success!
    logger.success('Dashboard routes diagnosis completed!');
    logger.success(`Files modified: ${filesModified.length > 0 ? filesModified.join(', ') : 'None'}`);
    updateScriptRegistry(true, filesModified);
    
    return {
      success: true,
      message: 'Dashboard routes diagnosis completed',
      filesModified
    };
  } catch (error) {
    logger.error(`Error during dashboard routes diagnosis: ${error.message}`);
    updateScriptRegistry(false, filesModified);
    
    return {
      success: false,
      message: `Error: ${error.message}`,
      filesModified
    };
  }
}

// Execute the function
diagnoseDashboardRoutes().then(result => {
  if (result.success) {
    logger.success(`Diagnosis complete: ${result.message}`);
    if (result.filesModified.length > 0) {
      logger.info(`Files modified: ${result.filesModified.join('\n - ')}`);
    }
  } else {
    logger.error(result.message);
  }
}); 