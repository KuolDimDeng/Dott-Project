# DashAppBar URL Parameter Handling Fix

## Issue Description
The DashAppBar component is still not displaying the business name or user initials even after previous fixes. The issue appears to be related to improper handling of URL parameters containing business name and user information. URL parameters like `tenantName` and `tenantUserId` are present but not being correctly decoded and immediately applied.

The application logs show that the page is loading with URL parameters that contain valuable data:
```
GET https://localhost:3000/tenant/3f8808cc-30fd-4141-bdcb-d972589103e4/dashboard?fromAuth=true&tenantName=Juba%20Cargo%20Village&tenantType=Arts%20and%20Crafts&tenantUserId=a488d4d8-b091-7012-3940-5aaf966fe49e&cb=1745938591068&recovery=true
```

## Changes Implemented

### 1. Immediate URL Parameter Handling

Added a new `useEffect` hook that runs on component mount to:
- Check URL parameters immediately for business name and user ID
- Apply values directly to state without waiting for other data sources
- Store extracted values in APP_CACHE for persistence
- Handle URL parameters that might be double-encoded

### 2. Improved URL Parameter Decoding

- Enhanced URL parameter decoding to handle both single and double encoding
- Added specific handling for `tenantName` which often experiences double-encoding during tenant switching
- Added fallback mechanisms when decoding fails

### 3. User Identification Improvements

- Use user email and ID from URL parameters if available
- Generate user initials from available URL data
- Store discovered email in APP_CACHE for cross-component usage

### 4. Enhanced Debugging

- Added comprehensive debug logging for URL-related data
- Log URL parameters, path components, and APP_CACHE state
- Provide better visibility into the data flow by logging all potential business name sources

## Affected Files

1. `/frontend/pyfactor_next/src/app/dashboard/components/DashAppBar.js`

## Testing Considerations

After applying this fix, verify that:

1. The business name appears correctly in the DashAppBar on initial page load
2. User initials appear in the avatar circle without requiring additional data sources
3. URL parameters with encoded values (like `%20` for spaces) are properly decoded
4. Double-encoded parameters (common during tenant switching) are properly handled
5. The business name and initials persist after page reloads

## Version History

- v1.0 (2025-04-29): Initial implementation of URL parameter handling fix 