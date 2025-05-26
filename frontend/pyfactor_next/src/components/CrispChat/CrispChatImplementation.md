# Crisp Chat Implementation Documentation

## Version: 0030 v1.0
## Created: 2024-12-19
## Purpose: Implement Crisp Chat functionality on all pages of the app

## Overview
This implementation ensures Crisp Chat is available on all pages of the application with proper authentication state management and user data integration using the CognitoAttributes utility.

## Key Features

### 1. Global Availability
- Crisp Chat is loaded through DynamicComponents which is included in ClientLayout
- Available on all pages without requiring page-specific implementation
- Proper SSR handling with dynamic imports

### 2. Authentication State Management
- DynamicComponents now checks authentication status using getCurrentUser()
- Passes isAuthenticated prop to CrispChat component
- Handles authentication state changes gracefully

### 3. CognitoAttributes Integration
- Uses CognitoAttributes utility for all user attribute access
- Proper handling of given_name and family_name for user display
- Tenant ID integration using custom:tenant_ID attribute
- Business name and user role integration

### 4. Enhanced Error Handling
- Graceful fallback when Crisp script fails to load
- Error boundary protection for the entire component
- Comprehensive logging for debugging

## Files Modified

### 1. src/components/DynamicComponents.js
- Added authentication state checking
- Proper prop passing to CrispChat
- Enhanced error handling

### 2. src/components/CrispChat/CrispChat.js
- Integrated CognitoAttributes utility for user data access
- Enhanced user data setting with tenant ID and role
- Improved error handling and logging
- Better CSS z-index management

## Technical Implementation

### Authentication Flow
1. DynamicComponents checks authentication status on mount
2. Uses getCurrentUser() from aws-amplify/auth
3. Passes isAuthenticated boolean to CrispChat
4. CrispChat initializes with or without user data based on auth status

### User Data Integration
- Email: CognitoAttributes.getValue(attributes, CognitoAttributes.EMAIL)
- Name: CognitoAttributes.getValue(attributes, CognitoAttributes.GIVEN_NAME/FAMILY_NAME)
- Company: CognitoAttributes.getBusinessName(attributes)
- Tenant ID: CognitoAttributes.getTenantId(attributes)
- User Role: CognitoAttributes.getUserRole(attributes)

### Environment Configuration
- Requires NEXT_PUBLIC_CRISP_WEBSITE_ID in environment variables
- No hardcoded values per requirements
- Production-ready configuration

## Requirements Addressed

✅ **Condition 6**: Use CognitoAttributes utility for accessing Cognito user attributes
✅ **Condition 9**: Use custom:tenant_ID for tenant id
✅ **Condition 11**: Next.js version 15 compatibility
✅ **Condition 12**: Long term solution implementation
✅ **Condition 17**: JavaScript (not TypeScript)
✅ **Condition 19**: Production mode only
✅ **Condition 22**: No hardcoded environment keys
✅ **Condition 28**: Clean and efficient code

## Usage

Crisp Chat will automatically be available on all pages once this implementation is deployed. No additional configuration is required on individual pages.

### For Authenticated Users
- Full user profile integration
- Tenant-specific context
- Role-based information

### For Unauthenticated Users
- Basic chat functionality
- No user data integration
- Still fully functional

## Debugging

The implementation includes comprehensive logging:
- Authentication status checks
- User data extraction and setting
- Crisp script loading status
- Error conditions and fallbacks

Check browser console for detailed logs with '[DynamicComponents]' and '[CrispChat]' prefixes.

## Version History

### v1.0 (2024-12-19)
- Initial implementation
- CognitoAttributes integration
- Global availability on all pages
- Enhanced error handling and logging 