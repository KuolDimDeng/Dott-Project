# Auth0 Frontend Integration Guide

## Overview

This guide documents the complete frontend integration with Auth0 and the new backend API. All services have been updated to use the backend instead of localStorage/Cognito.

## Key Changes

### 1. Authentication Flow
- **Old**: AWS Cognito with Amplify
- **New**: Auth0 with session cookies
- **Login**: Redirects to `/api/auth/login`
- **Logout**: Redirects to `/api/auth/logout`

### 2. User Data Storage
- **Old**: Cognito custom attributes + localStorage
- **New**: Backend API with temporary localStorage for compatibility

### 3. API Endpoints Used

#### User Profile
```javascript
GET /api/users/me/
// Returns complete user profile with tenant info
```

#### Onboarding
```javascript
POST /api/onboarding/business-info/
POST /api/onboarding/subscription/
POST /api/onboarding/complete/
GET  /api/onboarding/status/
```

#### Payments
```javascript
POST /api/payments/create-intent/
POST /api/payments/confirm/
```

## Updated Files

### 1. Services

#### `services/api/onboarding.js`
- ✅ Updated to use new backend endpoints
- ✅ Maps frontend field names to backend format
- ✅ Maintains localStorage for backward compatibility
- ✅ Handles Auth0 session authentication

#### `services/userService.js`
- ✅ Fetches from `/api/users/me/` instead of Cognito
- ✅ Transforms backend response to expected format
- ✅ Caches user data for performance
- ✅ Updates localStorage for compatibility

#### `services/api/payment.js` (NEW)
- ✅ Handles Stripe payment intents
- ✅ Confirms payments
- ✅ Uses Auth0 session authentication

### 2. Utilities

#### `utils/onboardingUtils_Auth0.js` (NEW)
- ✅ Simplified onboarding status management
- ✅ No Cognito dependencies
- ✅ Works with backend API

#### `config/amplifyUnified.js`
- ✅ Auth0 compatibility layer
- ✅ Maintains same API for easy migration
- ✅ Uses localStorage + `/api/auth/me`

### 3. Components

#### `components/auth/SignInForm_Auth0.js` (NEW)
- ✅ Simple Auth0 login button
- ✅ Redirects to Auth0 for authentication
- ✅ Checks onboarding status after login

#### `app/auth/callback/page_auth0.js` (NEW)
- ✅ Handles Auth0 callback
- ✅ Loads user profile
- ✅ Redirects based on onboarding status

## Integration Steps

### 1. Update Environment Variables
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your_client_id
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 2. Replace Components

#### SignInForm
```javascript
// Old
import SignInForm from '@/components/auth/SignInForm';

// New
import SignInForm from '@/components/auth/SignInForm_Auth0';
```

#### Callback Page
```javascript
// Replace existing callback with Auth0 version
// app/auth/callback/page.js → page_auth0.js
```

### 3. Update Imports

#### Onboarding Utils
```javascript
// Old
import { getOnboardingStatus } from '@/utils/onboardingUtils';

// New
import { getOnboardingStatus } from '@/utils/onboardingUtils_Auth0';
```

## Data Flow

### 1. Login Flow
```
User clicks "Sign In" 
→ Redirect to /api/auth/login
→ Auth0 handles authentication
→ Callback to /auth/callback
→ Load user profile from /api/users/me/
→ Check onboarding status
→ Redirect to appropriate page
```

### 2. Onboarding Flow
```
Business Info Form
→ POST /api/onboarding/business-info/
→ Creates tenant in backend
→ Returns tenant_id

Subscription Selection
→ POST /api/onboarding/subscription/
→ Updates tenant with plan
→ Determines if payment needed

Payment (if not free)
→ POST /api/payments/create-intent/
→ Stripe payment form
→ POST /api/payments/confirm/

Complete Setup
→ POST /api/onboarding/complete/
→ Finalizes onboarding
→ Redirect to dashboard
```

### 3. User Profile Structure
```javascript
{
  // From backend /api/users/me/
  user: {
    id: 1,
    auth0_id: "auth0|123",
    email: "user@example.com",
    name: "John Doe"
  },
  tenant: {
    id: "uuid",
    name: "Company Name",
    subscription_plan: "professional",
    subscription_status: "active"
  },
  role: "owner",
  onboarding: {
    business_info_completed: true,
    subscription_selected: true,
    payment_completed: true,
    setup_completed: true
  }
}
```

## Backward Compatibility

To maintain compatibility with existing code, the integration:

1. **Updates localStorage** when receiving backend data
2. **Provides attributes object** in user profile
3. **Maps field names** between old and new formats
4. **Maintains session check functions** in amplifyUnified.js

## Testing Checklist

- [ ] User can click "Sign In" and go to Auth0
- [ ] After login, callback page loads user profile
- [ ] New users are redirected to onboarding
- [ ] Business info form submits successfully
- [ ] Subscription selection works
- [ ] Free plan skips payment
- [ ] Paid plans show Stripe form
- [ ] Onboarding completion redirects to dashboard
- [ ] Returning users go directly to dashboard
- [ ] Logout clears session properly

## Common Issues

### "No user profile found"
- Ensure backend is running
- Check Auth0 session cookie exists
- Verify /api/users/me/ endpoint works

### "Onboarding data not saving"
- Check network tab for API calls
- Verify tenant_id is returned
- Check browser console for errors

### "Payment not working"
- Verify Stripe keys in .env
- Check payment intent creation
- Ensure webhook is configured

## Next Steps

1. **Remove old Cognito code** after testing
2. **Update remaining components** to use new services
3. **Add error boundaries** for better error handling
4. **Implement retry logic** for API calls
5. **Add loading states** during API calls

The frontend is now integrated with Auth0 and the backend API!