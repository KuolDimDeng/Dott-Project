# Redis Configuration for Dott Backend

## Issue
The backend is showing Redis connection errors:
```
Error -2 connecting to your-redis-host:6379. Name or service not known
```

## Solution

### 1. Redis Service Details (Render)
- Service Name: `dott-redis`
- Internal URL: `redis://red-d18u66p5pdvs73cvcnig:6379`
- Region: Oregon
- Type: Starter (256 MB RAM, 250 Connection Limit)

### 2. Configure Backend Service (dott-api) on Render

Add the following environment variable to the `dott-api` service on Render:

```bash
REDIS_URL=redis://red-d18u66p5pdvs73cvcnig:6379
```

### 3. How to Add Environment Variable on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Navigate to the `dott-api` service
3. Click on "Environment" tab
4. Add new environment variable:
   - Key: `REDIS_URL`
   - Value: `redis://red-d18u66p5pdvs73cvcnig:6379`
5. Save changes
6. The service will automatically redeploy

### 4. Alternative Environment Variables (if needed)

If the app needs individual Redis settings instead of a URL:
```bash
REDIS_HOST=red-d18u66p5pdvs73cvcnig
REDIS_PORT=6379
```

### 5. Verify Configuration

After deployment, the Django settings.py will automatically:
1. Parse the REDIS_URL
2. Configure Celery broker URL
3. Configure Django cache backend
4. Enable Redis-based features

### 6. Local Development

For local development, the .env file has been updated with:
```bash
REDIS_URL=redis://red-d18u66p5pdvs73cvcnig:6379
REDIS_HOST=red-d18u66p5pdvs73cvcnig
REDIS_PORT=6379
```

Note: This will only work if your local machine can connect to the Render Redis instance, which might require network configuration.

### 7. Testing Redis Connection

Once configured, you can test the connection from Django shell:
```python
from django.core.cache import cache
cache.set('test_key', 'test_value', 60)
print(cache.get('test_key'))  # Should print: test_value
```

### 8. Celery Configuration

With Redis properly configured, Celery will automatically use:
- Broker URL: `redis://red-d18u66p5pdvs73cvcnig:6379/0`
- Result Backend: `redis://red-d18u66p5pdvs73cvcnig:6379/0`
- Cache: `redis://red-d18u66p5pdvs73cvcnig:6379/1`

This enables:
- Background task processing
- Scheduled tasks with Celery Beat
- Caching for improved performance