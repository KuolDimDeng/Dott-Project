# Render Staging Configuration Guide

## 1. Frontend Staging (dott-staging)

### Environment Variables to Add:
```bash
NODE_ENV=staging
NEXT_PUBLIC_API_URL=https://api-staging.dottapps.com
BACKEND_API_URL=https://api-staging.dottapps.com
BACKEND_URL=https://api-staging.dottapps.com
NEXT_PUBLIC_BACKEND_URL=https://api-staging.dottapps.com
INTERNAL_BACKEND_URL=http://dott-api-staging:8000
NEXT_PUBLIC_ENVIRONMENT=staging
NEXT_PUBLIC_SHOW_STAGING_BANNER=true
RENDER=true
```

### Build Command:
```bash
cd frontend/pyfactor_next && pnpm install && pnpm build
```

### Start Command:
```bash
cd frontend/pyfactor_next && pnpm start
```

### Auto-Deploy:
- Set to deploy from `staging` branch

## 2. Backend Staging (dott-api-staging)

### Environment Variables to Add:
```bash
DJANGO_SETTINGS_MODULE=pyfactor.settings_staging
DATABASE_URL=postgresql://[staging_db_connection_string]
REDIS_URL=redis://[staging_redis_if_needed]
DEBUG=True
ALLOWED_HOSTS=api-staging.dottapps.com,dott-api-staging.onrender.com
CORS_ALLOWED_ORIGINS=https://staging.dottapps.com
ENVIRONMENT=staging
```

### Build Command:
```bash
cd backend/pyfactor && pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
```

### Start Command:
```bash
cd backend/pyfactor && gunicorn pyfactor.wsgi:application
```

### Auto-Deploy:
- Set to deploy from `staging` branch

## 3. Database (dott-db-staging)

- Already created
- Get connection string from Render dashboard
- Update in backend environment variables

## 4. Custom Domains

Add these domains in Cloudflare and point to Render:

- `staging.dottapps.com` → dott-staging.onrender.com (Frontend)
- `api-staging.dottapps.com` → dott-api-staging.onrender.com (Backend)

## 5. Testing Checklist

After setup, test these critical paths:

- [ ] User registration and login
- [ ] Onboarding flow
- [ ] Dashboard access
- [ ] Product management
- [ ] Invoicing
- [ ] POS system
- [ ] Employee management
- [ ] Payment processing (test mode)