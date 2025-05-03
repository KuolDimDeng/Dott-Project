#!/usr/bin/env node

/**
 * Version0001_fix_employee_rls_views.js
 * 
 * This script fixes the RLS (Row Level Security) issue in the employee_list view.
 * The issue is that the view returns all employees regardless of tenant,
 * which causes data leakage between tenants.
 * 
 * The fix enforces tenant isolation by filtering employees by the current tenant_id.
 * 
 * Author: Claude AI Assistant
 * Date: 2025-04-29
 * Version: 1.0.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// File paths
const HR_VIEWS_PATH = '/Users/kuoldeng/projectx/backend/pyfactor/hr/views.py';
const BACKUP_DIR = '/Users/kuoldeng/projectx/backend/pyfactor/backups';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Create backup filename with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFilename = path.join(BACKUP_DIR, `views.py.rls_fix_backup_${timestamp}`);

// Backup the original file
try {
  fs.copyFileSync(HR_VIEWS_PATH, backupFilename);
  console.log(`✅ Created backup: ${backupFilename}`);
} catch (error) {
  console.error(`❌ Failed to create backup: ${error.message}`);
  process.exit(1);
}

// Function to fix the employee_list function
async function fixEmployeeList() {
  try {
    const fileContent = fs.readFileSync(HR_VIEWS_PATH, 'utf8');
    
    // Replace the employee_list function implementation
    // Look for the line that gets all employees without filtering
    const newContent = fileContent.replace(
      /employees = Employee\.objects\.all\(\)/g,
      `# Get tenant ID from request or headers
        tenant_id = getattr(request, 'tenant_id', None)
        if not tenant_id:
            tenant_id = request.headers.get('X-Tenant-ID') or request.headers.get('x-tenant-id')
        
        # If tenant_id is provided, filter by it for RLS isolation
        if tenant_id:
            # Filter employees by tenant_id for proper RLS isolation
            employees = Employee.objects.filter(business_id=tenant_id)
            logger.info(f"Filtered employees by tenant: {tenant_id}")
        else:
            # Only return employees for the authenticated user's tenant
            # This is a fallback and should not normally happen when RLS is properly set
            logger.warning("No tenant ID found in request, returning empty employee list for security")
            employees = Employee.objects.none()`
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(HR_VIEWS_PATH, newContent);
    console.log('✅ Successfully fixed employee_list function');
    
    return true;
  } catch (error) {
    console.error(`❌ Error fixing employee_list function: ${error.message}`);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔒 Starting RLS fix for employee_list view...');
  
  // Fix the employee_list function to respect tenant isolation
  const success = await fixEmployeeList();
  
  if (success) {
    console.log('✅ RLS fix completed successfully');
    console.log('📝 Summary of changes:');
    console.log('  - Modified employee_list to filter by tenant_id');
    console.log('  - Added fallback to return no employees when tenant_id is missing');
    console.log('\n🔍 Next steps:');
    console.log('  1. Restart the Django server to apply changes');
    console.log('  2. Test employee listing with different tenant accounts');
    console.log('  3. Verify that employees from other tenants are no longer visible');
  } else {
    console.error('❌ Failed to apply RLS fix');
    console.log('   You can restore from the backup file if needed');
  }
}

// Run the script
main().catch(error => {
  console.error(`❌ Unhandled error: ${error.message}`);
  process.exit(1);
}); 