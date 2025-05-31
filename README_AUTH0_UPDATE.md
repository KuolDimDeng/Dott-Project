# 🔐 Auth0 Migration Update - IMPORTANT

## What Changed?

We've migrated from AWS Cognito to Auth0 for authentication. This is a **BREAKING CHANGE** that affects how users log in and how we store user data.

### Key Changes:
1. **Authentication**: Now using Auth0 instead of AWS Cognito
2. **User Data**: Moved from Cognito attributes to Django database
3. **Session Management**: Auth0 cookies instead of Amplify sessions
4. **Onboarding**: Complete rewrite to use backend API

## For Developers

### Frontend Changes
- ❌ No more `aws-amplify` imports
- ❌ No more `custom:*` Cognito attributes
- ❌ No more localStorage for user data
- ✅ Auth0 session cookies
- ✅ Backend API for all user data
- ✅ `/api/users/me` endpoint for profile

### Backend Changes
- ✅ New models: `Auth0User`, `Tenant`, `UserTenantRole`
- ✅ Auth0 JWT validation middleware
- ✅ Complete onboarding API endpoints
- ✅ Multi-tenant schema isolation

### Environment Variables

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=<your_client_id>
NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Backend (.env):**
```bash
AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
AUTH0_AUDIENCE=<your_api_identifier>
EMAIL_FROM=noreply@dottapps.com
STRIPE_SECRET_KEY=<your_stripe_key>
```

## Migration Steps

### 1. Install Backend Dependencies
```bash
cd backend
pip install python-jose cryptography django-cors-headers
```

### 2. Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 3. Update Settings
Add to `settings.py`:
```python
MIDDLEWARE = [
    # ... other middleware
    'accounts.auth0_middleware.Auth0Middleware',
]

AUTH0_DOMAIN = env('AUTH0_DOMAIN')
AUTH0_AUDIENCE = env('AUTH0_AUDIENCE')
```

### 4. Configure Auth0
1. Create Single Page Application in Auth0
2. Set callback URL: `http://localhost:3000/api/auth/callback`
3. Set logout URL: `http://localhost:3000`
4. Enable email verification
5. Configure email sender as `noreply@dottapps.com`

## User Journey

### New User Flow:
1. **Sign Up** → Auth0 registration
2. **Email Verification** → Required
3. **Business Info** → Company details
4. **Subscription** → Free/$15/$35 plans
5. **Payment** → Stripe (if not free)
6. **Dashboard** → Tenant created

### Returning User Flow:
1. **Login** → Auth0
2. **Dashboard** → Direct access

## API Endpoints

### Authentication
- `GET /api/auth/me` - Current user from Auth0
- `GET /api/auth/login` - Redirect to Auth0
- `GET /api/auth/logout` - Clear session

### User Profile
- `GET /api/users/me` - Full profile with tenant
- `PUT /api/users/me` - Update profile

### Onboarding
- `POST /api/onboarding/business-info`
- `POST /api/onboarding/subscription`
- `POST /api/onboarding/payment`
- `POST /api/onboarding/complete`
- `GET /api/onboarding/status`

## Data Models

### Auth0User
```python
- auth0_id (from Auth0 'sub')
- email
- name
- current_tenant
```

### Tenant
```python
- id (UUID)
- name (business name)
- business_type
- subscription_plan (free/professional/enterprise)
- owner_first_name
- owner_last_name
```

### UserTenantRole
```python
- user
- tenant
- role (owner/user)
```

## Breaking Changes

### ❌ Remove These Patterns:
```javascript
// OLD - Don't use
import { Auth } from 'aws-amplify';
const user = await Auth.currentAuthenticatedUser();
const tenantId = user.attributes['custom:tenant_id'];
```

### ✅ Use These Instead:
```javascript
// NEW - Use this
const response = await fetch('/api/users/me');
const profile = await response.json();
const tenantId = profile.tenant?.id;
```

## Troubleshooting

### "No tenant found"
- User hasn't completed onboarding
- Check `/api/onboarding/status`

### "Authentication required"
- Auth0 session expired
- Redirect to `/api/auth/login`

### "Invalid token"
- Check Auth0 domain/audience
- Verify environment variables

## Support

- **Auth0 Issues**: Check Auth0 dashboard logs
- **API Errors**: Check Django logs
- **Attribute Mapping**: See `AUTH0_ATTRIBUTE_MAPPING.md`
- **Full Guide**: See `AUTH0_IMPLEMENTATION_GUIDE.md`

## Timeline

- **Day 1-2**: Backend setup ✅
- **Day 3**: Frontend integration (in progress)
- **Day 4**: Testing & fixes
- **Day 5**: Production deployment

---

⚠️ **IMPORTANT**: This is a major change. All developers must update their local environment before pulling latest changes.