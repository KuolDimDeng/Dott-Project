# Critical Fixes for Account Deletion System

## Problem Summary
Currently, deleted users can sign back in and get new tenant IDs, completely bypassing the deletion.

## Required Fixes

### 1. Fix Backend User Creation Logic

```python
# File: /backend/pyfactor/custom_auth/auth0_views.py
# Function: create_auth0_user (lines 114-258)

# ADD THIS CHECK BEFORE CREATING NEW USER:
# Around line 144, before the try block that finds existing users

# Check ALL users (including deleted) by email
all_users_with_email = User.objects.filter(email=email)
for existing_user in all_users_with_email:
    if hasattr(existing_user, 'is_deleted') and existing_user.is_deleted:
        # Account was deleted - block recreation
        days_since_deletion = 0
        if hasattr(existing_user, 'deleted_at') and existing_user.deleted_at:
            days_since_deletion = (datetime.now(timezone.utc) - existing_user.deleted_at).days
        
        if days_since_deletion <= 30:
            return JsonResponse({
                'error': 'This account has been closed',
                'message': f'This account was closed {days_since_deletion} days ago. Contact support to reactivate.',
                'account_closed': True,
                'in_grace_period': True
            }, status=403)
        else:
            return JsonResponse({
                'error': 'This email was previously used',
                'message': 'This email is associated with a deleted account. Please use a different email.',
                'account_closed': True,
                'permanently_deleted': True
            }, status=403)
```

### 2. Fix Auth0 Authentication Middleware

```python
# File: /backend/pyfactor/custom_auth/auth0_authentication.py
# Function: get_or_create_user (lines 997-1070)

# MODIFY THE EXISTING CHECK (around line 1020):
# Change from just checking is_deleted to also preventing new account creation

# In the User.DoesNotExist exception block (line 1033):
except User.DoesNotExist:
    logger.debug(f"🔍 User not found by Auth0 ID, checking email: {email}")
    
    # Check ALL users with this email (including deleted)
    all_users = User.objects.filter(email=email)
    deleted_user = None
    active_user = None
    
    for user in all_users:
        if hasattr(user, 'is_deleted') and user.is_deleted:
            deleted_user = user
        else:
            active_user = user
    
    if deleted_user:
        # This email belongs to a deleted account
        logger.error(f"❌ Attempt to authenticate with deleted account email: {email}")
        raise exceptions.AuthenticationFailed(
            'This account has been closed. Please contact support if you need assistance.'
        )
    
    if active_user:
        # Link to existing active user
        logger.info(f"✅ Found user by email, linking to Auth0 ID: {auth0_id}")
        active_user.auth0_sub = auth0_id
        active_user.save(update_fields=['auth0_sub'])
        return active_user
    
    # Only create new user if no deleted account exists
    logger.info(f"👤 Creating new user for: {email}")
    # ... continue with user creation
```

### 3. Create Auth0 Action to Block Deleted Users

```javascript
// Create this as a Post-Login Action in Auth0 Dashboard

exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://dottapps.com/';
  
  // Check if user is marked as deleted in metadata
  if (event.user.app_metadata && event.user.app_metadata.account_deleted) {
    api.access.deny("This account has been closed. Please contact support for assistance.");
    return;
  }
  
  // Optional: Check with your backend API
  const axios = require('axios');
  try {
    const response = await axios.post(
      'https://your-backend.com/api/auth0/verify-user-active',
      {
        email: event.user.email,
        auth0_sub: event.user.user_id
      },
      {
        headers: {
          'Authorization': `Bearer ${event.secrets.BACKEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 3000
      }
    );
    
    if (response.data.is_deleted) {
      // Update Auth0 metadata
      api.user.setAppMetadata("account_deleted", true);
      api.user.setAppMetadata("deleted_at", new Date().toISOString());
      
      // Deny access
      api.access.deny("This account has been closed.");
      return;
    }
  } catch (error) {
    // Log error but don't block login if API is down
    console.error('Failed to verify user status:', error.message);
  }
  
  // Continue with normal login flow
  if (event.user.app_metadata && event.user.app_metadata.tenant_id) {
    api.idToken.setCustomClaim(`${namespace}tenant_id`, event.user.app_metadata.tenant_id);
    api.accessToken.setCustomClaim(`${namespace}tenant_id`, event.user.app_metadata.tenant_id);
  }
};
```

### 4. Update Account Closure to Sync with Auth0

```python
# File: /backend/pyfactor/custom_auth/auth0_views.py
# Function: close_user_account (lines 410-472)

# ADD Auth0 metadata update:

# After line 449 (user.save()):
# Update Auth0 user metadata
try:
    from custom_auth.auth0_service import update_auth0_user_metadata
    update_auth0_user_metadata(
        user.auth0_sub,
        {
            'account_deleted': True,
            'deleted_at': deletion_log.deleted_at.isoformat(),
            'deletion_reason': reason
        }
    )
    logger.info(f"[Auth0Views] Updated Auth0 metadata for deleted user")
except Exception as e:
    logger.error(f"[Auth0Views] Failed to update Auth0 metadata: {str(e)}")
    # Continue anyway - database deletion is more important
```

### 5. Create Backend Endpoint for Auth0 to Verify Users

```python
# Create new endpoint in auth0_views.py

@csrf_exempt
@api_view(['POST'])
def verify_user_active(request):
    """
    Verify if a user is active (not deleted)
    Used by Auth0 Actions to block deleted users
    """
    try:
        # Verify API key
        api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if api_key != settings.BACKEND_API_KEY:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        
        data = request.data
        email = data.get('email')
        auth0_sub = data.get('auth0_sub')
        
        if not email:
            return JsonResponse({'error': 'Email required'}, status=400)
        
        # Check for deleted users
        deleted_user = User.objects.filter(
            email=email,
            is_deleted=True
        ).first()
        
        if deleted_user:
            return JsonResponse({
                'is_deleted': True,
                'deleted_at': deleted_user.deleted_at.isoformat() if deleted_user.deleted_at else None,
                'message': 'Account is deleted'
            })
        
        return JsonResponse({
            'is_deleted': False,
            'message': 'Account is active'
        })
        
    except Exception as e:
        logger.error(f"[Auth0Views] Error verifying user: {str(e)}")
        return JsonResponse({'error': 'Internal error'}, status=500)
```

### 6. Frontend Updates

```javascript
// File: /src/app/auth/callback/page.js
// Add handling for deleted accounts

// In the catch block of handleCallback (around line 118):
catch (error) {
    console.error('[Auth0Callback] Error during callback:', error);
    
    // Check if it's a deleted account error
    if (error.message && error.message.includes('account has been closed')) {
        setError('This account has been closed. Please contact support for assistance.');
        setTimeout(() => {
            router.push('/account-closed');
        }, 3000);
        return;
    }
    
    setError(error.message || 'Authentication failed');
    setIsLoading(false);
    
    setTimeout(() => {
        router.push('/auth/email-signin?error=auth_failed');
    }, 3000);
}
```

## Testing the Fixes

1. **Test Immediate Block**: 
   - Close an account
   - Try to sign in immediately → Should be blocked

2. **Test Google OAuth Block**:
   - Close a Google OAuth account
   - Try to sign in with Google → Should be blocked

3. **Test Grace Period**:
   - Close an account
   - Check that reactivation is possible within 30 days
   - Check that after 30 days, account cannot be reactivated

4. **Test New Account Prevention**:
   - Close an account
   - Try to create new account with same email → Should be blocked

5. **Test Auth0 Sync**:
   - Close an account
   - Check Auth0 metadata is updated
   - Verify Auth0 Action blocks login