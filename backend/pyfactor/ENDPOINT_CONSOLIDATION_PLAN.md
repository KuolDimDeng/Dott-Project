# Authentication Endpoint Consolidation Plan

## Overview
We have identified significant redundancy in our authentication endpoints. This plan outlines which endpoints to keep and which to remove to simplify our API surface.

## Summary Statistics
- **Endpoints to Remove**: 35
- **Endpoints to Keep**: 9
- **Reduction**: ~80% of authentication endpoints

## Consolidation Groups

### 1. Session Management
**Keep:**
- `/api/auth/session-v2` - Primary session endpoint (GET/POST/DELETE)
- `/api/sessions/security/*` - Security features (device trust, alerts, etc.)

**Remove (12 endpoints):**
- `/api/sessions/create/` - Use POST /api/auth/session-v2
- `/api/sessions/current/` - Use GET /api/auth/session-v2
- `/api/sessions/refresh/` - Use POST /api/auth/session-v2
- `/api/sessions/` - Use /api/auth/session-v2
- `/api/sessions/active/` - Use /api/auth/session-v2
- `/api/session/` - Use /api/auth/session-v2
- `/api/auth/session/` - Use /api/auth/session-v2
- `/api/auth/update-session/` - Not needed with v2
- `/api/auth/verify-session/` - Use GET /api/auth/session-v2
- `/api/auth/sync-session/` - Not needed with v2
- `/api/auth/clear-cache/` - Not needed with v2
- `/api/onboarding/session/update/` - Use POST /api/auth/session-v2

### 2. User Profile
**Keep:**
- `/api/auth/profile` - Unified profile endpoint

**Remove (6 endpoints):**
- `/api/users/me/` - Use /api/auth/profile
- `/api/users/me/session/` - Use /api/auth/profile
- `/api/auth/user-profile/` - Use /api/auth/profile
- `/api/user/profile/` - Use /api/auth/profile
- `/api/profile/` - Use /api/auth/profile (frontend heavily uses this)
- `/api/unified-profile/` - Use /api/auth/profile

### 3. Authentication/Login
**Keep:**
- `/api/auth/login` - Primary login endpoint
- `/api/auth/signup` - Primary signup endpoint
- `/api/auth/token/refresh/` - Token refresh

**Remove (6 endpoints):**
- `/api/auth/register/` - Use /api/auth/signup
- `/auth/register/` - Use /api/auth/signup
- `/auth/signup/` - Use /api/auth/signup
- `/api/auth/token/` - Use /api/auth/login
- `/api/auth/auth-token/` - Use /api/auth/login
- `/api/auth/verify-credentials/` - Use /api/auth/login

### 4. Onboarding Completion
**Keep:**
- `/api/onboarding/complete-all` - Single completion endpoint

**Remove (6 endpoints):**
- `/api/onboarding/complete/` - Use /api/onboarding/complete-all
- `/api/onboarding/complete-payment/` - Use /api/onboarding/complete-all
- `/api/onboarding/api/onboarding/complete-all/` - Duplicate path
- `/api/auth0/complete-onboarding/` - Use /api/onboarding/complete-all
- `/api/users/update-onboarding-status/` - Use /api/onboarding/complete-all
- `/force-complete/` - Debug endpoint, remove

### 5. Tenant Management
**Keep:**
- `/api/tenants/current` - Get current tenant
- `/api/tenants/{id}` - Get specific tenant
- `/api/tenants/verify` - Verify ownership

**Remove (6 endpoints):**
- `/api/tenants/exists/` - Use /api/tenants/{id}
- `/api/tenants/validate/` - Use /api/tenants/verify
- `/api/tenants/by-email/{email}/` - Use /api/tenants/current
- `/api/auth/verify-tenant/` - Use /api/tenants/verify
- `/api/tenants/verify-owner/` - Use /api/tenants/verify
- `/api/tenants/{id}/verify-owner/` - Use /api/tenants/verify

## Implementation Steps

### Phase 1: Immediate Actions (Week 1)
1. **Create unified /api/auth/profile endpoint** that combines all profile data
2. **Update session-v2 endpoint** to handle all session operations
3. **Add deprecation decorator** to all endpoints marked for removal
4. **Update critical frontend code**:
   - EstimateForm.js, CustomerDetails.js (uses /api/profile/)
   - useSecureAuth.js (uses /api/sessions/create/)

### Phase 2: Frontend Migration (Week 2)
1. Update all frontend API calls to use new endpoints
2. Test all authentication flows thoroughly
3. Monitor deprecation logs

### Phase 3: Backend Cleanup (Week 3-4)
1. Remove deprecated endpoints from URL configuration
2. Delete associated view classes
3. Update API documentation
4. Clean up test files

## Frontend Files That Need Updates

### High Priority (Used frequently):
- `/src/app/dashboard/components/forms/EstimateForm.js` - Update /api/profile/
- `/src/app/dashboard/components/forms/CustomerDetails.js` - Update /api/profile/
- `/src/hooks/useSecureAuth.js` - Update /api/sessions/create/
- `/src/services/userService.js` - Update /api/user/profile/

### Medium Priority:
- `/src/config/index.js` - Update /api/onboarding/complete/
- `/src/app/api/test/backend-auth/route.js` - Update test endpoints

## Deprecation Header Format
All deprecated endpoints will return these headers:
```
X-Deprecated: true
X-Deprecated-Since: 2025-01-23
X-Deprecated-Removal: 2025-02-01
X-Replacement-Endpoint: /api/auth/session-v2
```

## Benefits of Consolidation
1. **Reduced Complexity**: From ~45 auth endpoints to ~9
2. **Better Security**: Fewer endpoints to secure and monitor
3. **Easier Maintenance**: Single source of truth for each operation
4. **Clearer Documentation**: No confusion about which endpoint to use
5. **Performance**: Fewer endpoints to load and route

## Notes
- The session-v2 system is already the most complete implementation
- Frontend heavily uses /api/profile/ (13+ files) - needs careful migration
- Test endpoints should be removed from production entirely
- Consider versioning strategy (v2 endpoints) for future changes