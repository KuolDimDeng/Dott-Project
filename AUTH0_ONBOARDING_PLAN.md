# Auth0 User Onboarding Implementation Plan

## Overview
Complete plan to onboard real users using Auth0 for authentication and Django backend for data storage.

## Current State
- ✅ Auth0 integration 40% complete (authentication works)
- ✅ Cognito removed from frontend
- ❌ No users in system yet
- ❌ Backend not integrated with Auth0
- ❌ Onboarding flow uses localStorage (temporary)

## Goal State
- Users can sign up via Auth0
- User data stored in Django backend
- Complete onboarding flow (business info → subscription → payment → dashboard)
- Multi-tenant architecture ready
- Production-ready for first users

## Implementation Phases

### Phase 1: Backend Auth0 Integration (1-2 days)
**Goal**: Django can validate Auth0 tokens and manage users

1. **Install Auth0 Django packages**
   ```bash
   pip install python-jose cryptography django-cors-headers
   ```

2. **Create Auth0 middleware**
   - Validate JWT tokens from Auth0
   - Extract user info from tokens
   - Create/update users in Django

3. **Database migrations**
   - Add Auth0User model
   - Add Tenant model
   - Add UserTenantRole model
   - Run migrations

4. **API Endpoints**
   - GET /api/users/me - Get current user profile
   - POST /api/onboarding/business-info
   - POST /api/onboarding/subscription
   - POST /api/onboarding/complete
   - GET /api/onboarding/status

### Phase 2: Frontend API Integration (1 day)
**Goal**: Frontend uses API instead of localStorage

1. **Update services**
   - Modify onboarding.js to use new API endpoints
   - Update userService.js to fetch from backend
   - Remove localStorage dependencies

2. **Update Auth0 callback**
   - After login, fetch user profile from backend
   - Redirect based on onboarding status

3. **Update components**
   - SignInForm.js - Check backend for user status
   - Onboarding components - Submit to API

### Phase 3: Onboarding Flow (1 day)
**Goal**: Complete user journey from signup to dashboard

1. **User Journey**
   ```
   Auth0 Login → Check User Status → 
   ├─ New User → Business Info → Subscription → Payment? → Setup → Dashboard
   └─ Existing User → Dashboard
   ```

2. **Frontend Routes**
   - /auth/callback - Handle Auth0 return
   - /onboarding/business-info
   - /onboarding/subscription
   - /onboarding/payment (Stripe)
   - /onboarding/setup
   - /tenant/[id]/dashboard

3. **State Management**
   - Use React Context for user/tenant state
   - Persist critical data in backend only

### Phase 4: Multi-tenancy Setup (1 day)
**Goal**: Proper tenant isolation

1. **Schema Creation**
   - Auto-create PostgreSQL schema on tenant creation
   - Run tenant-specific migrations

2. **Middleware**
   - Tenant detection from user session
   - Schema switching for each request

3. **Data Isolation**
   - Ensure queries are tenant-scoped
   - Add tenant_id to all relevant models

### Phase 5: Testing & Launch Prep (1 day)
**Goal**: Ready for first real users

1. **Testing Checklist**
   - [ ] New user can sign up
   - [ ] Complete onboarding flow works
   - [ ] Returning user goes to dashboard
   - [ ] Tenant data is isolated
   - [ ] Subscription plans work
   - [ ] Payment processing (if ready)

2. **Production Checklist**
   - [ ] Environment variables set
   - [ ] Database backed up
   - [ ] Error monitoring enabled
   - [ ] SSL certificates valid
   - [ ] Auth0 production keys

## Technical Decisions

### Why Backend Storage Over localStorage?
1. **Persistence**: Data survives browser clears
2. **Security**: No client-side tampering
3. **Multi-device**: Users can login anywhere
4. **Scalability**: No browser storage limits
5. **Analytics**: Track user behavior server-side

### Database Schema
```
Auth0User
├── auth0_id (from Auth0 'sub')
├── email
├── current_tenant_id
└── created_at

Tenant
├── id (UUID)
├── name
├── subscription_plan
├── schema_name
└── onboarding_completed

UserTenantRole
├── user_id
├── tenant_id
└── role (owner/admin/user)
```

### API Design
All endpoints require Auth0 Bearer token:
```
Authorization: Bearer <auth0_access_token>
```

Response format:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

## Implementation Order

1. **Day 1**: Backend Auth0 integration
   - Auth0 middleware
   - User models
   - Basic API endpoints

2. **Day 2**: Frontend integration
   - Update services to use API
   - Test auth flow

3. **Day 3**: Complete onboarding
   - All onboarding steps
   - Tenant creation

4. **Day 4**: Multi-tenancy
   - Schema isolation
   - Tenant switching

5. **Day 5**: Testing & fixes
   - End-to-end testing
   - Bug fixes
   - Deploy

## Immediate Next Steps

1. **Backend Setup** (Today)
   ```bash
   cd backend
   pip install python-jose cryptography django-cors-headers
   python manage.py makemigrations
   python manage.py migrate
   ```

2. **Create Auth0 Middleware**
   - I'll create this for you next

3. **Update Frontend Services**
   - Replace localStorage with API calls

## Questions to Answer

1. **Subscription/Payment**: 
   - Ready to integrate Stripe now?
   - Or free tier only initially?

2. **Tenant Switching**: 
   - Will users belong to multiple tenants?
   - Or one tenant per user?

3. **Email Verification**: 
   - Require email verification?
   - Auth0 can handle this

4. **User Roles**: 
   - What roles do you need?
   - Owner, Admin, User enough?

## Success Metrics

- First user successfully onboarded
- No localStorage dependencies
- Clean separation of concerns
- Scalable architecture
- Secure implementation

Ready to start with Phase 1?