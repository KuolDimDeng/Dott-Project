# Fix Tenant_ID Casing in Dashboard Fix Scripts

## Overview

This script fixes the attribute name casing for `tenant_ID` in the existing dashboard fix scripts. The correct attribute name is `custom:tenant_ID` (with uppercase ID) rather than variants like `custom:tenant_id` or `custom:tenantId`.

## Implementation Details

**Version:** 1.0.0  
**Date:** 2025-04-30  
**File:** `/scripts/Version0010_fix_tenant_ID_casing_in_scripts.js`

### Problem Description

The previous fix scripts (Version0008 and Version0009) were using inconsistent casing for the `custom:tenant_ID` attribute, which was causing them to not properly retrieve tenant information from Cognito. The dashboard was still loading twice after signing in because the scripts couldn't find the correct tenant attributes.

The correct attribute name is `custom:tenant_ID` (with uppercase "ID"), but the scripts were using variants like:
- `custom:tenant_id` (lowercase "id")
- `custom:tenantId` (camelCase)
- `custom:tenant_Id` (mixed case)
- `custom:tenantID` (no underscore)
- `custom:tenant-id` (with hyphen)
- `custom:tenant-ID` (with hyphen and uppercase)

### Solution

This script updates all instances of incorrect casing to use the correct `custom:tenant_ID` format in both:
1. The original script files in the scripts directory
2. The deployed script files in the frontend public directory

It also updates the script registry to document this change and creates backups of all modified files.

### Key Functions

- `fixScript()`: Updates the tenant_ID casing in a script file
- `fixPublicScripts()`: Updates the tenant_ID casing in the deployed scripts
- `updateRegistry()`: Adds this script to the registry
- `countPatternOccurrences()`: Counts occurrences of each pattern before and after fixing

### Technical Implementation

The script uses regular expressions to find and replace all variants of the attribute name. It maintains backup copies of all modified files and provides detailed reports of the changes made.

## Usage

```bash
node scripts/Version0010_fix_tenant_ID_casing_in_scripts.js
```

After running this script, you should:
1. Deploy the updated scripts using `node scripts/deploy_dashboard_fixes.js`
2. Restart your application

## Dependencies

- Node.js file system module (fs)
- Node.js path module (path)

## Related Issues

This fixes the "dashboard still loading twice after signing in" issue by ensuring scripts use the correct attribute name casing, allowing them to properly access tenant information from Cognito.

## Status

- [x] Implemented
- [ ] Tested in development
- [ ] Tested in production
- [ ] Monitoring for regressions 