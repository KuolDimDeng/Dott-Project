# Fix for Session Onboarding Status Not Syncing

## Problem

The issue occurs when existing sessions have `needs_onboarding=true` even though the user has completed onboarding. This happens because:

1. The session was created before the sync mechanism was implemented
2. The signal handler only works for NEW sessions, not existing ones
3. The session table stores its own copy of onboarding status that can get out of sync with OnboardingProgress

## Solution

We've implemented a three-part fix:

### 1. Fixed Signal Handler (Automatic for New Sessions)

Fixed the `session_manager/signals.py` to properly sync new sessions with OnboardingProgress:
- Corrected model name from `Session` to `UserSession`
- Signal now fires when new sessions are created
- Automatically syncs `needs_onboarding`, `onboarding_completed`, and `onboarding_step`

### 2. Runtime Sync in Session View

Updated `SessionDetailView.get()` to check and sync on every request:
- When fetching session details, if `needs_onboarding=true`, it checks OnboardingProgress
- If OnboardingProgress shows `complete` but session doesn't, it updates the session
- This provides automatic healing for out-of-sync sessions

### 3. Management Command for Bulk Fix

Created `sync_session_onboarding` management command for fixing existing sessions:

```bash
# Fix all active sessions
python manage.py sync_session_onboarding

# Fix specific user's sessions
python manage.py sync_session_onboarding --user admin@dottapps.com

# Preview changes without applying
python manage.py sync_session_onboarding --dry-run

# Fix all sessions (including inactive)
python manage.py sync_session_onboarding --active-only=false
```

## Quick Fix for admin@dottapps.com

Run this script on the backend:

```bash
python manage.py shell < scripts/fix_admin_session_onboarding.py
```

## Frontend Cache Clear

If the frontend is still showing old data, clear the session cache:

```bash
# Via API endpoint
curl -X POST https://dottapps.com/api/auth/clear-cache

# Or in browser console
await fetch('/api/auth/clear-cache', { method: 'POST' });
```

## How It Works

1. **OnboardingProgress** is the source of truth for onboarding status
2. **UserSession** stores a copy for performance but can get out of sync
3. The sync mechanism ensures:
   - New sessions are synced on creation (via signal)
   - Existing sessions are synced on access (via view)
   - Bulk sync is available via management command

## Verification

After running the fix:

1. Check backend session:
   ```
   GET /api/sessions/current/
   ```
   Should show `needs_onboarding: false`

2. Check user session endpoint:
   ```
   GET /api/users/me/session/
   ```
   Should show `needs_onboarding: false`

3. Clear frontend cache and reload the page

## Prevention

To prevent this in the future:
1. Always update OnboardingProgress when onboarding status changes
2. The signal handler will automatically sync new sessions
3. The runtime sync in SessionDetailView provides a safety net
4. Run the sync command periodically or after major changes