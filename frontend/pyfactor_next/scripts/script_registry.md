# Script Registry

This file tracks all scripts created for the PyFactor Next frontend application.

## Overview

Scripts in this directory are used to implement fixes, features, and improvements to the application. Each script is versioned and documented to maintain a clear history of changes.

## Scripts

| Script Version | Name | Description | Target Files | Date |
|----------------|------|-------------|--------------|------|
| Version0001_implement_menu_access_privileges.js | Menu Access Privileges | Implements role-based menu access control for business users | src/app/dashboard/components/lists/listItems.js | 2024-07-10 |
| Version0002_fix_cognito_attributes_permissions.js | Cognito Attributes Permissions Fix | Fixes issues with unauthorized attribute errors in Cognito | src/utils/amplifyResiliency.js, src/utils/safeAttributes.js | 2024-07-12 |
| Version0001_fix_menu_privilege_owner_detection.js | Menu Privilege Owner Detection Fix | Fixes business owners not being properly detected for menu privileges | src/app/dashboard/components/lists/listItems.js, src/utils/menuPrivileges.js | 2024-07-19 |

## Backend Scripts

Backend scripts are located in `/backend/pyfactor/scripts/`:

| Script Version | Name | Description | Target Files | Date |
|----------------|------|-------------|--------------|------|
| Version0001_check_tenant_owner_privileges.py | Tenant Owner Privileges Check | Diagnoses and fixes issues with tenant owner privileges | custom_auth/models.py, users/models.py | 2024-07-19 |

## Running Scripts

### Frontend Scripts

Frontend scripts can be run from the browser console or included in the application bundle:

```javascript
import { applyMenuPrivilegeFixes } from '../scripts/Version0001_fix_menu_privilege_owner_detection';
applyMenuPrivilegeFixes();
```

### Backend Scripts

Backend scripts should be run from the command line in the project root:

```bash
cd /Users/kuoldeng/projectx/backend/
python pyfactor/scripts/Version0001_check_tenant_owner_privileges.py
```

## Script Guidelines

1. All scripts should be versioned using the pattern: `Version{NNNN}_{description}.{ext}`
2. Scripts should include comprehensive documentation within the file
3. Scripts should be registered in this file after creation
4. Scripts should be designed to be idempotent (safe to run multiple times)
5. Scripts should include proper error handling and logging 