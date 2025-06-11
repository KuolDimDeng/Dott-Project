# Compliant User Account Deletion Flow

## Overview
This document outlines the GDPR/CCPA compliant approach for user account deletion with proper Auth0 integration.

## Deletion Strategy: Soft Delete + Scheduled Hard Delete

### Phase 1: Immediate Soft Delete (0 days)
When user requests account deletion:

1. **Backend Actions:**
   - Mark user as `is_deleted = True`, `is_active = False`
   - Set `deleted_at = current_timestamp`
   - Create audit log entry
   - Deactivate all sessions
   - Block future logins

2. **Auth0 Actions:**
   - Update user metadata: `{ "account_deleted": true, "deleted_at": "timestamp" }`
   - Block user using Auth0 Action/Rule
   - Revoke all tokens

3. **Frontend Actions:**
   - Clear all local storage
   - Redirect to confirmation page
   - Prevent re-authentication

### Phase 2: Grace Period (1-30 days)
- User can request reactivation via support
- Data remains but inaccessible
- Daily reminder emails (optional)
- Countdown to permanent deletion

### Phase 3: Permanent Deletion (30+ days)
- **Anonymization:** Replace all PII with anonymous values
- **Auth0:** Hard delete user from Auth0
- **Database:** Keep anonymized records for integrity
- **Backups:** Schedule cleanup in backup retention cycle

## Implementation Code Changes

### 1. Backend: Enhanced User Deletion Check

```python
# backend/pyfactor/custom_auth/auth0_views.py

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_auth0_user(request):
    """
    Create or update user from Auth0 data
    CRITICAL: Check for previously deleted accounts
    """
    try:
        data = request.data
        email = data['email']
        auth0_sub = data['auth0_sub']
        
        # Check for deleted accounts FIRST
        deleted_user = User.objects.filter(
            email=email,
            is_deleted=True
        ).first()
        
        if deleted_user:
            # Check if within grace period (30 days)
            if deleted_user.deleted_at:
                days_since_deletion = (datetime.now() - deleted_user.deleted_at).days
                
                if days_since_deletion <= 30:
                    return JsonResponse({
                        'error': 'Account recently deleted',
                        'message': 'This account was closed. Contact support to reactivate.',
                        'account_closed': True,
                        'grace_period': True,
                        'days_remaining': 30 - days_since_deletion
                    }, status=403)
                else:
                    return JsonResponse({
                        'error': 'Account permanently deleted',
                        'message': 'This email was associated with a deleted account.',
                        'account_closed': True,
                        'permanent': True
                    }, status=403)
        
        # Continue with normal user creation/update...
```

### 2. Auth0 Action: Block Deleted Users

```javascript
// Auth0 Action: Post-Login
exports.onExecutePostLogin = async (event, api) => {
  const metadata = event.user.app_metadata || {};
  
  // Check if account is marked as deleted
  if (metadata.account_deleted === true) {
    api.access.deny("This account has been closed. Please contact support if you need assistance.");
    return;
  }
  
  // Check with backend API for deletion status
  try {
    const response = await axios.get(
      `${event.secrets.BACKEND_URL}/api/auth0/check-user-status/${event.user.user_id}`,
      {
        headers: {
          'Authorization': `Bearer ${event.secrets.BACKEND_API_KEY}`
        }
      }
    );
    
    if (response.data.is_deleted) {
      // Update Auth0 metadata
      api.user.setAppMetadata("account_deleted", true);
      api.user.setAppMetadata("deleted_at", response.data.deleted_at);
      
      // Deny access
      api.access.deny("This account has been closed.");
      return;
    }
  } catch (error) {
    console.error('Failed to check user status:', error);
  }
};
```

### 3. Frontend: Handle Deleted Account Response

