#!/usr/bin/env python
"""
Debug script to test event creation with proper tenant context.

Usage:
    python scripts/debug_event_creation.py
"""

import os
import sys
import django
from datetime import datetime, timezone, timedelta
import logging

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

from events.models import Event
from users.models import User
from django.db import connection
from custom_auth.rls import set_tenant_context, get_current_tenant_id, clear_tenant_context

def debug_event_creation():
    """Debug event creation with tenant context."""
    tenant_id = 'cb86762b-3e32-43bb-963d-f5d5b0bc009e'
    
    print(f"\n🔍 Testing event creation for tenant: {tenant_id}")
    
    # Get user
    user = User.objects.filter(tenant_id=tenant_id).first()
    if user:
        print(f"✅ Found user: {user.email}")
    
    # Test 1: Check tenant context before setting
    print(f"\n📊 Test 1: Check initial tenant context")
    initial_context = get_current_tenant_id()
    print(f"Initial tenant context: {initial_context}")
    
    # Test 2: Set tenant context
    print(f"\n📊 Test 2: Set tenant context")
    set_tenant_context(tenant_id)
    current_context = get_current_tenant_id()
    print(f"Current tenant context after setting: {current_context}")
    
    # Test 3: Try to create event WITH tenant context set
    print(f"\n📊 Test 3: Create event with tenant context set")
    try:
        event = Event.objects.create(
            tenant_id=tenant_id,
            title="Debug Test Event WITH Context",
            start_datetime=datetime.now(timezone.utc).replace(hour=16, minute=0).isoformat(),
            end_datetime=datetime.now(timezone.utc).replace(hour=17, minute=0).isoformat(),
            event_type="task",
            description="Created with tenant context set",
            created_by=user
        )
        print(f"✅ Created event with context: {event.title} (ID: {event.id})")
    except Exception as e:
        print(f"❌ Failed to create event with context: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 4: Clear context and try to create event
    print(f"\n📊 Test 4: Create event WITHOUT tenant context")
    clear_tenant_context()
    current_context = get_current_tenant_id()
    print(f"Current tenant context after clearing: {current_context}")
    
    try:
        event2 = Event.objects.create(
            tenant_id=tenant_id,  # Explicitly set tenant_id
            title="Debug Test Event WITHOUT Context",
            start_datetime=datetime.now(timezone.utc).replace(hour=18, minute=0).isoformat(),
            end_datetime=datetime.now(timezone.utc).replace(hour=19, minute=0).isoformat(),
            event_type="meeting",
            description="Created without tenant context",
            created_by=user
        )
        print(f"✅ Created event without context: {event2.title} (ID: {event2.id})")
    except Exception as e:
        print(f"❌ Failed to create event without context: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 5: Query events with and without context
    print(f"\n📊 Test 5: Query events")
    
    # Set context again
    set_tenant_context(tenant_id)
    
    # Using the manager (should respect tenant context)
    manager_count = Event.objects.count()
    print(f"Events via manager (with context): {manager_count}")
    
    # Using raw SQL to bypass manager
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*) FROM events_event WHERE tenant_id = %s
        """, [tenant_id])
        raw_count = cursor.fetchone()[0]
        print(f"Events via raw SQL: {raw_count}")
    
    # List recent events
    print(f"\n📅 Recent events for tenant:")
    events = Event.objects.filter(tenant_id=tenant_id).order_by('-created_at')[:10]
    for event in events:
        print(f"   - {event.title} (ID: {event.id}, Created: {event.created_at})")
    
    # Test 6: Check if RLS policies are active
    print(f"\n📊 Test 6: Check RLS status")
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT current_setting('app.current_tenant_id', TRUE);
        """)
        db_context = cursor.fetchone()[0]
        print(f"Database tenant context: {db_context}")
        
        cursor.execute("""
            SELECT relname, relrowsecurity 
            FROM pg_class 
            WHERE relname = 'events_event';
        """)
        result = cursor.fetchone()
        if result:
            print(f"RLS enabled on events_event table: {result[1]}")

if __name__ == "__main__":
    debug_event_creation()