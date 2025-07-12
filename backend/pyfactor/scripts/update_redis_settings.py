#!/usr/bin/env python
"""
Update Django settings.py to support REDIS_URL environment variable
This allows using Render's Redis URL format directly
"""

import re

# Read the current settings file
with open('/Users/kuoldeng/projectx/backend/pyfactor/pyfactor/settings.py', 'r') as f:
    content = f.read()

# Find the Redis configuration section
redis_section_start = content.find('REDIS_HOST = os.environ.get')
redis_section_end = content.find('REDIS_URL = None', redis_section_start) + len('REDIS_URL = None')

if redis_section_start != -1 and redis_section_end != -1:
    # Create the new Redis configuration
    new_redis_config = '''# Redis Configuration - Support both REDIS_URL and REDIS_HOST/PORT
REDIS_URL = os.environ.get('REDIS_URL')
if REDIS_URL:
    # Parse Redis URL (e.g., redis://red-abc123:6379)
    from urllib.parse import urlparse
    parsed = urlparse(REDIS_URL)
    REDIS_HOST = parsed.hostname
    REDIS_PORT = parsed.port or 6379
    REDIS_PASSWORD = parsed.password
else:
    # Fallback to individual settings
    REDIS_HOST = os.environ.get('REDIS_HOST')
    REDIS_PORT = os.environ.get('REDIS_PORT', 6379)
    REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD')

# Configure Redis if available
if REDIS_HOST:
    if not REDIS_URL:
        # Build URL from components
        if REDIS_PASSWORD:
            REDIS_URL = f'redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}'
        else:
            REDIS_URL = f'redis://{REDIS_HOST}:{REDIS_PORT}'
    
    CELERY_BROKER_URL = f'{REDIS_URL}/0'
    CELERY_RESULT_BACKEND = f'{REDIS_URL}/0'
    
    # Update your CACHES setting to use Redis when available
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': f'{REDIS_URL}/1',
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'parser_class': 'redis.connection.DefaultParser',
                'pool_class': 'redis.connection.ConnectionPool',
                'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 50,
                    'retry_on_timeout': True,
                }
            }
        }
    }
else:
    REDIS_URL = None
    CELERY_BROKER_URL = 'memory://'
    CELERY_RESULT_BACKEND = 'django-db'
    # Fallback to Django's local memory cache if Redis is not available
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }'''
    
    # Replace the old section with the new one
    new_content = content[:redis_section_start] + new_redis_config + content[redis_section_end:]
    
    print("Preview of changes:")
    print("===================")
    print(new_redis_config)
    print("===================")
    print("\nThis will update the Redis configuration to support REDIS_URL from Render.")
    print("The change is backward compatible with existing REDIS_HOST/REDIS_PORT settings.")
else:
    print("Could not find Redis configuration section in settings.py")
    print("Please manually add the Redis URL support.")