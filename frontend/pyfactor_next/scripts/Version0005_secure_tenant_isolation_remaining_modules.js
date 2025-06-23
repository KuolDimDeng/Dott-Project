#!/usr/bin/env node

/**
 * Script: Version0005_secure_tenant_isolation_remaining_modules.js
 * Purpose: Update Payroll, Taxes, Reports, and Analytics modules to follow secure tenant isolation pattern
 * - Remove tenant ID from axios interceptors
 * - Remove getSecureTenantId usage from remaining components
 * - Update API routes to not extract tenant IDs
 * Created: 2025-01-23
 */

const fs = require('fs').promises;
const path = require('path');

// Additional components to update
const componentsToUpdate = [
  // Taxes Components
  'src/app/dashboard/components/forms/TaxManagement.js',
  'src/app/dashboard/components/forms/taxes/EmployeeTaxManagement.js',
  'src/app/dashboard/components/forms/TaxesDashboard.js',
  
  // Reports Components (some may have been updated already)
  'src/app/dashboard/components/forms/ReportsDashboard.js',
  
  // Analytics Components
  'src/app/dashboard/components/forms/AnalyticsDashboard.js',
  
  // Payroll Components
  'src/app/dashboard/components/forms/PayrollDashboard.js',
];

// Service files that need updating
const serviceFilesToUpdate = [
  'src/services/api/payroll.js',
  'src/services/api/taxes.js',
  'src/services/api/reports.js',
  'src/services/api/analytics.js',
];

// API Routes that need updating
const apiRoutesToUpdate = [
  'src/app/api/payroll/run/route.js',
  'src/app/api/payroll/reports/route.js',
  'src/app/api/payroll/export-report/route.js',
  'src/app/api/payroll/settings/route.js',
  'src/app/api/taxes/forms/route.js',
  'src/app/api/taxes/forms/[id]/route.js',
  'src/app/api/taxes/forms/[id]/download/route.js',
  'src/app/api/taxes/forms/employee/[id]/route.js',
];

// The most important file - axiosConfig.js
const axiosConfigFile = 'src/lib/axiosConfig.js';

// Patterns to remove from components
const componentPatterns = [
  // Remove getSecureTenantId imports
  {
    pattern: /import\s*{\s*[^}]*getSecureTenantId[^}]*}\s*from\s*['"][@/]utils\/tenantUtils['"];?\s*\n?/g,
    replacement: ''
  },
  // Remove getSecureTenantId calls
  {
    pattern: /const\s+tenantId\s*=\s*await\s+getSecureTenantId\(\);?\s*\n?/g,
    replacement: ''
  },
  // Remove getCacheValue for tenantId
  {
    pattern: /const\s+tenantId\s*=\s*(?:await\s+)?getCacheValue\(['"]tenantId['"]\);?\s*\n?/g,
    replacement: ''
  },
  // Remove tenant ID from API calls
  {
    pattern: /[?&]tenantId=\$\{tenantId\}/g,
    replacement: ''
  },
  {
    pattern: /[?&]tenant_id=\$\{tenantId\}/g,
    replacement: ''
  },
];

// Patterns for service files
const servicePatterns = [
  // Remove getSecureTenantId import
  {
    pattern: /import\s*{\s*getSecureTenantId\s*}\s*from\s*['"][@/]utils\/tenantUtils['"];?\s*\n?/g,
    replacement: ''
  },
  // Remove getSecureTenantId from interceptor
  {
    pattern: /const\s+tenantId\s*=\s*await\s+getSecureTenantId\(\);?\s*\n?/g,
    replacement: ''
  },
  // Remove tenant ID headers
  {
    pattern: /config\.headers\['X-Tenant-ID'\]\s*=\s*tenantId;?\s*\n?/g,
    replacement: ''
  },
  // Remove tenant ID from params
  {
    pattern: /config\.params\.tenantId\s*=\s*tenantId;?\s*\n?/g,
    replacement: ''
  },
];

// Patterns for API routes
const apiRoutePatterns = [
  // Remove getTenantId import
  {
    pattern: /import\s*{\s*getTenantId\s*}\s*from\s*['"][@/]utils\/tenantUtils['"];?\s*\n?/g,
    replacement: ''
  },
  // Remove tenant ID extraction
  {
    pattern: /const\s+tenantId\s*=\s*getTenantId\(request\);?\s*\n?/g,
    replacement: ''
  },
  // Remove tenant ID from user object access
  {
    pattern: /const\s+tenantId\s*=\s*user\.tenantId;?\s*\n?/g,
    replacement: ''
  },
];

// Special patterns for axiosConfig.js
const axiosConfigPatterns = [
  // Remove tenant ID extraction from appCache
  {
    pattern: /let\s+tenantId\s*=\s*null;\s*\n\s*if\s*\(typeof\s+window[^}]+}\s*\n/gm,
    replacement: ''
  },
  // Remove getTenantId import attempt
  {
    pattern: /else\s*{\s*\n\s*\/\/\s*Try to get tenant ID[^}]+}\s*\n\s*}\s*\n/gm,
    replacement: ''
  },
  // Remove tenant ID header setting
  {
    pattern: /\/\/\s*Standardize tenant headers[^}]+}\s*\n/gm,
    replacement: ''
  },
  // Clean up tenant ID related code
  {
    pattern: /if\s*\(tenantId\)\s*{\s*\n[^}]+config\.params\.tenantId\s*=\s*tenantId;\s*\n\s*}\s*\n/gm,
    replacement: ''
  },
  // Remove tenantId variable references
  {
    pattern: /tenantId\s*=\s*\(appCache[^;]+\);\s*\n\s*logger\.debug[^;]+;\s*\n/gm,
    replacement: ''
  },
];

