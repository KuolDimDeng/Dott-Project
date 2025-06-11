# Account Deletion Fix Implementation Plan

## Overview
This plan fixes the critical security issue where deleted users can sign back in and create new accounts with new tenant IDs.

## Implementation Timeline

### Day 1-2: Immediate Security Fixes ✅
**Status**: Code changes complete

1. **Backend Changes** ✅
   - Updated `auth0_views.py` to check for deleted accounts before creating users
   - Added comprehensive deletion status checks with grace period support

2. **Frontend Changes** ✅
   - Created `authFlowHandler.v3.js` with deletion checks
   - Updated auth callback to use new handler
   - Created account closed pages for user feedback

3. **Auth0 Service** ✅
   - Created `auth0_service.py` for Auth0 Management API integration
   - Updated account closure to sync with Auth0 metadata

### Day 3: Database Updates
**Status**: Ready to execute

Run these SQL migrations:
```bash
# SSH into your database server or use Django's dbshell
python manage.py dbshell < backend/pyfactor/custom_auth/migrations/add_deletion_tracking.sql
```

### Day 4: Configure Scheduled Tasks
**Status**: Code complete, needs deployment

Add to Django settings.py:
```python
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'cleanup-deleted-accounts': {
        'task': 'custom_auth.tasks.cleanup_deleted_accounts',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
    'check-account-recreations': {
        'task': 'custom_auth.tasks.check_deleted_account_recreation_attempts',
        'schedule': crontab(minute=0),  # Every hour
    },
}
```

### Day 5: Auth0 Configuration
**Status**: Needs to be done in Auth0 Dashboard

1. **Create Post-Login Action**:
   - Go to Auth0 Dashboard > Actions > Flows > Login
   - Create new Action with this code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://dottapps.com/';
  
  // Check if user is marked as deleted
  if (event.user.app_metadata && event.user.app_metadata.account_deleted) {
    api.access.deny("This account has been closed. Please contact support for assistance.");
    return;
  }
  
  // Add tenant_id to tokens if available
  if (event.user.app_metadata && event.user.app_metadata.tenant_id) {
    api.idToken.setCustomClaim(`${namespace}tenant_id`, event.user.app_metadata.tenant_id);
    api.accessToken.setCustomClaim(`${namespace}tenant_id`, event.user.app_metadata.tenant_id);
  }
};
```

2. **Add Environment Variables**:
   - Add `BACKEND_API_KEY` secret in Action secrets
   - Add `BACKEND_URL` as your API URL

### Day 6: Testing Checklist

1. **Test Immediate Block**:
   ```bash
   # Close an account
   # Try to sign in immediately
   # Should see "Account Closed" page
   ```

2. **Test Google OAuth Block**:
   ```bash
   # Close a Google OAuth account
   # Try Google Sign In
   # Should see "Account Closed" page
   ```

3. **Test Email Recreation Block**:
   ```bash
   # Close an account
   # Try to create new account with same email
   # Should see "Account Closed" page
   ```

4. **Test Grace Period**:
   ```bash
   # Check grace period message shows days remaining
   # Verify reactivation instructions are clear
   ```

## Deployment Steps

### 1. Deploy Backend Changes
```bash
# Commit and push changes
git add .
git commit -m "Fix: Prevent deleted users from creating new accounts"
git push origin main

# Run migrations on production
python manage.py migrate
python manage.py dbshell < backend/pyfactor/custom_auth/migrations/add_deletion_tracking.sql
```

### 2. Deploy Frontend Changes
```bash
# The frontend will auto-deploy with Vercel on push
# Monitor build at: https://vercel.com/your-project
```

### 3. Configure Production Environment

Add these environment variables:
- `AUTH0_CLIENT_SECRET` (for Auth0 Management API)
- `BACKEND_API_KEY` (for secure backend communication)

### 4. Start Celery Beat (for scheduled tasks)
```bash
celery -A pyfactor beat -l info
```

## Monitoring

### Check Logs
```bash
# Backend logs for deletion attempts
tail -f logs/auth.log | grep "Blocked"

# Check Celery task execution
tail -f logs/celery.log | grep "CleanupTask"
```

### Database Queries
```sql
-- Check deleted users
SELECT email, deleted_at, permanently_deleted 
FROM custom_auth_user 
WHERE is_deleted = TRUE;

-- Check deletion tracking
SELECT * FROM user_deletion_tracking;

-- Check account deletion logs
SELECT * FROM custom_auth_accountdeletionlog 
ORDER BY deleted_at DESC;
```

## Rollback Plan

If issues occur:

1. **Disable Auth0 Action** (immediate effect)
2. **Revert backend code**:
   ```bash
   git revert HEAD
   git push origin main
   ```
3. **Keep database changes** (they don't affect existing functionality)

## Success Criteria

- [ ] Deleted users cannot sign in
- [ ] Deleted emails cannot create new accounts
- [ ] Grace period messaging works
- [ ] Auth0 blocks deleted users
- [ ] Scheduled cleanup runs successfully
- [ ] No new tenant IDs for deleted users

## Long-term Improvements

1. **Add email notifications** for deletion confirmations
2. **Implement data export** before deletion (GDPR)
3. **Add admin dashboard** for managing deletions
4. **Create API endpoint** for Auth0 to verify users
5. **Add metrics** for deletion/reactivation rates