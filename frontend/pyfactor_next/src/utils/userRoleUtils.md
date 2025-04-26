# User Role Utilities Documentation

## Overview
The `userRoleUtils.js` module provides utilities for handling user role case sensitivity, validation, and permissions in the application. It uses AWS Amplify's cache utility for storing role information.

## Recent Changes (v1.0)
- Moved role handling from script to utility functions
- Added role case normalization
- Implemented role validation
- Added role permissions management
- Added caching mechanism

## Functions

### normalizeRoleCase(role)
Standardizes the case of role strings.
- **Parameters**:
  - `role` (string): The role to normalize
- **Returns**: string
- **Example**: "admin" -> "Admin"

### storeNormalizedRole(role)
Stores the normalized role in the cache.
- **Parameters**:
  - `role` (string): The role to store
- **Returns**: Promise<void>
- **Throws**: Error if storage fails

### getNormalizedRole()
Retrieves the normalized role from cache.
- **Returns**: Promise<string>
- **Throws**: Error if retrieval fails

### clearRoleCache()
Clears the role from cache.
- **Returns**: Promise<void>
- **Throws**: Error if clearing fails

### isValidRole(role)
Validates if a role is recognized by the system.
- **Parameters**:
  - `role` (string): The role to validate
- **Returns**: boolean
- **Valid Roles**: Admin, User, Manager, Employee

### getRolePermissions(role)
Gets the permissions associated with a role.
- **Parameters**:
  - `role` (string): The role to get permissions for
- **Returns**: Object with permission flags
- **Permission Types**:
  - canManageUsers
  - canManageRoles
  - canManageSettings
  - canViewReports
  - canEditData

## Dependencies
- aws-amplify v6
  - utils: cache

## Usage Example
```javascript
import { 
  normalizeRoleCase, 
  storeNormalizedRole,
  getRolePermissions 
} from '@/utils/userRoleUtils';

// Normalize and store a role
await storeNormalizedRole('admin');

// Get role permissions
const permissions = getRolePermissions('admin');
if (permissions.canManageUsers) {
  // Handle user management
}
```

## Error Handling
All functions include proper error handling and logging. Errors are thrown with descriptive messages to aid in debugging.

## Cache Management
The module uses AWS Amplify's cache utility for storing role data. The cache key is prefixed to avoid conflicts.

## Security Considerations
- No sensitive data is stored in plain text
- Role validation is performed on all operations
- Default to least privileged role (Employee) if validation fails
- Cache is cleared on logout 