```javascript
// src/utils/authFlowHandler.v3.js

export async function handlePostAuthFlow(authData, authMethod = 'oauth') {
  try {
    const response = await fetch('/api/user/create-auth0-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.accessToken}`
      },
      body: JSON.stringify({
        auth0_sub: authData.user.sub,
        email: authData.user.email,
        name: authData.user.name,
        picture: authData.user.picture,
        email_verified: authData.user.email_verified
      })
    });
    
    const data = await response.json();
    
    // Check for deleted account
    if (response.status === 403 && data.account_closed) {
      // Clear all auth data
      await clearAuthData();
      
      // Redirect based on deletion status
      if (data.grace_period) {
        window.location.href = `/account-deleted?grace=${data.days_remaining}`;
      } else {
        window.location.href = '/account-permanently-deleted';
      }
      return null;
    }
    
    // Continue normal flow...
  } catch (error) {
    console.error('Auth flow error:', error);
    throw error;
  }
}
```

### 4. Scheduled Cleanup Job

```python
# backend/pyfactor/custom_auth/tasks.py
from celery import shared_task
from datetime import datetime, timedelta
from .models import User, AccountDeletionLog
import requests

@shared_task
def cleanup_deleted_accounts():
    """
    Permanently delete accounts after grace period
    Runs daily at 2 AM
    """
    cutoff_date = datetime.now() - timedelta(days=30)
    
    # Find accounts ready for permanent deletion
    users_to_purge = User.objects.filter(
        is_deleted=True,
        deleted_at__lte=cutoff_date,
        permanently_deleted=False
    )
    
    for user in users_to_purge:
        try:
            # 1. Delete from Auth0
            delete_from_auth0(user.auth0_sub)
            
            # 2. Anonymize user data
            user.email = f"deleted_{user.id}@anonymous.local"
            user.first_name = "Deleted"
            user.last_name = "User"
            user.phone = None
            user.picture = None
            
            # 3. Mark as permanently deleted
            user.permanently_deleted = True
            user.save()
            
            # 4. Log the permanent deletion
            AccountDeletionLog.objects.create(
                user_id=user.id,
                deletion_type='permanent',
                deleted_at=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Failed to permanently delete user {user.id}: {str(e)}")

def delete_from_auth0(auth0_sub):
    """Delete user from Auth0"""
    # Get management token
    token = get_auth0_management_token()
    
    # Delete user
    response = requests.delete(
        f"https://{settings.AUTH0_DOMAIN}/api/v2/users/{auth0_sub}",
        headers={'Authorization': f'Bearer {token}'}
    )
    
    if response.status_code != 204:
        raise Exception(f"Auth0 deletion failed: {response.text}")
```

## Database Schema Updates

```sql
-- Add fields to track deletion status
ALTER TABLE custom_auth_user 
ADD COLUMN deletion_requested_at TIMESTAMP NULL,
ADD COLUMN deletion_scheduled_for TIMESTAMP NULL,
ADD COLUMN permanently_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN deletion_method VARCHAR(50) DEFAULT 'user_request';

-- Create deletion tracking table
CREATE TABLE user_deletion_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL,
    email_hash VARCHAR(255) NOT NULL, -- Store hashed email for duplicate prevention
    deletion_requested_at TIMESTAMP NOT NULL,
    grace_period_ends_at TIMESTAMP NOT NULL,
    permanently_deleted_at TIMESTAMP NULL,
    reactivated_at TIMESTAMP NULL,
    deletion_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_hash ON user_deletion_tracking(email_hash);
CREATE INDEX idx_grace_period_ends ON user_deletion_tracking(grace_period_ends_at);
```

## Compliance Checklist

- [ ] User can request deletion easily
- [ ] Deletion request logged with timestamp
- [ ] Account blocked immediately
- [ ] Auth0 updated to prevent login
- [ ] Grace period implemented (30 days)
- [ ] Reactivation process documented
- [ ] Permanent deletion automated
- [ ] Audit trail maintained
- [ ] All systems notified of deletion
- [ ] Backups handled appropriately

## Testing Checklist

- [ ] User can delete account
- [ ] Deleted user cannot sign in
- [ ] Google OAuth blocked for deleted accounts
- [ ] Email/password login blocked
- [ ] Grace period countdown works
- [ ] Permanent deletion executes after 30 days
- [ ] Auth0 user removed successfully
- [ ] No new account with same email during grace period
- [ ] Audit logs created properly
- [ ] All user data anonymized