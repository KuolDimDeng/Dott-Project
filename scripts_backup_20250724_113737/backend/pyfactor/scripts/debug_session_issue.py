#!/usr/bin/env python
"""
Debug session issue where frontend session doesn't exist in backend
"""
import os
import sys
import django
from datetime import datetime, timedelta
from django.utils import timezone

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from session_manager.models import UserSession
from django.contrib.auth import get_user_model

User = get_user_model()

def debug_session_issue():
    """Debug why session 08376327-97b8-403a-9e3d-1127a89b40e0 doesn't exist"""
    
    session_id_to_find = "08376327-97b8-403a-9e3d-1127a89b40e0"
    
    print("\n=== SESSION DEBUG REPORT ===")
    print(f"Looking for session: {session_id_to_find}")
    print(f"Current time: {timezone.now()}")
    
    # 1. Check if session exists at all
    try:
        session = UserSession.objects.get(session_id=session_id_to_find)
        print(f"\n✅ Session FOUND!")
        print(f"  - User: {session.user.email}")
        print(f"  - Created: {session.created_at}")
        print(f"  - Expires: {session.expires_at}")
        print(f"  - Is Active: {session.is_active}")
        print(f"  - Expired: {session.expires_at <= timezone.now()}")
        print(f"  - Tenant: {session.tenant.name if session.tenant else 'None'}")
    except UserSession.DoesNotExist:
        print(f"\n❌ Session NOT FOUND in database")
    
    # 2. Show recent sessions
    print("\n=== RECENT SESSIONS (Last 10) ===")
    recent_sessions = UserSession.objects.all().order_by('-created_at')[:10]
    
    for session in recent_sessions:
        status = "🟢 Active" if session.is_active and session.expires_at > timezone.now() else "🔴 Inactive/Expired"
        print(f"\n{status} Session: {session.session_id}")
        print(f"  - User: {session.user.email}")
        print(f"  - Created: {session.created_at}")
        print(f"  - Expires: {session.expires_at}")
        print(f"  - Tenant: {session.tenant.name if session.tenant else 'None'}")
    
    # 3. Check for sessions created in last 24 hours
    print("\n=== SESSIONS CREATED IN LAST 24 HOURS ===")
    yesterday = timezone.now() - timedelta(hours=24)
    recent_new = UserSession.objects.filter(created_at__gte=yesterday).order_by('-created_at')
    
    print(f"Found {recent_new.count()} sessions created in last 24 hours")
    for session in recent_new[:5]:
        print(f"\n- {session.session_id}")
        print(f"  User: {session.user.email}")
        print(f"  Created: {session.created_at}")
    
    # 4. Check active sessions
    print("\n=== CURRENTLY ACTIVE SESSIONS ===")
    active_sessions = UserSession.objects.filter(
        is_active=True,
        expires_at__gt=timezone.now()
    ).order_by('-last_activity')[:10]
    
    print(f"Found {active_sessions.count()} active sessions")
    for session in active_sessions[:5]:
        print(f"\n- {session.session_id}")
        print(f"  User: {session.user.email}")
        print(f"  Last Activity: {session.last_activity}")
    
    # 5. Database statistics
    print("\n=== DATABASE STATISTICS ===")
    total_sessions = UserSession.objects.count()
    active_count = UserSession.objects.filter(is_active=True, expires_at__gt=timezone.now()).count()
    expired_count = UserSession.objects.filter(expires_at__lte=timezone.now()).count()
    inactive_count = UserSession.objects.filter(is_active=False).count()
    
    print(f"Total sessions: {total_sessions}")
    print(f"Active sessions: {active_count}")
    print(f"Expired sessions: {expired_count}")
    print(f"Inactive sessions: {inactive_count}")
    
    # 6. Check for any user without business_id
    print("\n=== USERS WITHOUT BUSINESS_ID ===")
    users_without_business = User.objects.filter(business_id__isnull=True)[:10]
    for user in users_without_business:
        print(f"- {user.email} (ID: {user.id})")

if __name__ == "__main__":
    debug_session_issue()