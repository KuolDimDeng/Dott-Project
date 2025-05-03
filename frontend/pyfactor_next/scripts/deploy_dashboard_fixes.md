# Dashboard Fixes Deployment Script

## Overview

This script automates the deployment of dashboard fix scripts to the Next.js public scripts directory so they will be loaded by the frontend application automatically.

## Purpose

The dashboard is experiencing several critical issues:
1. Triple re-rendering after sign-in, causing performance issues
2. Missing user initials and business name in the DashAppBar
3. Incorrect casing of `tenant_ID` attribute causing data retrieval failures

This deployment script handles copying the fix scripts to the correct location and updating the script registry.

## Usage

```bash
# From the project root
node scripts/deploy_dashboard_fixes.js
```

## What This Script Does

1. **Copies Fix Scripts**: Copies the following scripts to the public/scripts directory:
   - `Version0008_fix_dashboard_triple_rerender.js`
   - `Version0009_fix_dashappbar_missing_user_data.js`
   - `Version0011_fix_tenant_ID_in_DashAppBar.js`

2. **Updates Script Registry**: Updates the script registry to mark the scripts as deployed.

3. **Adds Script References**: If needed, updates the layout.js file to include the Scripts component.

4. **Creates Backups**: Creates backups of all files before modifying them.

## Fixes Implemented

### Fix 1: Dashboard Triple Re-rendering (Version0008)
Fixes the issue where the dashboard re-renders three times after signing in by implementing better debouncing and controlling component mount/unmount cycles.

### Fix 2: Missing User Data in DashAppBar (Version0009)
Fixes issues with missing business name and user initials in the DashAppBar component by properly fetching and displaying Cognito attributes.

### Fix 3: Tenant_ID Casing Fix (Version0011)
Fixes issues caused by incorrect casing of the tenant_ID attribute by using the correct `custom:tenant_ID` format (with uppercase ID) for attribute retrieval.

## After Deployment

After running this script, you need to restart the Next.js application:

```bash
cd frontend/pyfactor_next
pnpm run dev
```

## Technical Implementation

The script:
1. Defines configuration settings (target directories, scripts to deploy)
2. Creates backups of files before modification
3. Copies scripts to the public directory
4. Updates the script registry to mark scripts as deployed
5. Ensures the Scripts component is included in the layout

## Dependencies

- Node.js file system module (fs)
- Node.js path module (path)
- Scripts component in the Next.js application

## Important Notes

- All files are backed up before modification
- Backups are stored in the `scripts/backups` directory
- The Next.js application must be restarted after deployment

## Script Architecture

This script uses ES modules and follows these steps:
1. Defines configuration (source scripts, paths, etc.)
2. Creates backup functions
3. Copies scripts to target directory
4. Updates the script registry
5. Adds Scripts component to layout if needed

## Version History

- v1.0.0 (2025-04-30): Initial implementation 