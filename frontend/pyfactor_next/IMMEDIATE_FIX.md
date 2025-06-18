# Immediate Fix for Login Issue

## The Problem
Your session cookies have conflicting states:
- Frontend cookies: `needsOnboarding: true`
- Backend: `onboarding_completed: true`
- Result: Can't access dashboard after login

## Quick Fix (Do This Now)

### Option 1: Browser Console (Fastest)
```javascript
// 1. Open browser console (F12)
// 2. Paste and run this:

// Clear ALL cookies
document.cookie.split(";").forEach(c => {
  const name = c.trim().split("=")[0];
  if (name) {
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.dottapps.com";
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  }
});

// Force session sync
fetch('/api/auth/fix-session', { 
  method: 'POST',
  credentials: 'include' 
}).then(r => r.json()).then(data => {
  console.log('Session fixed:', data);
  if (data.fixed) {
    window.location.href = `/${data.newStatus.tenantId}/dashboard`;
  }
});
```

### Option 2: Clear Browser Data
1. Press `Cmd+Shift+Delete` (Mac) or `Ctrl+Shift+Delete` (Windows)
2. Select "Cookies and other site data"
3. Clear data for dottapps.com
4. Try logging in again

### Option 3: Use New Session Endpoint
```javascript
// If fix-session doesn't work, try:
fetch('/api/auth/session-v2').then(r => r.json()).then(console.log);
```

## After the Fix

You should:
1. Be able to login without redirect loops
2. Land on your tenant-specific dashboard
3. See only one cookie (`sid`) instead of 15+

## Deploy Order

1. **Deploy these frontend changes first**
2. **Clear your browser cookies**
3. **Login again**
4. **The new system will auto-migrate your session**

The new server-side session management prevents this issue from happening again!