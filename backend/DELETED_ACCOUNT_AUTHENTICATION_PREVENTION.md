# Deleted Account Authentication Prevention

## Overview
This document summarizes the changes made to prevent deleted/closed accounts from authenticating in the system.

## Problem
Account closure was working correctly (users were being marked as `is_deleted = True` and `is_active = False`), but deleted users could still sign in through various authentication methods.

## Solution
Added checks in all authentication flows to verify that the user account has not been deleted before allowing authentication.

## Changes Made

### 1. Auth0 JWT Authentication (`/backend/pyfactor/custom_auth/auth0_authentication.py`)
- **Location**: `get_or_create_user` method (lines 1019-1022 and 1040-1043)
- **Check**: Added verification for `is_deleted` flag when finding users by Auth0 ID or email
- **Error Message**: "This account has been closed. Please contact support if you need assistance."
- **Status**: ✅ Already implemented

### 2. Auth0 User Creation Endpoint (`/backend/pyfactor/custom_auth/api/views/auth0_views.py`)
- **Location**: `Auth0UserCreateView.post` method (lines 101-106)
- **Check**: Added verification after `get_or_create` to prevent deleted accounts from being reactivated
- **Error Response**: HTTP 403 Forbidden with error message
- **Status**: ✅ Implemented

### 3. Email/Password Authentication (`/backend/pyfactor/custom_auth/serializers.py`)

#### CustomAuthTokenSerializer
- **Location**: `validate` method (lines 217-220)
- **Check**: Added verification after successful authentication
- **Error**: Raises `ValidationError` with user-friendly message
- **Status**: ✅ Implemented

#### CustomTokenObtainPairSerializer (JWT Token)
- **Location**: `validate` method (lines 175-177)
- **Check**: Added verification before generating JWT tokens
- **Error**: Raises `ValidationError` to prevent token generation
- **Status**: ✅ Implemented

### 4. Social Login (Google OAuth) (`/backend/pyfactor/custom_auth/views.py`)
- **Location**: `SocialLoginView.get_or_create_user` method (lines 401-404)
- **Check**: Added verification after finding/creating user
- **Error**: Raises `AuthenticationFailed` exception
- **Status**: ✅ Implemented

## Testing
To verify these changes work correctly:

1. **Test Script**: Use `/backend/pyfactor/test_deleted_account_prevention.py`
2. **Manual Testing**:
   - Close an account via the UI
   - Try to sign in with the closed account using:
     - Email/password
     - Google OAuth
     - Direct Auth0 authentication
   - Verify you receive the error message: "This account has been closed. Please contact support if you need assistance."

## Database Fields Used
- `is_deleted` (Boolean): Marks if the account has been deleted
- `deleted_at` (DateTime): Timestamp of deletion
- `deletion_reason` (String): Reason for account closure
- `is_active` (Boolean): Also set to False for extra security

## Audit Trail
All account deletions are logged in the `AccountDeletionLog` table for compliance and debugging purposes.

## Future Considerations
1. Consider implementing a grace period where users can reactivate their accounts
2. Add monitoring/alerting for failed authentication attempts on deleted accounts
3. Consider implementing IP-based rate limiting for security