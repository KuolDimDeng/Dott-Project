#!/usr/bin/env python
"""
Test the Event API directly to debug why events aren't persisting.

Usage:
    python scripts/test_event_api_directly.py
"""

import os
import sys
import django
import requests
import json
from datetime import datetime, timezone, timedelta

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Import Django models
from users.models import User
from events.models import Event
from session_manager.models import UserSession
from custom_auth.rls import set_tenant_context, get_current_tenant_id

def create_test_session():
    """Create a test session for authentication."""
    tenant_id = 'cb86762b-3e32-43bb-963d-f5d5b0bc009e'
    user = User.objects.filter(tenant_id=tenant_id).first()
    
    if not user:
        print("❌ No user found for tenant")
        return None
        
    # Create or get a session
    session = UserSession.objects.filter(user=user, is_active=True).first()
    
    if not session:
        from session_manager.services import session_service
        session = session_service.create_session(
            user=user,
            ip_address='127.0.0.1',
            user_agent='Test Script'
        )
    
    print(f"✅ Using session: {session.session_id}")
    return session

def test_event_api():
    """Test the event API directly."""
    tenant_id = 'cb86762b-3e32-43bb-963d-f5d5b0bc009e'
    
    # Create session
    session = create_test_session()
    if not session:
        return
    
    # Test 1: List events via API
    print("\n📊 Test 1: List events via API")
    try:
        # Simulate API request using Django test client
        from django.test import Client
        client = Client()
        
        # Set session header
        response = client.get(
            '/api/calendar/events/',
            HTTP_AUTHORIZATION=f'Session {session.session_id}',
            HTTP_COOKIE=f'session_token={session.session_id}'
        )
        
        print(f"Response status: {response.status_code}")
        if response.status_code == 200:
            events = response.json()
            if hasattr(events, 'get') and 'results' in events:
                events = events['results']
            print(f"Events returned: {len(events)}")
            for event in events[:5]:  # Show first 5
                print(f"  - {event.get('title')} (ID: {event.get('id')})")
        else:
            print(f"Error: {response.content}")
    except Exception as e:
        print(f"❌ API GET failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 2: Create event via API
    print("\n📊 Test 2: Create event via API")
    try:
        event_data = {
            "title": "API Test Event " + datetime.now().strftime("%H:%M:%S"),
            "start_datetime": datetime.now(timezone.utc).replace(hour=20, minute=0).isoformat(),
            "end_datetime": datetime.now(timezone.utc).replace(hour=21, minute=0).isoformat(),
            "all_day": False,
            "event_type": "task",
            "description": "Created via direct API test"
        }
        
        response = client.post(
            '/api/calendar/events/',
            data=json.dumps(event_data),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Session {session.session_id}',
            HTTP_COOKIE=f'session_token={session.session_id}'
        )
        
        print(f"Response status: {response.status_code}")
        if response.status_code == 201:
            created_event = response.json()
            print(f"✅ Created event: {created_event.get('title')} (ID: {created_event.get('id')})")
            
            # Verify it was saved
            print("\n🔍 Verifying event was saved...")
            
            # Check with tenant context
            set_tenant_context(tenant_id)
            db_event = Event.objects.filter(id=created_event['id']).first()
            if db_event:
                print(f"✅ Event found in database: {db_event.title}")
            else:
                print("❌ Event NOT found in database!")
                
                # Try without filtering
                all_events = Event.objects.using('default').filter(tenant_id=tenant_id).count()
                print(f"Total events for tenant: {all_events}")
                
                # Check raw SQL
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT COUNT(*) FROM events_event WHERE id = %s
                    """, [created_event['id']])
                    count = cursor.fetchone()[0]
                    print(f"Raw SQL check - Event exists: {count > 0}")
            
            # List events again to see if it appears
            response2 = client.get(
                '/api/calendar/events/',
                HTTP_AUTHORIZATION=f'Session {session.session_id}',
                HTTP_COOKIE=f'session_token={session.session_id}'
            )
            
            if response2.status_code == 200:
                events2 = response2.json()
                if hasattr(events2, 'get') and 'results' in events2:
                    events2 = events2['results']
                found = any(e.get('id') == created_event['id'] for e in events2)
                print(f"\n✅ Event appears in GET request: {found}")
                if not found:
                    print(f"Total events returned: {len(events2)}")
                    print("Event IDs returned:", [e.get('id') for e in events2])
        else:
            print(f"Error: {response.content}")
    except Exception as e:
        print(f"❌ API POST failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 3: Check database directly
    print("\n📊 Test 3: Direct database check")
    set_tenant_context(tenant_id)
    total_events = Event.objects.filter(tenant_id=tenant_id).count()
    print(f"Total events in database for tenant: {total_events}")
    
    # Show last 5 events
    recent_events = Event.objects.filter(tenant_id=tenant_id).order_by('-created_at')[:5]
    print("Recent events:")
    for event in recent_events:
        print(f"  - {event.title} (Created: {event.created_at})")

if __name__ == "__main__":
    test_event_api()