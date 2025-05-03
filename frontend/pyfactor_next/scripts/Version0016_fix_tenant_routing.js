/**
 * Version0016_fix_tenant_routing.js
 * 
 * Script to fix tenant dashboard routing issues
 * 
 * PROBLEM: Dashboard page at /tenant/[tenantId]/dashboard has 404 errors
 * 
 * SOLUTION: 
 * 1. Fix the routing by ensuring proper mapping between [tenantId] and tenant/[tenantId]
 * 2. Create a direct route file for /[tenantId]/dashboard that redirects to /tenant/[tenantId]/dashboard
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
      "scriptName": "Version0016_fix_tenant_routing.js",
      "executionDate": new Date().toISOString(),
      "description": "Fix tenant dashboard routing 404 issues",
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
 * Main function to fix tenant dashboard routing
 */
async function fixTenantRouting() {
  logger.info('Starting tenant dashboard routing fix...');
  const filesModified = [];
  
  try {
    // 1. Fix the root [tenantId]/page.js to properly redirect to tenant/[tenantId]/dashboard
    const tenantRootPath = path.join(CONFIG.frontendDir, 'src/app/[tenantId]/page.js');
    
    if (fs.existsSync(tenantRootPath)) {
      // Create backup before modifying
      createBackup(tenantRootPath);
      
      // Read the file content
      const tenantRootContent = fs.readFileSync(tenantRootPath, 'utf8');
      
      // Fix the routing in the file - changing 'router.push('/dashboard')' to 'router.push(`/tenant/${tenantId}/dashboard`)'
      const updatedTenantRoot = tenantRootContent.replace(
        'router.push(\'/dashboard\')',
        'router.push(`/tenant/${tenantId}/dashboard`)'
      );
      
      if (updatedTenantRoot !== tenantRootContent) {
        fs.writeFileSync(tenantRootPath, updatedTenantRoot, 'utf8');
        logger.success('Fixed [tenantId]/page.js redirect to properly point to tenant dashboard');
        filesModified.push(tenantRootPath);
      }
    }
    
    // 2. Create a direct redirect file at [tenantId]/dashboard/page.js to handle direct URL access
    const dashboardRedirectDir = path.join(CONFIG.frontendDir, 'src/app/[tenantId]/dashboard');
    if (!fs.existsSync(dashboardRedirectDir)) {
      fs.mkdirSync(dashboardRedirectDir, { recursive: true });
    }
    
    const dashboardRedirectPath = path.join(dashboardRedirectDir, 'page.js');
    
    // Create a redirect page in the [tenantId]/dashboard directory
    const dashboardRedirectContent = `'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import DashboardLoader from '@/components/DashboardLoader';

/**
 * Redirect handler for legacy [tenantId]/dashboard URL
 * This redirects to the new path: tenant/[tenantId]/dashboard
 */
export default function DashboardRedirect() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params?.tenantId;
  
  useEffect(() => {
    const handleRedirect = () => {
      if (!tenantId) {
        logger.error('[DashboardRedirect] No tenant ID in params');
        router.push('/');
        return;
      }
      
      logger.info('[DashboardRedirect] Redirecting to new dashboard path for tenant:', tenantId);
      
      // Redirect to the new dashboard path
      router.push(\`/tenant/\${tenantId}/dashboard\`);
    };
    
    // Small delay to ensure client-side routing is ready
    const timer = setTimeout(handleRedirect, 100);
    return () => clearTimeout(timer);
  }, [tenantId, router]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <DashboardLoader message="Redirecting to dashboard..." />
    </div>
  );
}
`;
    
    fs.writeFileSync(dashboardRedirectPath, dashboardRedirectContent, 'utf8');
    logger.success('Created redirect file at [tenantId]/dashboard/page.js');
    filesModified.push(dashboardRedirectPath);
    
    // 3. Create a layout file for [tenantId]/dashboard to ensure proper structure
    const dashboardLayoutPath = path.join(dashboardRedirectDir, 'layout.js');
    const dashboardLayoutContent = `'use client';

// Simple layout for the dashboard redirect
export default function DashboardRedirectLayout({ children }) {
  return children;
}
`;
    
    fs.writeFileSync(dashboardLayoutPath, dashboardLayoutContent, 'utf8');
    logger.success('Created layout file at [tenantId]/dashboard/layout.js');
    filesModified.push(dashboardLayoutPath);
    
    // Success!
    logger.success('Tenant dashboard routing fixes completed!');
    updateScriptRegistry(true, filesModified);
    
    return {
      success: true,
      message: 'Tenant dashboard routing fixed successfully',
      filesModified
    };
  } catch (error) {
    logger.error(`Error fixing tenant dashboard routing: ${error.message}`);
    updateScriptRegistry(false, filesModified);
    
    return {
      success: false,
      message: `Error: ${error.message}`,
      filesModified
    };
  }
}

// Execute the function
fixTenantRouting().then(result => {
  if (result.success) {
    logger.success(`${result.message}`);
    if (result.filesModified.length > 0) {
      logger.info(`Files created/modified: ${result.filesModified.join('\n - ')}`);
    }
  } else {
    logger.error(result.message);
  }
}); 