async function updateFile(filePath, patterns) {
  try {
    const fullPath = path.join('/Users/kuoldeng/projectx/frontend/pyfactor_next', filePath);
    const content = await fs.readFile(fullPath, 'utf8');
    
    let updatedContent = content;
    let changesMade = false;
    
    for (const { pattern, replacement } of patterns) {
      const before = updatedContent;
      updatedContent = updatedContent.replace(pattern, replacement);
      if (before !== updatedContent) {
        changesMade = true;
      }
    }
    
    if (changesMade) {
      await fs.writeFile(fullPath, updatedContent);
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`⚠️  File not found: ${filePath}`);
    } else {
      console.error(`❌ Error updating ${filePath}:`, error.message);
    }
    return false;
  }
}

async function main() {
  console.log('🔒 Secure Tenant Isolation Script - Remaining Modules');
  console.log('='.repeat(50));
  console.log('Updating Payroll, Taxes, Reports, and Analytics modules...\n');
  
  let componentsUpdated = 0;
  let servicesUpdated = 0;
  let apiRoutesUpdated = 0;
  let configUpdated = 0;
  
  // Update components
  console.log('📁 Updating Frontend Components...');
  for (const component of componentsToUpdate) {
    if (await updateFile(component, componentPatterns)) {
      componentsUpdated++;
    }
  }
  
  console.log('\n📁 Updating Service Files...');
  for (const service of serviceFilesToUpdate) {
    if (await updateFile(service, servicePatterns)) {
      servicesUpdated++;
    }
  }
  
  console.log('\n📁 Updating API Routes...');
  for (const route of apiRoutesToUpdate) {
    if (await updateFile(route, apiRoutePatterns)) {
      apiRoutesUpdated++;
    }
  }
  
  console.log('\n📁 Updating Axios Configuration...');
  if (await updateFile(axiosConfigFile, axiosConfigPatterns)) {
    configUpdated = 1;
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Update Complete!');
  console.log(`   - Components updated: ${componentsUpdated}`);
  console.log(`   - Service files updated: ${servicesUpdated}`);
  console.log(`   - API routes updated: ${apiRoutesUpdated}`);
  console.log(`   - Config files updated: ${configUpdated}`);
  console.log(`   - Total files updated: ${componentsUpdated + servicesUpdated + apiRoutesUpdated + configUpdated}`);
  
  console.log('\n📝 Next Steps:');
  console.log('1. Review the changes');
  console.log('2. Test Payroll, Taxes, Reports, and Analytics features');
  console.log('3. Commit and deploy the changes');
  console.log('4. Ensure backend handles tenant isolation for these modules');
}

main().catch(console.error);