# Fix Tenant_ID Casing in DashAppBar

## Overview

This script fixes issues with missing business name and user initials in the DashAppBar component by specifically focusing on the correct casing of `custom:tenant_ID` attribute (with uppercase ID).

## Implementation Details

**Version:** 1.0.0  
**Date:** 2025-04-30  
**File:** `/scripts/Version0011_fix_tenant_ID_in_DashAppBar.js`

### Problem Description

The DashAppBar component is missing the business name and user initials because it's failing to retrieve the correct tenant ID from Cognito attributes. The issue stems from using inconsistent casing for the tenant ID attribute.

The correct attribute name is `custom:tenant_ID` (with uppercase "ID"), but previous scripts and components were using variants like `custom:tenant_id` with lowercase "id".

### Solution

This script provides a simplified, direct fix that:

1. Explicitly uses the correct `custom:tenant_ID` casing throughout the code
2. Adds more defensive checks when fetching and using Cognito attributes
3. Uses multiple strategies to find and update the user initials and business name in the DOM
4. Properly updates the APP_CACHE with the correct attribute casing

Unlike previous versions, this script is more targeted and prioritizes working with the correct attribute casing from the start rather than trying to handle multiple attribute formats.

### Key Functions

- `getCurrentTenantId()`: Gets tenant ID using the correct attribute name
- `getCognitoUserAttributes()`: Retrieves Cognito attributes with proper error handling
- `generateUserInitials()`: Creates user initials from name or email
- `getBusinessName()`: Extracts business name from attributes
- `updateUserInitials()` and `updateBusinessName()`: Update DOM elements
- `updateAppCache()`: Updates APP_CACHE with correct casing

### Technical Implementation

The script uses:
- Explicit attribute name with correct casing (`custom:tenant_ID`)
- Dynamic import of Amplify v6 auth module
- Multiple fallback mechanisms for finding DOM elements
- MutationObserver to handle DOM changes after initial render
- Retry mechanism for handling timing-related issues

## Usage

This script is designed to be loaded in the browser through the Scripts component in layout.js. After deployment, it will automatically run when the dashboard loads.

To deploy:
```bash
node scripts/deploy_dashboard_fixes.js
```

## Dependencies

- AWS Amplify v6 Auth module
- APP_CACHE implementation
- MutationObserver browser API

## Related Issues

This fixes both:
1. The "dashboard still loading twice after signing in" issue 
2. The "business name and user initials missing from the dashappbar" issue

By properly handling the tenant ID attribute casing, it ensures the dashboard can correctly retrieve and display user data.

## Status

- [x] Implemented
- [ ] Tested in development
- [ ] Tested in production
- [ ] Monitoring for regressions 