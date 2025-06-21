# Backend Single Source of Truth - Implementation Guide

**Date**: 2025-06-21  
**Status**: IMPLEMENTED & BUG FIXED  
**Priority**: CRITICAL for system stability  
**Last Updated**: 2025-06-21 (Onboarding redirect loop bug fix)
**Git Commit**: 6b0c0ee8

## Overview

This document outlines the **Backend Single Source of Truth** pattern implemented across the frontend codebase to eliminate redirect loops, data conflicts, and inconsistent user state management.

## Problem Statement

Previously, the frontend checked onboarding status from multiple sources:
- Backend API responses
- Cookie values (`onboarding_just_completed`, `onboardingCompleted`, `user_tenant_id`)
- localStorage items (`subscription_completed`, `onboardingCompleted`)
- URL parameters
- AppCache storage
- Session storage

This caused:
- **Redirect loops** between dashboard and onboarding pages
- **Data conflicts** where frontend assumed having a tenant meant onboarding was complete
- **Complex debugging** due to multiple conflicting sources
- **Performance issues** from redundant checks and state management

## Solution: Backend Single Source of Truth

### Core Principle

**The backend's `user.onboarding_completed` field is the ONLY source of truth for onboarding status.**

All frontend code MUST:
1. ✅ Only check backend API responses for onboarding status
2. ✅ Trust backend's `needsOnboarding` and `onboardingCompleted` fields
3. ❌ Never override backend status with local data
4. ❌ Never assume tenant existence means onboarding is complete
5. ❌ Never use localStorage, cookies, or other local storage for onboarding status

### Implementation Details

#### 1. Session Management (`/api/auth/session-v2/route.js`)
```javascript
// ✅ CORRECT: Only use backend data
needsOnboarding: profileData?.needs_onboarding ?? sessionData.needs_onboarding ?? true,
onboardingCompleted: profileData?.onboarding_completed ?? sessionData.onboarding_completed ?? false,

// ❌ WRONG: Don't override with local data
// if (tenantId && !needsOnboarding) { ... }
```

#### 2. Onboarding Redirect Logic
```javascript
// ✅ CORRECT: Only check backend field
if (session.user?.needsOnboarding === false) {
  router.push(`/${tenantId}/dashboard`);
}

// ❌ WRONG: Don't check tenant existence
// if (session.user?.tenantId) { ... }
```

#### 3. Dashboard Access Control
```javascript
// ✅ CORRECT: Trust backend
if (profileData.needsOnboarding === true) {
  router.push('/onboarding');
  return;
}

// ❌ WRONG: Complex multi-source checking
// if (needsOnboarding && !cookies.get('onboarding_completed')) { ... }
```

#### 4. Profile API (`/api/auth/profile/route.js`)
```javascript
// ✅ CORRECT: Only return backend data
return NextResponse.json({
  needsOnboarding: profileData?.needs_onboarding ?? sessionData.needs_onboarding ?? true,
  onboardingCompleted: profileData?.onboarding_completed ?? sessionData.onboarding_completed ?? false,
  // ... other backend fields
});

// ❌ WRONG: Don't combine with local overrides
// needsOnboarding: hasLocalOverride ? false : backendData.needs_onboarding
```

## Files Modified

### Simplified Files
1. **Middleware** (`/src/middleware.js`)
   - Removed override logic that bypassed session checks
   - Only checks `sid` and `session_token` cookies

2. **Profile API** (`/src/app/api/auth/profile/route.js`)
   - Reduced from 568 lines to 158 lines
   - Removed complex multi-source checking
   - Only fetches from backend endpoints

3. **Dashboard Page** (`/src/app/[tenantId]/dashboard/page.js`)
   - Removed emergency access and recovery logic
   - Simplified onboarding check to single backend field

4. **Auth Flow Handler** (`/src/utils/authFlowHandler.v3.js`)
   - Only checks `data.needs_onboarding` from backend
   - Removed tenant-based assumptions

5. **Auth Callback** (`/src/app/auth/callback/page.js`)
   - Removed logic that overrode backend status
   - Trusts backend's onboarding status only

6. **Onboarding Page** (`/src/app/onboarding/page.js`)
   - Only checks `needsOnboarding` field, not tenant existence

7. **Complete Onboarding Utility** (`/src/utils/completeOnboardingAuth0.js`)
   - Removed localStorage storage and complex syncing
   - Only calls backend API

8. **Subscription Form** (`/src/components/Onboarding/SubscriptionForm.jsx`)
   - Removed `useOnboardingProgress` hook dependency
   - Lets backend handle all progress updates

### Deleted Files
1. **`/src/hooks/useOnboardingProgress.js`**
   - Complex hook with AppCache logic
   - No longer needed with backend-only approach

### Fixed Files (2025-06-21)
1. **`/src/components/Onboarding/SubscriptionForm.jsx`**
   - Removed 243 lines of AppCache/localStorage logic
   - Now calls `/api/onboarding/complete-all` for all plans
   - Eliminated Cognito attribute updates
   - Fixed free plan flow to properly call backend

