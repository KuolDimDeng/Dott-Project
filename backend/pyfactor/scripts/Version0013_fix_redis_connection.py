#!/usr/bin/env python3
"""
Version0013_fix_redis_connection.py

This script fixes the Redis connection error by updating the session service
to handle Redis connection properly without socket_keepalive_options that
cause "Invalid argument" errors.

Author: Claude
Date: 2025-01-18
"""

import os
import sys
import subprocess
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

def fix_redis_connection():
    """Fix Redis connection issue in session service"""
    print("🔧 Fixing Redis connection issue...")
    
    # Path to session service file
    session_service_file = project_root / "session_manager" / "services.py"
    
    if not session_service_file.exists():
        print(f"❌ Session service file not found: {session_service_file}")
        return False
    
    print(f"📝 Reading {session_service_file}...")
    content = session_service_file.read_text()
    
    # Remove socket_keepalive_options that cause issues
    if "'socket_keepalive_options':" in content:
        print("🔍 Found socket_keepalive_options, removing...")
        
        # Replace the problematic code
        old_code = """                    return redis.StrictRedis.from_url(
                        redis_url,
                        db=getattr(settings, 'REDIS_SESSION_DB', 1),
                        decode_responses=True,
                        health_check_interval=30,
                        socket_keepalive=True,
                        socket_keepalive_options={
                            1: 1,  # TCP_KEEPIDLE
                            2: 3,  # TCP_KEEPINTVL  
                            3: 5   # TCP_KEEPCNT
                        }
                    )"""
        
        new_code = """                    return redis.StrictRedis.from_url(
                        redis_url,
                        db=getattr(settings, 'REDIS_SESSION_DB', 1),
                        decode_responses=True,
                        health_check_interval=30,
                        socket_keepalive=True,
                        socket_connect_timeout=5,
                        socket_timeout=5,
                        retry_on_timeout=True
                    )"""
        
        content = content.replace(old_code, new_code)
        
        # Also fix the fallback connection
        old_fallback = """            return redis.StrictRedis(
                **connection_kwargs
            )"""
        
        new_fallback = """            # Create Redis connection with fixed parameters
            try:
                client = redis.StrictRedis(**connection_kwargs)
                # Test the connection
                client.ping()
                print(f"[SessionService] Redis connection successful")
                return client
            except Exception as e:
                print(f"[SessionService] Redis connection failed: {e}")
                return None"""
        
        content = content.replace(old_fallback, new_fallback)
        
        # Write the updated content
        print("💾 Writing updated session service...")
        session_service_file.write_text(content)
        print("✅ Session service updated successfully!")
        
        return True
    else:
        print("⚠️ socket_keepalive_options not found in file")
        return False

def create_redis_fallback_config():
    """Create a Redis configuration that falls back gracefully"""
    print("\n🔧 Creating Redis fallback configuration...")
    
    # Create a new settings file for Redis configuration
    redis_config_file = project_root / "session_manager" / "redis_config.py"
    
    config_content = '''"""
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
'''
    
    print(f"💾 Writing Redis configuration to {redis_config_file}...")
    redis_config_file.write_text(config_content)
    print("✅ Redis configuration created successfully!")
    
    return True

def main():
    """Main execution"""
    print("🚀 Starting Redis connection fix...")
    
    # Fix the session service
    if not fix_redis_connection():
        print("❌ Failed to fix session service")
        return 1
    
    # Create Redis fallback configuration
    if not create_redis_fallback_config():
        print("❌ Failed to create Redis configuration")
        return 1
    
    print("\n✅ Redis connection fix completed successfully!")
    print("\n📋 Next steps:")
    print("1. Restart the Django backend to apply changes")
    print("2. Monitor logs for Redis connection status")
    print("3. Sessions will fall back to database if Redis is unavailable")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())