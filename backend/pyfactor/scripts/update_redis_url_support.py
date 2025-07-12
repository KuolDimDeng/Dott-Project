#!/usr/bin/env python3
"""
Script to update backend settings to support REDIS_URL environment variable
This allows the backend to connect to Redis on Render
"""

import os
from urllib.parse import urlparse

def parse_redis_url():
    """Parse REDIS_URL into components"""
    redis_url = os.environ.get('REDIS_URL')
    if not redis_url:
        return None, None, None, None
    
    parsed = urlparse(redis_url)
    
    host = parsed.hostname
    port = parsed.port or 6379
    password = parsed.password
    db = 0  # Default to database 0
    
    # Extract database number from path if present
    if parsed.path and len(parsed.path) > 1:
        try:
            db = int(parsed.path[1:])
        except ValueError:
            pass
    
    return host, port, password, db

def update_settings_file(settings_path):
    """Update settings.py to support REDIS_URL"""
    
    # Read the current settings
    with open(settings_path, 'r') as f:
        content = f.read()
    
    # Find the Redis configuration section
    redis_section_start = content.find('# Redis Configuration')
    if redis_section_start == -1:
        print("Redis configuration section not found")
        return False
    
    # Find the next section (to know where Redis config ends)
    redis_section_end = content.find('\n# ', redis_section_start + 1)
    if redis_section_end == -1:
        redis_section_end = len(content)
    
    # New Redis configuration that supports both REDIS_URL and individual settings
    new_redis_config = '''# Redis Configuration
# Support both REDIS_URL (Render) and individual settings
REDIS_URL = os.environ.get('REDIS_URL')
if REDIS_URL:
    # Parse REDIS_URL for components
    from urllib.parse import urlparse
    _parsed = urlparse(REDIS_URL)
    REDIS_HOST = _parsed.hostname
    REDIS_PORT = _parsed.port or 6379
    REDIS_PASSWORD = _parsed.password
    REDIS_SSL = _parsed.scheme == 'rediss'
else:
    # Fallback to individual settings
    REDIS_HOST = os.environ.get('REDIS_HOST')
    REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
    REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD')
    REDIS_SSL = os.environ.get('REDIS_SSL', 'False').lower() == 'true'

print(f"[Settings] Redis configuration: Host={REDIS_HOST}, Port={REDIS_PORT}, SSL={REDIS_SSL}, Password={'***' if REDIS_PASSWORD else 'None'}")

# Session database (optional, default to 1)
REDIS_SESSION_DB = int(os.environ.get('REDIS_SESSION_DB', 1))'''
    
    # Replace the Redis configuration section
    new_content = (
        content[:redis_section_start] +
        new_redis_config +
        content[redis_section_end:]
    )
    
    # Write the updated settings
    backup_path = settings_path + '.backup'
    with open(backup_path, 'w') as f:
        f.write(content)
    print(f"Created backup at {backup_path}")
    
    with open(settings_path, 'w') as f:
        f.write(new_content)
    print(f"Updated {settings_path}")
    
    return True

def update_session_service(service_path):
    """Update session service to support REDIS_URL"""
    
    # Read the current service file
    with open(service_path, 'r') as f:
        content = f.read()
    
    # Find the _get_redis_client method
    method_start = content.find('def _get_redis_client(self):')
    if method_start == -1:
        print("_get_redis_client method not found")
        return False
    
    # Find the end of the method (next def or class)
    method_end = content.find('\n    def ', method_start + 1)
    if method_end == -1:
        method_end = content.find('\nclass ', method_start + 1)
    if method_end == -1:
        method_end = len(content)
    
    # New Redis client initialization that supports password
    new_method = '''    def _get_redis_client(self):
        """Get Redis client instance"""
        try:
            # Check if Redis is configured
            redis_url = getattr(settings, 'REDIS_URL', None)
            redis_host = getattr(settings, 'REDIS_HOST', None)
            
            if not redis_url and not redis_host:
                print(f"[SessionService] Redis not configured, using in-memory fallback")
                return None
            
            # If we have REDIS_URL, use it directly
            if redis_url:
                print(f"[SessionService] Connecting to Redis using URL")
                return redis.StrictRedis.from_url(
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
                )
            
            # Otherwise use individual settings
            connection_kwargs = {
                'host': redis_host,
                'port': getattr(settings, 'REDIS_PORT', 6379),
                'db': getattr(settings, 'REDIS_SESSION_DB', 1),
                'decode_responses': True,
                'health_check_interval': 30,
                'socket_keepalive': True,
                'socket_keepalive_options': {
                    1: 1,  # TCP_KEEPIDLE
                    2: 3,  # TCP_KEEPINTVL  
                    3: 5   # TCP_KEEPCNT
                }
            }
            
            # Add password if configured
            redis_password = getattr(settings, 'REDIS_PASSWORD', None)
            if redis_password:
                connection_kwargs['password'] = redis_password
            
            # Add SSL if configured
            if getattr(settings, 'REDIS_SSL', False):
                connection_kwargs['ssl'] = True
                connection_kwargs['ssl_cert_reqs'] = None
            
            return redis.StrictRedis(**connection_kwargs)
            
        except Exception as e:
            print(f"[SessionService] Failed to connect to Redis: {e}")
            return None'''
    
    # Replace the method
    new_content = (
        content[:method_start] +
        new_method +
        content[method_end:]
    )
    
    # Write the updated service
    backup_path = service_path + '.backup'
    with open(backup_path, 'w') as f:
        f.write(content)
    print(f"Created backup at {backup_path}")
    
    with open(service_path, 'w') as f:
        f.write(new_content)
    print(f"Updated {service_path}")
    
    return True

def main():
    """Main function"""
    # Get project root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    # Update settings.py
    settings_path = os.path.join(project_root, 'pyfactor', 'settings.py')
    if os.path.exists(settings_path):
        print(f"Updating {settings_path}...")
        update_settings_file(settings_path)
    else:
        print(f"Settings file not found: {settings_path}")
    
    # Update session service
    service_path = os.path.join(project_root, 'session_manager', 'services.py')
    if os.path.exists(service_path):
        print(f"Updating {service_path}...")
        update_session_service(service_path)
    else:
        print(f"Service file not found: {service_path}")
    
    print("\n✅ Redis URL support has been added!")
    print("\nTo test:")
    print("1. Set REDIS_URL environment variable")
    print("2. Restart Django server")
    print("3. Check logs for '[SessionService] Connecting to Redis using URL'")

if __name__ == '__main__':
    main()