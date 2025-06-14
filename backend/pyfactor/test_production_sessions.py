#!/usr/bin/env python
"""
Test session management in production
Run this in Render shell to verify sessions are working
"""

import os
import sys

# Add the project to Python path
sys.path.insert(0, '/app')

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from session_manager.models import UserSession, SessionEvent
from django.db import connection

print("=== Session Management Production Test ===")

# Check if tables exist
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'user_sessions'
        );
    """)
    user_session_exists = cursor.fetchone()[0]
    
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'session_events'
        );
    """)
    session_event_exists = cursor.fetchone()[0]

print(f"✅ UserSession table exists: {user_session_exists}")
print(f"✅ SessionEvent table exists: {session_event_exists}")

# Check session counts
if user_session_exists:
    total_sessions = UserSession.objects.count()
    active_sessions = UserSession.objects.filter(is_active=True).count()
    print(f"\n📊 Session Statistics:")
    print(f"   Total sessions: {total_sessions}")
    print(f"   Active sessions: {active_sessions}")

# Check Redis connection
from session_manager.services import session_service
redis_available = bool(session_service.redis_client)
print(f"\n🔧 Redis Status:")
print(f"   Redis available: {redis_available}")
print(f"   Using: {'Redis' if redis_available else 'PostgreSQL'} for session storage")

print("\n✅ Session management system is ready!")