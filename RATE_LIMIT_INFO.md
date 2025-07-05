# Auth0 Rate Limiting Information

## Current Issue
You're experiencing: **"Too many authentication attempts. Please try again later."**

This is Auth0's built-in brute force protection that triggers after multiple failed login attempts.

## Wait Time
- **Default**: 15 minutes (900 seconds)
- The exact time depends on Auth0's progressive delays

## How to Reset Rate Limits

### Option 1: Wait it out
Simply wait 15 minutes and try again with the correct password.

### Option 2: Reset in Auth0 Dashboard (Admin Only)
1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to **Security → Attack Protection**
3. Click on **Brute Force Protection**
4. Find the blocked IP or user
5. Click **Unblock** to immediately reset

### Option 3: Use Different Network
- Try from a different IP (mobile hotspot, VPN, etc.)
- Rate limits are per IP address

## Prevention Tips
1. Use correct credentials
2. Enable "Remember Me" to reduce login frequency
3. Use password manager to avoid typos
4. Consider enabling MFA for better security

## For Developers
The frontend now properly handles 429 status codes and shows user-friendly messages with retry times.