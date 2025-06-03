# Auth0 Backend Implementation - Complete Guide

## Overview

This document provides a complete guide to the Auth0 backend implementation for the PyFactor application. All necessary files have been created and are ready for integration.

## Files Created

### 1. Models (`accounts/models_auth0.py`)
- **Auth0User**: Stores authenticated users from Auth0
- **Tenant**: Business/organization with full onboarding data
- **UserTenantRole**: Links users to tenants with roles (owner/user)
- **OnboardingProgress**: Tracks onboarding completion status

### 2. Serializers (`accounts/serializers_auth0.py`)
- **BusinessInfoSerializer**: Handles all business form fields
- **SubscriptionSerializer**: Manages plan selection
- **UserProfileSerializer**: Returns complete user data
- **TenantSerializer**: Tenant data serialization

### 3. Views (`accounts/views_auth0.py`)
- `get_user_profile`: Get/create user from Auth0
- `submit_business_info`: Process business information
- `submit_subscription`: Handle plan selection
- `complete_onboarding`: Finalize setup
- `get_onboarding_status`: Check progress

### 4. Payment Views (`accounts/views_payment.py`)
- `create_payment_intent`: Stripe payment setup
- `confirm_payment`: Process payment confirmation
- `stripe_webhook`: Handle Stripe events

### 5. Middleware (`accounts/auth0_middleware.py`)
- **Auth0Middleware**: Validates JWT tokens
- **requires_auth**: Decorator for protected views
- **requires_scope**: Scope-based permissions

### 6. URLs (`accounts/urls_auth0.py`)
```python
/api/users/me/
/api/onboarding/business-info/
/api/onboarding/subscription/
/api/onboarding/complete/
/api/onboarding/status/
/api/payments/create-intent/
/api/payments/confirm/
/api/payments/webhook/
```

### 7. Migrations (`accounts/migrations/0001_auth0_models.py`)
- Complete database schema for all models
- Ready to run with `python manage.py migrate`

## Setup Instructions

### Step 1: Install Dependencies
```bash
cd backend
pip install -r requirements_auth0.txt
# OR
pip install python-jose cryptography django-cors-headers stripe
```

### Step 2: Update Settings.py

Add the following to your `settings.py`:

```python
# Auth0 Configuration
AUTH0_DOMAIN = os.getenv('AUTH0_DOMAIN', 'dev-cbyy63jovi6zrcos.us.auth0.com')
AUTH0_AUDIENCE = os.getenv('AUTH0_AUDIENCE', 'https://pyfactor-api')

# Email
EMAIL_FROM = 'noreply@dottapps.com'

# Stripe
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')

# Add to MIDDLEWARE (before AuthenticationMiddleware):
MIDDLEWARE = [
    # ... other middleware
    'accounts.auth0_middleware.Auth0Middleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    # ... rest of middleware
]

# Add to INSTALLED_APPS:
INSTALLED_APPS = [
    # ... other apps
    'accounts',
]
```

### Step 3: Update URLs.py

Add to your main `urls.py`:

```python
from accounts import urls_auth0, views_payment

urlpatterns = [
    # ... existing patterns
    
    # Auth0 API endpoints
    path('api/', include('accounts.urls_auth0')),
    
    # Payment endpoints
    path('api/payments/create-intent/', views_payment.create_payment_intent),
    path('api/payments/confirm/', views_payment.confirm_payment),
    path('api/payments/webhook/', views_payment.stripe_webhook),
]
```

### Step 4: Environment Variables

Create/update `.env` file:

```env
# Auth0
AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
AUTH0_AUDIENCE=https://pyfactor-api
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret

# Email
EMAIL_FROM=noreply@dottapps.com

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (create in Stripe dashboard)
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=price_...
STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID=price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=price_...
```

### Step 5: Run Migrations

```bash
python manage.py makemigrations accounts
python manage.py migrate
```

### Step 6: Configure Auth0

In Auth0 Dashboard:
1. Create Single Page Application
2. Set callback URL: `http://localhost:3000/api/auth/callback`
3. Set logout URL: `http://localhost:3000`
4. Enable email verification
5. Configure email sender as `noreply@dottapps.com`

### Step 7: Configure Stripe

In Stripe Dashboard:
1. Create Products:
   - Professional: $15/month, $162/year
   - Enterprise: $35/month, $378/year
2. Copy Price IDs to `.env`
3. Set up webhook endpoint: `https://yourdomain.com/api/payments/webhook/`

## API Usage Examples

### Get User Profile
```bash
curl -H "Authorization: Bearer <auth0_token>" \
  http://localhost:8000/api/users/me/
```

### Submit Business Info
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "My Company",
    "businessType": "Technology",
    "country": "US",
    "legalStructure": "LLC",
    "dateFounded": "2020-01-01",
    "firstName": "John",
    "lastName": "Doe"
  }' \
  http://localhost:8000/api/onboarding/business-info/
```

### Select Subscription
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "selected_plan": "professional",
    "billingCycle": "monthly"
  }' \
  http://localhost:8000/api/onboarding/subscription/
```

## Testing Checklist

- [ ] Auth0 middleware validates tokens correctly
- [ ] User creation works on first login
- [ ] Business info submission creates tenant
- [ ] Subscription selection updates tenant
- [ ] Free plan skips payment
- [ ] Paid plans create Stripe payment intent
- [ ] Onboarding completion updates all flags
- [ ] User profile returns complete data

## Troubleshooting

### "Module 'accounts' not found"
- Ensure 'accounts' is in INSTALLED_APPS
- Check that `accounts/__init__.py` exists

### "No such table: auth0_users"
- Run migrations: `python manage.py migrate accounts`

### "Invalid token"
- Verify AUTH0_DOMAIN and AUTH0_AUDIENCE match frontend
- Check token is passed as "Bearer <token>"

### "Stripe error"
- Verify Stripe keys in .env
- Ensure products/prices exist in Stripe

## Next Steps

1. **Frontend Integration**: Update frontend services to use new API
2. **Multi-tenant Schema**: Implement schema creation on tenant creation
3. **Email Service**: Configure email sending for verifications
4. **Production Deploy**: Update settings for production environment

## Support Files

- `setup_auth0_backend.sh`: Automated setup script
- `settings_auth0_update.py`: Settings configuration guide
- `urls_auth0_update.py`: URL configuration guide
- `.env.auth0.example`: Environment template
- `requirements_auth0.txt`: Python dependencies

The backend is now fully prepared for Auth0 integration!