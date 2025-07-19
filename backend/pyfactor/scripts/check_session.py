#!/usr/bin/env python
"""
Quick script to check if a specific session exists in the database
"""
import os
import sys
import django

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.utils import timezone
from session_manager.models import UserSession
from django.contrib.auth import get_user_model

User = get_user_model()

def check_session(session_id):
    """Check if a session exists and its status"""
    print(f"\n=== Checking Session: {session_id} ===")
    print(f"Current time: {timezone.now()}")
    
    try:
        # Check if session exists
        session = UserSession.objects.filter(session_id=session_id).first()
        
        if session:
            print(f"\n✅ Session FOUND in database!")
            print(f"User: {session.user.email} (ID: {session.user.id})")
            print(f"Created: {session.created_at}")
            print(f"Expires: {session.expires_at}")
            print(f"Is Active: {session.is_active}")
            print(f"Is Expired: {session.expires_at <= timezone.now()}")
            print(f"Tenant: {session.tenant.name if session.tenant else 'None'}")
            print(f"Last Activity: {session.last_activity}")
            
            # Check user details
            user = session.user
            print(f"\nUser Details:")
            print(f"  - business_id: {getattr(user, 'business_id', 'N/A')}")
            print(f"  - tenant_id: {getattr(user, 'tenant_id', 'N/A')}")
            print(f"  - tenant: {user.tenant if hasattr(user, 'tenant') else 'N/A'}")
            print(f"  - onboarding_completed: {user.onboarding_completed}")
            
            # Check why it might not be working
            if not session.is_active:
                print("\n❌ ISSUE: Session is marked as INACTIVE")
            elif session.expires_at <= timezone.now():
                print("\n❌ ISSUE: Session has EXPIRED")
            else:
                print("\n✅ Session appears to be VALID")
                
        else:
            print(f"\n❌ Session NOT FOUND in database!")
            
        # Show recent sessions
        print(f"\n=== Recent Sessions (last 5) ===")
        recent = UserSession.objects.all().order_by('-created_at')[:5]
        for s in recent:
            active_status = "ACTIVE" if (s.is_active and s.expires_at > timezone.now()) else "INACTIVE/EXPIRED"
            print(f"  - {s.session_id} | {s.user.email} | Created: {s.created_at.strftime('%Y-%m-%d %H:%M')} | {active_status}")
            
        # Check total sessions
        total = UserSession.objects.count()
        active = UserSession.objects.filter(is_active=True, expires_at__gt=timezone.now()).count()
        print(f"\nTotal sessions in DB: {total}")
        print(f"Active sessions: {active}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # The session ID from the browser
    session_id = "08376327-97b8-403a-9e3d-1127a89b40e0"
    
    if len(sys.argv) > 1:
        session_id = sys.argv[1]
    
    check_session(session_id)