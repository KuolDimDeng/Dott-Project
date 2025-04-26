# Database Management Scripts

This directory contains scripts for managing the multi-tenant database system.

## Remove All Tenants

The `remove_all_tenants.py` script removes all tenants from the dott_main database.

### What it does:
1. Lists all tenants in the database
2. Deletes all tenant records
3. Drops all tenant schemas

### Usage:

```bash
# Run the script using Django's shell
cd backend/pyfactor
python manage.py shell < scripts/remove_all_tenants.py
```

**WARNING**: This will permanently delete all tenant data! The script will ask for confirmation before proceeding.

## Initialize Database Tables

The `initialize_database_tables.py` script initializes tables in an existing database.

### What it does:
1. Checks if the database exists (must be created first in AWS console)
2. Runs all migrations to create the necessary tables
3. Sets up proper permissions

### Usage:

```bash
# Run the script directly
cd backend/pyfactor
python scripts/initialize_database_tables.py [database_name]
```

If `database_name` is not provided, it will use the name from settings.py.

### Example:

```bash
# Initialize tables in a database named "dott_new"
python scripts/initialize_database_tables.py dott_new
```

## Workflow for Setting Up a New Database

1. Create the database in AWS console
2. Run the initialize_database_tables.py script to create all tables
3. The database is now ready for tenant creation

## Workflow for Cleaning Up Tenants

1. Run the remove_all_tenants.py script to remove all tenants
2. Confirm by typing 'DELETE ALL TENANTS' when prompted
3. All tenant data will be removed, but the database structure remains intact

## Maintenance Scripts

- `clean-database.cjs` - Cleans up database entries for development
- `delete-tenant.sh` - Deletes a tenant and all related resources
- `delete-tenant.js` - JavaScript version of the tenant deletion script
- `delete-tenant.cjs` - CommonJS version of the tenant deletion script
- `reset-database.sh` - Resets the database to a clean state
- `setup-tenant-dashboard.js` - Sets up the tenant dashboard components
- `20250419_chunk_error_recovery.js` - Enhances dashboard resilience with improved chunk loading error recovery
- `20240425_network_connectivity_diagnosis.js` - Diagnoses and fixes network connectivity issues between frontend and backend
- `20240425_fix_axios_tenant_header.js` - Ensures proper tenant ID headers are included in all axios requests
- `backend/pyfactor/scripts/20240425_fix_cors_headers.py` - Updates Django CORS settings to allow the X-Tenant-ID header

## Usage Instructions

### Chunk Error Recovery

The `20250419_chunk_error_recovery.mjs` script enhances the dashboard's resilience by implementing robust error handling for chunk loading errors and network issues. These improvements help ensure the dashboard loads correctly after authentication, even when network conditions are suboptimal.

Usage:
```bash
node scripts/20250419_chunk_error_recovery.mjs
```

To restore from backups (if needed):
```bash
node scripts/20250419_chunk_error_recovery.mjs --restore
```

Note: This script uses the `.mjs` extension because it's written using ES modules syntax, which is required for projects with `"type": "module"` in package.json.

Key features:
- Enhanced chunk loading error detection and recovery
- Improved service worker and cache management
- URL-based recovery tracking to prevent infinite reload loops
- Better error handling in the Providers component

### Network Connectivity Diagnosis

The `20240425_network_connectivity_diagnosis.js` script diagnoses and fixes network connectivity issues between the frontend and backend applications, particularly for HTTPS configurations.

Usage:
```bash
node scripts/20240425_network_connectivity_diagnosis.js
```

To analyze a specific browser console log file:
```bash
node scripts/20240425_network_connectivity_diagnosis.js path/to/console-log.txt
```

Key features:
- Verifies SSL certificate configuration and validity
- Tests connectivity to both frontend and backend servers
- Analyzes browser console output for common error patterns
- Checks CORS configuration on the backend
- Verifies Amplify configuration
- Automatically applies common fixes for network issues

### CORS and Tenant ID Header Fix

The following scripts fix CORS issues related to the `X-Tenant-ID` header:

1. **Django CORS Headers Update Script**:
   ```bash
   cd backend/pyfactor
   python scripts/20240425_fix_cors_headers.py
   ```

2. **Axios Tenant ID Header Fix Script**:
   ```bash
   node scripts/20240425_fix_axios_tenant_header.js
   ```

Key features:
- Updates `CORS_ALLOW_HEADERS` in Django settings to include 'x-tenant-id'
- Ensures proper tenant ID header configuration in axios interceptors
- Fixes circuit breaker resets during error recovery
- Creates backups of all modified files

# Tenant ID Retrieval Fix

## Overview
This fix addresses the issue where tenant ID is not being properly retrieved during employee fetch operations, resulting in the error: "[EmployeeApi] No tenant ID available for employee fetch".

## Problem
The tenant ID exists in Cognito attributes but is not being correctly passed during employee fetch operations. This is causing failures in the employee management system.

## Solution
The fix implements a more robust tenant ID retrieval mechanism with the following improvements:

1. **Enhanced AppCache Initialization**
   - Ensures AppCache is properly initialized with required properties
   - Adds structured cache handling for tenant-related data

2. **Improved Tenant ID Retrieval**
   - Implements a multi-source retrieval strategy:
     1. AppCache (primary source)
     2. Cognito attributes (fallback)
     3. Auth store (final fallback)
   - Adds comprehensive error handling and logging

3. **Cache Management**
   - Implements proper cache expiration handling
   - Adds structured cache entry management
   - Includes error recovery mechanisms

## Implementation
The fix is implemented in `Version0001_fix_tenant_id_retrieval.js` and includes:

- Enhanced `getTenantId` function with better error handling
- Improved `getCacheValue` and `setCacheValue` functions
- Proper initialization checks for AppCache
- Comprehensive logging for debugging

## Testing
Before deploying to production, verify:
1. Tenant ID retrieval from all sources
2. Error handling scenarios
3. Cache expiration behavior
4. Logging functionality

## Dependencies
- AWS Amplify v6
- Next.js 15
- AWS AppCache

## Security Considerations
- Maintains strict tenant isolation
- Preserves existing security measures
- No exposure of sensitive data in logs

## Rollback Plan
If issues arise:
1. Restore the backed-up `tenantUtils.js` file
2. Remove the fix script
3. Update the script registry

## Support
For issues or questions, contact the development team.