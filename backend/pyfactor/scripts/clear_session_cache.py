#!/usr/bin/env python
"""
Clear session cache to force fresh data from database
"""

import os
import sys
import django
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from session_manager.services import session_service
import redis
from django.conf import settings

def clear_session_cache(session_id=None):
    """Clear session cache, either for a specific session or all sessions"""
    
    print("\n=== Clearing Session Cache ===\n")
    
    if not session_service.redis_client:
        print("Redis is not configured. No cache to clear.")
        return
    
    try:
        if session_id:
            # Clear specific session
            key = f"{session_service.cache_prefix}{session_id}"
            result = session_service.redis_client.delete(key)
            if result:
                print(f"Cleared cache for session: {session_id}")
            else:
                print(f"No cache found for session: {session_id}")
        else:
            # Clear all session cache
            pattern = f"{session_service.cache_prefix}*"
            keys = []
            for key in session_service.redis_client.scan_iter(match=pattern):
                keys.append(key)
            
            if keys:
                result = session_service.redis_client.delete(*keys)
                print(f"Cleared {result} session cache entries")
            else:
                print("No session cache entries found")
                
    except Exception as e:
        print(f"Error clearing cache: {e}")

if __name__ == "__main__":
    import sys
    session_id = sys.argv[1] if len(sys.argv) > 1 else None
    clear_session_cache(session_id)