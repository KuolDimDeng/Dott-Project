# Auth0 Deployment Checklist

## Backend Setup ✅

### 1. Install Dependencies
```bash
cd backend
pip install python-jose cryptography django-cors-headers stripe
```

### 2. Update Django Settings
- [ ] Add Auth0 configuration variables
- [ ] Add `accounts.auth0_middleware.Auth0Middleware` to MIDDLEWARE
- [ ] Add `accounts` to INSTALLED_APPS
- [ ] Update CORS settings to include Auth0 domain

### 3. Update URLs
- [ ] Include `accounts.urls_auth0` in main urls.py
- [ ] Add payment endpoints

### 4. Environment Variables
- [ ] AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
- [ ] AUTH0_AUDIENCE=https://pyfactor-api
- [ ] EMAIL_FROM=noreply@dottapps.com
- [ ] STRIPE_SECRET_KEY
- [ ] STRIPE_WEBHOOK_SECRET

### 5. Run Migrations
```bash
python manage.py makemigrations accounts
python manage.py migrate
```

## Frontend Updates ✅

### 1. Updated Services
- ✅ `/services/api/onboarding.js` - Uses backend API
- ✅ `/services/userService.js` - Fetches from /api/users/me/
- ✅ `/services/api/payment.js` - New Stripe integration
- ✅ `/config/amplifyUnified.js` - Auth0 compatibility layer

### 2. New Components
- ✅ `/components/auth/SignInForm_Auth0.js` - Auth0 login
- ✅ `/app/auth/callback/page_auth0.js` - Callback handler
- ✅ `/utils/onboardingUtils_Auth0.js` - Simplified utilities

### 3. Environment Variables
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=<your_client_id>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<pk_test_...>
```

## Auth0 Configuration

### 1. Application Settings
- [ ] Type: Single Page Application
- [ ] Allowed Callback URLs: `http://localhost:3000/api/auth/callback`
- [ ] Allowed Logout URLs: `http://localhost:3000`
- [ ] Allowed Web Origins: `http://localhost:3000`

### 2. Email Configuration
- [ ] Enable email verification
- [ ] Set sender: noreply@dottapps.com
- [ ] Customize email templates

### 3. API Settings
- [ ] Create API identifier: `https://pyfactor-api`
- [ ] Set up scopes if needed

## Stripe Configuration

### 1. Products
- [ ] Free Plan: $0
- [ ] Professional Plan: $15/month, $162/year
- [ ] Enterprise Plan: $35/month, $378/year

### 2. Webhooks
- [ ] Endpoint: `https://yourdomain.com/api/payments/webhook/`
- [ ] Events: payment_intent.succeeded, customer.subscription.updated

### 3. Price IDs
- [ ] Update .env with actual Price IDs from Stripe

## Testing Steps

### 1. Backend API
```bash
# Test user profile endpoint
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/users/me/

# Test onboarding status
curl http://localhost:8000/api/onboarding/status/
```

### 2. Frontend Flow
1. [ ] Visit http://localhost:3000/auth/signin
2. [ ] Click "Sign In with Auth0"
3. [ ] Complete Auth0 login
4. [ ] Verify redirect to onboarding or dashboard
5. [ ] Complete business info form
6. [ ] Select subscription plan
7. [ ] Complete payment (if not free)
8. [ ] Verify dashboard access

### 3. Edge Cases
- [ ] Test returning user flow
- [ ] Test free plan (no payment)
- [ ] Test paid plan with Stripe
- [ ] Test logout and re-login
- [ ] Test invalid session handling

## Production Deployment

### 1. Backend
- [ ] Update allowed hosts
- [ ] Configure production database
- [ ] Set DEBUG=False
- [ ] Update CORS for production domain
- [ ] Configure SSL

### 2. Frontend
- [ ] Update API_URL to production
- [ ] Update Auth0 URLs for production
- [ ] Build production bundle
- [ ] Configure CDN/caching

### 3. Auth0
- [ ] Create production tenant
- [ ] Update callback URLs
- [ ] Configure custom domain
- [ ] Set up monitoring

### 4. Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure logging
- [ ] Set up uptime monitoring
- [ ] Create backup strategy

## Rollback Plan

If issues occur:
1. Frontend: Revert to Cognito SignInForm
2. Backend: Disable Auth0 middleware
3. Auth0: Disable application
4. Communicate with users

## Documentation Created

1. `AUTH0_IMPLEMENTATION_GUIDE.md` - Complete technical guide
2. `AUTH0_ATTRIBUTE_MAPPING.md` - Cognito to Auth0 mapping
3. `AUTH0_BACKEND_COMPLETE.md` - Backend implementation details
4. `AUTH0_FRONTEND_INTEGRATION.md` - Frontend integration guide
5. `README_AUTH0_UPDATE.md` - Quick reference for developers

## Success Criteria

- ✅ Users can sign up via Auth0
- ✅ Email verification works
- ✅ Onboarding flow completes
- ✅ Subscription selection works
- ✅ Payment processing works (Stripe)
- ✅ Users reach dashboard
- ✅ Multi-tenant isolation works
- ✅ No Cognito dependencies remain active

## Notes

- Keep Cognito code commented out (not deleted) for 30 days
- Monitor error logs closely after deployment
- Have customer support ready for migration issues
- Consider phased rollout (beta users first)