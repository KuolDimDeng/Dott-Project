#!/usr/bin/env node

/**
 * Script: Version0004_secure_tenant_isolation_all_modules.js
 * Purpose: Update all modules to follow secure tenant isolation pattern
 * - Remove getSecureTenantId usage from frontend components
 * - Remove tenant ID from API calls
 * - Update API routes to not extract tenant IDs from frontend
 * - Follow the pattern established for CRM module
 * Created: 2025-01-23
 */

const fs = require('fs').promises;
const path = require('path');

// Components that need to be updated
const componentsToUpdate = [
  // Sales Menu Components
  'src/app/dashboard/components/forms/ProductManagement.js',
  'src/app/dashboard/components/forms/ServiceManagement.js',
  'src/app/dashboard/components/forms/EstimateManagement.js',
  'src/app/dashboard/components/forms/SalesOrderManagement.js',
  'src/app/dashboard/components/forms/InvoiceManagement.js',
  'src/app/dashboard/components/forms/SalesReportsManagement.js',
  'src/app/dashboard/components/forms/SalesDashboard.js',
  
  // Inventory Menu Components
  'src/app/dashboard/components/forms/StockAdjustmentsManagement.js',
  'src/app/dashboard/components/forms/LocationsManagement.js',
  'src/app/dashboard/components/forms/SuppliersManagement.js',
  'src/app/dashboard/components/forms/InventoryReports.js',
  
  // Payments Menu Components
  'src/app/dashboard/components/forms/PaymentsDashboard.js',
  'src/app/dashboard/components/forms/ReceivePayments.js',
  'src/app/dashboard/components/forms/MakePayments.js',
  'src/app/dashboard/components/forms/PaymentMethods.js',
  'src/app/dashboard/components/forms/RecurringPayments.js',
  'src/app/dashboard/components/forms/RefundsManagement.js',
  'src/app/dashboard/components/forms/PaymentReconciliation.js',
  'src/app/dashboard/components/forms/PaymentGateways.js',
  'src/app/dashboard/components/forms/PaymentPlans.js',
  'src/app/dashboard/components/forms/PaymentReports.js',
  
  // Accounting Menu Components
  'src/app/dashboard/components/forms/AccountingDashboard.js',
  'src/app/dashboard/components/forms/ChartOfAccountsManagement.js',
  'src/app/dashboard/components/forms/JournalEntryManagement.js',
  'src/app/dashboard/components/forms/AccountingReports.js',
  
  // HR Menu Components
  'src/app/dashboard/components/forms/EmployeeManagement.js',
  
  // Other Components
  'src/app/dashboard/components/forms/TaxManagement.js',
  'src/app/dashboard/components/forms/ProductForm.js',
  'src/app/dashboard/components/forms/CustomerForm.js',
];

// API Routes that need to be updated
const apiRoutesToUpdate = [
  'src/app/api/products/route.js',
  'src/app/api/services/route.js',
  'src/app/api/invoices/route.js',
  'src/app/api/estimates/route.js',
  'src/app/api/inventory/products/route.js',
  'src/app/api/inventory/services/route.js',
  'src/app/api/customers/route.js',
];

// Patterns to remove from components
const componentPatterns = [
  // Remove getSecureTenantId imports
  {
    pattern: /import\s*{\s*[^}]*getSecureTenantId[^}]*}\s*from\s*['"][@/]utils\/tenantUtils['"];?\s*\n?/g,
    replacement: ''
  },
  // Remove extractTenantId if it's the only import
  {
    pattern: /import\s*{\s*extractTenantId\s*}\s*from\s*['"][@/]utils\/tenantUtils['"];?\s*\n?/g,
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
  // Remove tenant ID from request bodies
  {
    pattern: /tenant_id:\s*tenantId,?\s*\n?/g,
    replacement: ''
  },
  {
    pattern: /tenantId:\s*tenantId,?\s*\n?/g,
    replacement: ''
  },
  // Remove tenant ID from headers
  {
    pattern: /'X-Tenant-ID':\s*tenantId,?\s*\n?/g,
    replacement: ''
  },
  // Remove schema construction
  {
    pattern: /const\s+schema\s*=\s*`tenant_\$\{tenantId\.replace\(\/\-\/g,\s*'_'\)\}`;?\s*\n?/g,
    replacement: ''
  },
  // Remove schema from API calls
  {
    pattern: /[?&]schema=\$\{schema\}/g,
    replacement: ''
  },
];

// Patterns to remove from API routes
const apiPatterns = [
  // Remove tenant ID extraction from query params
  {
    pattern: /const\s+tenantId\s*=\s*url\.searchParams\.get\(['"]tenantId['"]\)[^;]*;?\s*\n?/g,
    replacement: ''
  },
  // Remove tenant ID extraction from headers
  {
    pattern: /const\s+tenantId\s*=\s*request\.headers\.get\(['"]x-tenant-id['"]\)[^;]*;?\s*\n?/g,
    replacement: ''
  },
  // Remove tenant ID extraction from cookies
  {
    pattern: /const\s+tenantId\s*=\s*request\.cookies\.get\(['"]tenantId['"]\)\?\.value[^;]*;?\s*\n?/g,
    replacement: ''
  },
  // Remove complex tenant ID extraction
  {
    pattern: /const\s+tenantId\s*=\s*url\.searchParams\.get\(['"]tenantId['"]\)\s*\|\|\s*\n?\s*request\.headers\.get\(['"]x-tenant-id['"]\)\s*\|\|\s*\n?\s*request\.cookies\.get\(['"]tenantId['"]\)\?\.value[^;]*;?\s*\n?/g,
    replacement: ''
  },
  // Remove schema conversion logic
  {
    pattern: /if\s*\(schema\s*===\s*['"]default_schema['"]\)\s*{\s*[\s\S]*?}\s*\n?/g,
    replacement: ''
  },
  // Remove tenant ID from forwarded headers
  {
    pattern: /headers\['X-Tenant-ID'\]\s*=\s*[^;]+;?\s*\n?/g,
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
  console.log('🔒 Secure Tenant Isolation Script - Version 0004');
  console.log('='.repeat(50));
  console.log('Updating all modules to follow secure tenant isolation pattern...\n');
  
  let componentsUpdated = 0;
  let apiRoutesUpdated = 0;
  
  // Update components
  console.log('📁 Updating Frontend Components...');
  for (const component of componentsToUpdate) {
    if (await updateFile(component, componentPatterns)) {
      componentsUpdated++;
    }
  }
  
  console.log('\n📁 Updating API Routes...');
  for (const route of apiRoutesToUpdate) {
    if (await updateFile(route, apiPatterns)) {
      apiRoutesUpdated++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Update Complete!');
  console.log(`   - Components updated: ${componentsUpdated}`);
  console.log(`   - API routes updated: ${apiRoutesUpdated}`);
  console.log(`   - Total files updated: ${componentsUpdated + apiRoutesUpdated}`);
  
  console.log('\n📝 Next Steps:');
  console.log('1. Review the changes');
  console.log('2. Test the updated components');
  console.log('3. Commit and deploy the changes');
  console.log('4. Update backend Django views to handle tenant isolation');
}

main().catch(console.error);