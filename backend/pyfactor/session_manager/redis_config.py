"""
Redis configuration with proper error handling
"""

import os
import redis
from django.conf import settings
from urllib.parse import urlparse


def get_redis_client():
    """
    Get Redis client with proper error handling and fallback
    """
    # Check if Redis is configured
    redis_url = getattr(settings, 'REDIS_URL', os.environ.get('REDIS_URL'))
    
    if not redis_url:
        print("[Redis] No Redis URL configured, sessions will use database only")
        return None
    
    try:
        # Parse the Redis URL
        parsed = urlparse(redis_url)
        
        # Basic connection parameters
        connection_params = {
            'host': parsed.hostname or 'localhost',
            'port': parsed.port or 6379,
            'db': getattr(settings, 'REDIS_SESSION_DB', 1),
            'decode_responses': True,
            'socket_connect_timeout': 5,
            'socket_timeout': 5,
            'retry_on_timeout': True,
            'health_check_interval': 30,
        }
        
        # Add password if present
        if parsed.password:
            connection_params['password'] = parsed.password
        
        # Handle SSL/TLS
        if parsed.scheme == 'rediss':
            connection_params['ssl'] = True
            connection_params['ssl_cert_reqs'] = None
        
        # Create client and test connection
        client = redis.StrictRedis(**connection_params)
        client.ping()
        
        print(f"[Redis] Successfully connected to Redis at {parsed.hostname}:{parsed.port or 6379}")
        return client
        
    except redis.ConnectionError as e:
        print(f"[Redis] Connection failed: {e}")
        return None
    except redis.TimeoutError as e:
        print(f"[Redis] Connection timeout: {e}")
        return None
    except Exception as e:
        print(f"[Redis] Unexpected error: {e}")
        return None


# Global Redis client instance
redis_client = None

def get_redis_connection():
    """Get or create Redis connection"""
    global redis_client
    
    if redis_client is None:
        redis_client = get_redis_client()
    
    return redis_client
