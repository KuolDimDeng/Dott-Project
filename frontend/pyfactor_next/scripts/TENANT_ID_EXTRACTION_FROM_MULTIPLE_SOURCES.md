# Tenant ID Extraction from Multiple Sources

## Overview

This documentation describes the implementation of tenant ID extraction from multiple sources in the User Management page. This ensures proper tenant isolation even when the tenant ID is not directly available in user attributes.

## Problem Addressed

The initial implementation of tenant isolation relied solely on the presence of the `custom:tenant_ID` attribute in the user's attributes from Cognito. However, in some cases, the user might not have this attribute set, or it might not be accessible immediately after login, leading to:

1. Users from different tenants being visible to each other (tenant isolation breach)
2. Listing of users failing entirely
3. Empty user list when there should be users visible

## Solution Implemented

The solution adds multiple fallback mechanisms for extracting the tenant ID:

### 1. Enhanced Tenant ID Extraction

The `fetchEmployees` function in `SettingsManagement.js` now gets the tenant ID from multiple sources in this priority order:

1. User attributes from Cognito (`user?.attributes?.['custom:tenant_ID']`)
2. AWS AppCache (`getFromAppCache('tenantId')`)
3. URL parameters (when in a tenant-specific URL path like `/tenant/{tenantId}/...`)

### 2. AWS AppCache Implementation

Added/ensured proper implementation of AppCache utilities:
- `getFromAppCache()`: Retrieves values from the in-memory AWS AppCache
- `setInAppCache()`: Stores values in the in-memory AWS AppCache

This ensures zero dependency on cookies or localStorage, as per requirements.

### 3. Persistence for Future Requests

When a tenant ID is found from the URL, it is stored in the AWS AppCache for future use, ensuring consistent tenant isolation across page refreshes and navigation.

## Code Changes

The implementation spans across multiple scripts:

1. `Version0038_implement_tenant_isolation_for_user_management.js`: Initial tenant isolation
2. `Version0039_update_userService_inviteUser_for_tenant_isolation.js`: Tenant ID handling for new users
3. `Version0040_update_users_invite_api_for_custom_attributes.js`: API handling for tenant ID
4. `Version0041_fix_tenant_id_casing_in_users_list_api.js`: Ensuring correct tenant ID attribute name
5. `Version0042_fix_missing_imports_users_list_api.js`: Fixed API route imports
6. `Version0043_ensure_tenant_id_in_current_user.js`: Multiple source tenant ID extraction

## Testing

To test the implementation:
1. Log in as a user who doesn't explicitly have a tenant ID in their attributes
2. Navigate to a tenant-specific URL (e.g., `/tenant/{tenantId}/dashboard`)
3. Go to Settings > User Management
4. The user list should only show users from the same tenant

## Benefits

This implementation provides several benefits:

1. **Robust Tenant Isolation**: Ensures users can only see other users from their tenant, even if their Cognito attributes don't have the tenant ID
2. **Zero Cookie Dependency**: Uses only AWS AppCache for temporary storage, as required
3. **Multi-Source Fallback**: Multiple fallback mechanisms ensure tenant isolation works in various scenarios
4. **URL Context Awareness**: Leverages the URL path information when in a tenant context

## Future Improvements

Potential future improvements could include:
1. Adding tenant ID to user attributes via admin API if missing
2. More robust URL parameter parsing for different URL patterns
3. Additional logging for debugging tenant isolation issues 