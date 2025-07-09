# Timezone Migration Guide for Existing Users

## Overview
This guide explains how to migrate existing users to have proper timezone support after implementing Phase 1 Global Timezone Support.

## Migration Strategy

### 1. Database Migration (Backend)
```bash
# Apply the database migration
python manage.py migrate

# This adds the timezone column with default='UTC' and null=True
# Existing users will have timezone=NULL initially
```

### 2. Bulk Migration Command (Backend)
```bash
# Run the migration command to set all existing users to UTC
python manage.py migrate_user_timezones --dry-run  # Test first
python manage.py migrate_user_timezones           # Apply changes

# This sets all NULL timezone users to 'UTC'
```

### 3. Runtime Auto-Detection (Frontend)
The frontend automatically handles timezone detection for existing users:

- **When user opens calendar**: Detects their timezone and saves it
- **When user logs in**: Session middleware can detect timezone
- **Seamless experience**: No user action required

## Implementation Details

### Backend Changes
1. **User Model**: Added `timezone` field with UTC default
2. **Migration Command**: `migrate_user_timezones.py` for bulk updates
3. **API Endpoints**: `/api/user/timezone` for timezone management

### Frontend Changes
1. **Auto-Detection**: Calendar component detects and saves timezone
2. **Session Integration**: Timezone loaded from backend on login
3. **UI Updates**: Timezone displayed in calendar header

## Migration Flow

### For New Users (Post-Migration)
1. User signs up → Timezone auto-detected during onboarding
2. Timezone saved to database
3. All features work with proper timezone

### For Existing Users (Pre-Migration)
1. User logs in → `timezone = NULL` in database
2. User opens calendar → Frontend detects timezone
3. Frontend saves detected timezone to backend
4. All future sessions use correct timezone

## Verification Steps

### 1. Check Database
```sql
-- Check users without timezone
SELECT email, timezone FROM custom_auth_user WHERE timezone IS NULL;

-- Check timezone distribution
SELECT timezone, COUNT(*) FROM custom_auth_user GROUP BY timezone;
```

### 2. Test Frontend
1. Login as existing user
2. Open calendar
3. Check console logs: "Auto-detected timezone saved"
4. Verify timezone shown in calendar header

### 3. Verify Backend
```bash
# Check migration command
python manage.py migrate_user_timezones --dry-run

# Check logs
tail -f logs/django.log | grep timezone
```

## Rollback Plan

### If Issues Occur
1. **Database Rollback**: Remove timezone column
```bash
# Create reverse migration if needed
python manage.py migrate users 0008  # Previous migration
```

2. **Frontend Rollback**: Revert timezone detection code
3. **Backend Rollback**: Remove timezone handling from onboarding

## Production Deployment

### 1. Deploy Backend
```bash
# Apply migration
python manage.py migrate

# Run migration command
python manage.py migrate_user_timezones
```

### 2. Deploy Frontend
- Auto-detection works immediately
- No user action required
- Graceful fallback to UTC

### 3. Monitor
- Check logs for timezone detection
- Verify user experience
- Monitor error rates

## Benefits for Existing Users

1. **Seamless Migration**: No user action required
2. **Correct Timezone**: Dates/times display properly
3. **Better UX**: No more date shifting issues
4. **Global Ready**: Works for international users

## Support

### Common Issues
1. **Timezone Detection Fails**: Falls back to UTC
2. **Invalid Timezone**: Validation prevents bad data
3. **Migration Errors**: Rollback plan available

### Monitoring
```bash
# Check migration progress
python manage.py migrate_user_timezones --dry-run

# Monitor logs
grep "timezone" logs/django.log

# Check user feedback
# Users should see "All times in [Their Timezone]"
```

## Timeline

1. **Phase 1 (Now)**: Auto-detection and saving
2. **Phase 2 (Future)**: User timezone selection in settings
3. **Phase 3 (Future)**: Advanced timezone features

This migration ensures all existing users get proper timezone support without any manual intervention required!