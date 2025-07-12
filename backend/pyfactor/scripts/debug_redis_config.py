#!/usr/bin/env python
"""
Debug Redis configuration in Django settings.
Run this from Django shell: python manage.py shell < scripts/debug_redis_config.py
"""

import os
from django.conf import settings

print("\n=== Redis Configuration Debug ===\n")

# Check environment variables
print("1. Environment Variables:")
print(f"   REDIS_URL: {os.environ.get('REDIS_URL', 'NOT SET')}")
print(f"   REDIS_HOST: {os.environ.get('REDIS_HOST', 'NOT SET')}")
print(f"   REDIS_PORT: {os.environ.get('REDIS_PORT', 'NOT SET')}")
print(f"   REDIS_PASSWORD: {'SET' if os.environ.get('REDIS_PASSWORD') else 'NOT SET'}")

# Check Django settings
print("\n2. Django Settings:")
print(f"   REDIS_URL: {getattr(settings, 'REDIS_URL', 'NOT SET')}")
print(f"   REDIS_HOST: {getattr(settings, 'REDIS_HOST', 'NOT SET')}")
print(f"   REDIS_PORT: {getattr(settings, 'REDIS_PORT', 'NOT SET')}")
print(f"   CELERY_BROKER_URL: {getattr(settings, 'CELERY_BROKER_URL', 'NOT SET')}")
print(f"   CELERY_RESULT_BACKEND: {getattr(settings, 'CELERY_RESULT_BACKEND', 'NOT SET')}")

# Test Redis connection if configured
redis_url = getattr(settings, 'REDIS_URL', None)
if redis_url:
    print("\n3. Testing Redis Connection:")
    try:
        import redis
        from urllib.parse import urlparse
        
        parsed = urlparse(redis_url)
        r = redis.Redis(
            host=parsed.hostname,
            port=parsed.port or 6379,
            password=parsed.password,
            decode_responses=True
        )
        
        # Test connection
        r.ping()
        print(f"   ✅ Successfully connected to Redis at {parsed.hostname}:{parsed.port or 6379}")
        
        # Test basic operations
        r.set('test_key', 'test_value', ex=10)
        value = r.get('test_key')
        print(f"   ✅ Redis read/write test successful: {value}")
        
    except Exception as e:
        print(f"   ❌ Redis connection failed: {e}")
else:
    print("\n3. Redis Connection Test:")
    print("   ⚠️  REDIS_URL not configured - Redis features disabled")

# Check Celery configuration
print("\n4. Celery Configuration:")
try:
    from pyfactor.celery import app as celery_app
    broker_url = celery_app.conf.get('broker_url') or celery_app.conf.get('BROKER_URL')
    result_backend = celery_app.conf.get('result_backend') or celery_app.conf.get('CELERY_RESULT_BACKEND')
    print(f"   Broker URL: {broker_url or 'NOT SET'}")
    print(f"   Result Backend: {result_backend or 'NOT SET'}")
    
    if broker_url and 'your-redis-host' in str(broker_url):
        print("   ⚠️  WARNING: Broker URL contains placeholder 'your-redis-host'")
        print("   This means REDIS_HOST environment variable is not properly set!")
        
except Exception as e:
    print(f"   ❌ Could not load Celery configuration: {e}")

print("\n5. Recommendations:")
if not redis_url:
    print("   • Set REDIS_URL environment variable in Render dashboard")
    print("   • Value should be: redis://red-d18u66p5pdvs73cvcnig:6379")
    print("   • After setting, redeploy the service")
else:
    print("   • Redis appears to be configured correctly")
    print("   • If still seeing errors, check network connectivity")

print("\n=== End of Debug ===\n")