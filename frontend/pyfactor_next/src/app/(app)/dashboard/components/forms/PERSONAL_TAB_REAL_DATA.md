# Personal Information Tab Real Data Integration

## Overview
This document explains the implementation of real user data in the Personal Information tab of the EmployeeManagement.js component. Previously, this tab displayed mock data, but it now shows actual user information from AWS RDS, Cognito attributes, and AWS App Cache.

## Implementation Details
- **Version**: 1.0
- **Date Implemented**: 2025-04-26
- **Issue Reference**: UI-2104
- **Script**: `/scripts/Version0037_RealUserDataInPersonalTab_EmployeeManagement.js`

## Data Sources (in order of priority)
1. **User Profile API**: First attempts to fetch data from `/api/user/profile`
2. **AWS App Cache**: If API fails, uses data from global app cache 
3. **Cognito Attributes**: If both API and cache fail, fetches directly from Cognito
4. **Default Values**: Falls back to empty values if all else fails

## Data Flow
```
Personal Information Tab Request
  ↓
  → User Profile API (/api/user/profile) → Success → Display Data
  | ↓ (if failed)                           ↑
  → AWS App Cache (window.__APP_CACHE)  → Success →
  | ↓ (if failed)                           ↑
  → Cognito Attributes (fetchUserAttributes) → Success →
  | ↓ (if failed)                           ↑
  → Default Empty Values  ⟶⟶⟶⟶⟶⟶⟶⟶⟶⟶⟶⟶⟶⟶⟶⟶⟶⟶⟶⟶⟶
```

## Mapped Fields
The following user fields are displayed in the Personal Information tab:

| Personal Information Field | Data Sources |
|---------------------------|--------------|
| First Name | profile.firstName, profile.first_name |
| Last Name | profile.lastName, profile.last_name |
| Email | profile.email |
| Phone Number | profile.phoneNumber, profile.phone_number |
| Address | profile.street, profile.address |
| City | profile.city |
| State | profile.state |
| Zip Code | profile.postcode, profile.zip_code |
| Country | profile.country (defaults to 'US') |

## Security Considerations
- No sensitive data is stored in cookies or localStorage
- Tenant isolation is maintained with tenant ID header
- All APIs respect row-level security policies
- No hardcoded tenant IDs or credentials

## Tenant Isolation
- The code automatically retrieves the tenant ID from multiple possible sources:
  1. AWS App Cache tenant namespace
  2. getCacheValue utility if available
  3. Fallback to localStorage (used only as last resort)
- This tenant ID is included in API requests to ensure proper data isolation

## Testing
To verify the changes:
1. Log in as a user with profile information
2. Navigate to the EmployeeManagement component
3. Select the Personal Information tab
4. Verify that real user information is shown instead of mock data
5. Test with different users to ensure proper tenant isolation

## Rollback Process
If issues are encountered, there's a dated backup in `/scripts/backups/` named with timestamp that can be restored.

## Future Enhancements
1. Add ability to edit and save profile information
2. Add more comprehensive profile fields
3. Implement profile picture upload feature 