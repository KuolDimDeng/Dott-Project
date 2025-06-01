# Render Deployment Guide for PyFactor

## Fixed Issues

✅ **SECRET_KEY**: Added fallback value in settings.py to prevent empty key error
✅ **ALLOWED_HOSTS**: Updated to include `.onrender.com` and wildcard for deployment  
✅ **Environment Variables**: Updated Redis, Cache, and Celery to use environment variables
✅ **Debug Mode**: Made DEBUG configurable via environment variable

## Required Environment Variables for Render

### Essential Django Settings
```
SECRET_KEY=your-super-secret-key-here-minimum-50-chars-long-random-string
DEBUG=False
DJANGO_SETTINGS_MODULE=pyfactor.settings
```

### Database Configuration
```
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_HOST=your_database_host
DB_PORT=5432
```

### Redis Configuration (if using Redis)
```
REDIS_URL=redis://your-redis-host:6379
CELERY_BROKER_URL=redis://your-redis-host:6379/0
CELERY_RESULT_BACKEND=redis://your-redis-host:6379/0
CACHE_URL=redis://your-redis-host:6379/1
```

### Auth0 Configuration
```
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_AUDIENCE=your_api_identifier
USE_AUTH0=true
```

### AWS Configuration (if using AWS services)
```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_DEFAULT_REGION=us-east-1
```

### Optional Services
```
# Plaid Integration
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox

# Stripe Integration
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret
STRIPE_PRICE_ID_MONTHLY=price_your_monthly_price_id
STRIPE_PRICE_ID_ANNUAL=price_your_annual_price_id

# Email Configuration
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
DEFAULT_FROM_EMAIL=noreply@yourapp.com

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Superuser Creation (optional)
CREATE_SUPERUSER=true
DJANGO_SUPERUSER_EMAIL=admin@yourapp.com
DJANGO_SUPERUSER_PASSWORD=your_admin_password
```

## Render Service Configuration

### 1. Create New Web Service
- Connect your GitHub repository
- Select branch: `main` or your deployment branch
- Root Directory: `backend/pyfactor`

### 2. Build & Deploy Settings
```
Build Command: pip install -r requirements.txt
Start Command: ./render-deploy.sh
```

### 3. Environment Variables
Add all the environment variables listed above in the Render dashboard under "Environment" tab.

### 4. Health Check
Render will automatically check `https://yourapp.onrender.com/health/` endpoint.

## Deployment Steps

1. **Push your code** to GitHub with the fixes applied
2. **Create a new Render service** and connect to your repository
3. **Set all required environment variables** in Render dashboard
4. **Deploy the service**

## Troubleshooting

### Common Issues:

1. **SECRET_KEY Error**: 
   - Ensure SECRET_KEY is set in environment variables
   - Should be at least 50 characters long

2. **Database Connection**: 
   - Verify all database environment variables are correct
   - Check database host allows connections from Render IPs

3. **Static Files**: 
   - The deploy script runs `collectstatic` automatically
   - Ensure `STATIC_ROOT` is properly configured

4. **Missing Dependencies**:
   - Check `requirements.txt` includes all necessary packages
   - Verify package versions are compatible

5. **Redis Connection**:
   - If using Redis, ensure REDIS_URL is correct
   - Consider using Render's managed Redis service

### Logs
Check Render logs for detailed error messages:
- Go to your service dashboard
- Click on "Logs" tab
- Look for startup errors

## Post-Deployment

1. **Verify health endpoint**: Visit `https://yourapp.onrender.com/health/`
2. **Test authentication**: Try logging in through your frontend
3. **Check admin panel**: Visit `https://yourapp.onrender.com/admin/`
4. **Monitor logs**: Keep an eye on the logs for any runtime errors

## Security Notes

- Never commit sensitive environment variables to git
- Use strong, unique values for SECRET_KEY
- In production, set DEBUG=False
- Review ALLOWED_HOSTS for your specific domain
- Enable SSL/HTTPS (Render provides this automatically) 