2. **`/src/app/onboarding/payment/page.js`**
   - Unified to use `/api/onboarding/complete-all` endpoint
   - Added payment verification flags
   - Consistent with subscription form behavior

3. **`/src/app/api/onboarding/complete-payment/route.js`**
   - Marked as deprecated
   - All completion flows now use unified endpoint

## Backend Requirements

For this pattern to work, the backend MUST:

1. **Maintain accurate `onboarding_completed` field** in User model
2. **Update field immediately** when onboarding is completed
3. **Return consistent data** in all session/profile endpoints
4. **Handle all progress tracking** server-side

## Testing Checklist

When making changes to onboarding logic, verify:

- [ ] New users are redirected to onboarding
- [ ] Users with `onboarding_completed=true` access dashboard
- [ ] Users with `onboarding_completed=false` are redirected to onboarding
- [ ] No redirect loops between dashboard and onboarding
- [ ] Browser cache clear doesn't affect onboarding status
- [ ] No localStorage or cookie checks for onboarding status

## Development Guidelines

### ✅ DO
- Always fetch onboarding status from backend APIs
- Trust backend's `needsOnboarding` and `onboardingCompleted` fields
- Use simple boolean checks: `if (user.needsOnboarding === true)`
- Make backend API calls to update onboarding status

### ❌ DON'T
- Check localStorage, cookies, or sessionStorage for onboarding status
- Assume tenant existence means onboarding is complete
- Combine multiple sources with complex boolean logic
- Override backend status with local data
- Use emergency access or fallback patterns for onboarding

## Migration Guide

If you find code that violates this pattern:

1. **Identify the violation**: Multiple source checking, local overrides, tenant-based assumptions
2. **Simplify to backend only**: Remove local checks, trust backend API
3. **Test thoroughly**: Verify no redirect loops or state conflicts
4. **Document changes**: Update this guide if patterns evolve

## Benefits Achieved

- ✅ **Eliminated redirect loops** between dashboard and onboarding
- ✅ **Consistent user state** across all components
- ✅ **Simplified debugging** with single data source
- ✅ **Better performance** with fewer redundant checks
- ✅ **Easier maintenance** with clear data flow
- ✅ **Reliable onboarding flow** that works after cache clears

## Monitoring

Watch for these antipatterns in code reviews:
- `localStorage.getItem('onboarding*')`
- `cookies.get('onboarding*')`
- `if (tenantId && !needsOnboarding)`
- Complex boolean logic: `condition1 || condition2 || condition3`
- Emergency access or fallback patterns
- Local session overrides

## Onboarding Redirect Loop Bug Fix (2025-06-21)

### Critical Bug Fixed
- **Issue**: New users getting stuck in redirect loop between dashboard and onboarding
- **Root Cause**: `SubscriptionForm.jsx` and payment flow were setting local completion status without calling backend
- **Symptom**: Users had tenant ID but `user.onboarding_completed = False` in database

### Files Fixed
1. **SubscriptionForm.jsx** - Complete overhaul:
   - Removed 243 lines of AppCache/localStorage logic
   - Now calls `/api/onboarding/complete-all` for ALL plans (free and paid)
   - Eliminated local onboarding status tracking

2. **payment/page.js** - Unified endpoint:
   - Changed from `/api/onboarding/complete-payment` to `/api/onboarding/complete-all`
   - Added `paymentVerified: true` flag for paid plans
   - Consistent data structure with subscription form

3. **complete-payment/route.js** - Deprecated:
   - Marked as deprecated with warning comments
   - All flows now use unified completion endpoint

### Code Example - What Was Fixed
```javascript
// OLD (BROKEN) - Free plan flow in SubscriptionForm.jsx
if (plan.id === 'free') {
  // Set local indicators without backend call
  document.cookie = `onboarding_status=complete`;
  appCache.set('onboarding.completed', true);
  localStorage.setItem('onboardingCompleted', 'true');
  
  // Redirect without updating backend database
  window.location.href = `/${tenantId}/dashboard`;
}

// NEW (FIXED) - All plans call backend
if (plan.id === 'free') {
  // Call backend to properly update user.onboarding_completed = True
  const response = await fetch('/api/onboarding/complete-all', {
    method: 'POST',
    body: JSON.stringify({
      subscriptionPlan: plan.id,
      planType: 'free',
      billingCycle: billingCycle
    })
  });
  
  // Backend handles all session updates
  if (response.ok) {
    const result = await response.json();
    window.location.href = `/${result.tenant_id}/dashboard`;
  }
}
```

### Deployment
- **Git Commit**: `6b0c0ee8`
- **Branch**: `Dott_Main_Dev_Deploy`
- **Auto-deployed**: `dott-front` service on Render
- **Status**: Live and fixing the redirect loop issue

## Contact

For questions about this pattern or when adding new onboarding-related features, ensure they follow the Backend Single Source of Truth principle.

---

**Remember**: The backend knows best. Trust it.