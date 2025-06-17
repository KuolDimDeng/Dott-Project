"""
Add this to your Django settings.py to configure Redis from REDIS_URL
"""

import os
from urllib.parse import urlparse

# Redis Configuration
REDIS_URL = os.environ.get('REDIS_URL')

if REDIS_URL:
    # Parse Redis URL
    redis_url = urlparse(REDIS_URL)
    
    REDIS_HOST = redis_url.hostname
    REDIS_PORT = redis_url.port or 6379
    REDIS_PASSWORD = redis_url.password
    REDIS_SESSION_DB = 1  # Use DB 1 for sessions
    
    # Django Cache Configuration
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'PARSER_CLASS': 'redis.connection.HiredisParser',
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 50,
                    'retry_on_timeout': True,
                },
                'PICKLE_VERSION': -1,
            }
        }
    }
    
    # Session Configuration to use Redis
    SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
    SESSION_CACHE_ALIAS = 'default'
    
    print(f"[Settings] Redis configured from URL: {REDIS_HOST}:{REDIS_PORT}")
else:
    # Fallback to database sessions
    print("[Settings] No REDIS_URL found, using database sessions")
    SESSION_ENGINE = 'django.contrib.sessions.backends.db'