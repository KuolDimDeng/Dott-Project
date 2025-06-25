# Render Environment Setup Instructions

## Backend Service (dott-api) - URGENT

### Redis Configuration
The backend is failing because Redis is not configured. Add this environment variable:

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Navigate to **dott-api** service
3. Click on **Environment** tab
4. Add the following environment variable:
   - **Key**: `REDIS_URL`
   - **Value**: `redis://red-d18u66p5pdvs73cvcnig:6379`
5. Click **Save Changes**
6. The service will automatically redeploy

### Current Errors Being Caused by Missing Redis:
- Sales orders API returning 500 errors
- Customer dropdown not working (API errors)
- Redis connection errors: "Error -2 connecting to your-redis-host:6379"
- Backend trying to use Celery for background tasks but failing

## Frontend Service (dott-front) - Build Fixed

The frontend build issues have been fixed:
- Removed deprecated Next.js config options (`turbotrace`, `swcMinify`)
- Fixed duplicate `invoiceApi` declaration
- Customer dropdown display improved to handle different data formats

## Verification Steps

After adding the Redis URL:
1. Check backend logs for successful Redis connection
2. Verify Sales Order Management page loads customers
3. Test creating a new sales order

## Additional Backend Fix Needed

The sales order API is also failing with:
```
'UserProfile' object has no attribute 'database_name'
```

This is a separate issue in the Django backend that needs to be fixed in the sales views.