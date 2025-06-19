# Enhanced Security Deployment Guide

## Overview
This guide covers the deployment of enhanced security features for the session management system, including device fingerprinting, risk scoring, device trust, and session heartbeat monitoring.

## Features Implemented

### 1. Device Fingerprinting
- Collects 15+ browser characteristics
- Creates unique device identifiers
- Tracks device usage patterns

### 2. Risk Scoring System
- Calculates risk score (0-100) based on:
  - New device detection
  - Location changes
  - Unusual activity patterns
  - Multiple failed login attempts

### 3. Device Trust Management
- Email verification for new devices
- 6-digit verification codes
- 30-day trust duration
- Maximum 5 devices per user

### 4. Session Heartbeat
- 60-second interval monitoring
- Automatic session cleanup
- Activity tracking

## Deployment Steps

### Step 1: Deploy Backend Code
The backend code has already been deployed to Render. The changes include:
- New security models in `session_manager/security_models.py`
- Security service in `session_manager/security_service.py`
- Security middleware in `session_manager/middleware.py`
- Updated settings with security configurations

### Step 2: Run Database Migrations
SSH into your Render backend service and run:

```bash
# Connect to Render shell
# In Render dashboard: dott-api > Shell

# Run the migration
python manage.py migrate session_manager

# Expected output:
# Applying session_manager.0002_enhanced_security... OK
```

### Step 3: Verify Migration Success
Run the verification script:

```bash
python scripts/verify_enhanced_security.py
```

This will check:
- ✅ Migration was applied
- ✅ Security tables exist
- ✅ Settings are configured
- ✅ Middleware is installed

### Step 4: Frontend is Ready
The frontend security features have been enabled:
- ✅ Device fingerprinting utility
- ✅ Session heartbeat monitoring
- ✅ Secure authentication hooks
- ✅ Enhanced error handling

### Step 5: Test Security Features

1. **Test Device Fingerprinting**:
   - Sign in from a new browser
   - Check that device is detected
   - Verify risk score is calculated

2. **Test Device Trust**:
   - Sign in from new device
   - Should receive verification email
   - Enter 6-digit code to trust device

3. **Test Session Heartbeat**:
   - Sign in and stay on a page
   - Check network tab for heartbeat calls every 60 seconds
   - Verify session stays active

4. **Test Risk Scoring**:
   - Try multiple failed logins
   - Sign in from different location (VPN)
   - Check that risk score increases

## Monitoring

### Check Security Logs
```bash
# On Render shell
python manage.py shell

from session_manager.models import DeviceFingerprint, SessionSecurity
from django.contrib.auth import get_user_model

User = get_user_model()

# Check recent device fingerprints
DeviceFingerprint.objects.order_by('-created_at')[:5]

# Check high-risk sessions
SessionSecurity.objects.filter(risk_score__gte=70).order_by('-last_activity')[:5]

# Check trusted devices for a user
user = User.objects.get(email='user@example.com')
user.trusted_devices.filter(is_verified=True)
```

### Security Metrics to Monitor
1. **Device Fingerprints**: New devices per day
2. **Risk Scores**: Distribution and high-risk sessions
3. **Trust Verifications**: Success rate
4. **Session Heartbeats**: Active session count

## Troubleshooting

### Migration Fails
If migration fails with "table already exists":
```bash
# Check existing tables
python manage.py dbshell
\dt session_manager_*

# If tables exist, fake the migration
python manage.py migrate session_manager --fake
```

### Settings Not Loading
Ensure these are in your Render environment variables:
- `SESSION_SECURITY_ENABLE_DEVICE_FINGERPRINTING=true`
- `SESSION_SECURITY_ENABLE_RISK_SCORING=true`
- `SESSION_SECURITY_ENABLE_DEVICE_TRUST=true`
- `SESSION_SECURITY_ENABLE_HEARTBEAT=true`

### Frontend Not Sending Fingerprints
Check browser console for errors. Ensure:
- Cookies are enabled
- JavaScript is enabled
- No ad blockers interfering

## Security Best Practices

1. **Regular Monitoring**: Check high-risk sessions daily
2. **Device Cleanup**: Remove old trusted devices monthly
3. **Risk Threshold Tuning**: Adjust based on false positive rate
4. **Email Verification**: Ensure email service is reliable

## Next Steps

1. Run the migration on Render (Step 2)
2. Verify with the script (Step 3)
3. Test all features (Step 5)
4. Set up monitoring alerts
5. Document any custom risk rules

## Support

For issues:
1. Check `/scripts/verify_enhanced_security.py` output
2. Review logs in Render dashboard
3. Check browser console for frontend errors

---

**Status**: Ready for deployment
**Last Updated**: 2025-01-19
**Version**: 1.0