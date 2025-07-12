#!/usr/bin/env python
"""
Create a test event directly in the database for debugging.

Usage:
    python scripts/create_test_event_direct.py
"""

import os
import sys
import django
from datetime import datetime, timezone, timedelta

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from events.models import Event
from users.models import User
from django.db import connection

def create_test_events():
    """Create test events directly in the database."""
    tenant_id = 'cb86762b-3e32-43bb-963d-f5d5b0bc009e'
    
    print(f"\n🔍 Checking events for tenant: {tenant_id}")
    
    # Get user
    user = User.objects.filter(tenant_id=tenant_id).first()
    if user:
        print(f"✅ Found user: {user.email}")
    
    # Check existing events
    existing_count = Event.objects.filter(tenant_id=tenant_id).count()
    print(f"\n📊 Current event count: {existing_count}")
    
    # List existing events
    if existing_count > 0:
        print("\n📅 Existing events:")
        events = Event.objects.filter(tenant_id=tenant_id).order_by('-created_at')[:10]
        for event in events:
            print(f"   - {event.title} (ID: {event.id})")
            print(f"     Start: {event.start_datetime}")
            print(f"     Type: {event.event_type}")
            print(f"     Created: {event.created_at}")
    
    # Create new test events
    print(f"\n🆕 Creating new test events...")
    
    # Today's event
    today_event = Event.objects.create(
        tenant_id=tenant_id,
        title="Today's Test Meeting",
        start_datetime=datetime.now(timezone.utc).replace(hour=14, minute=0).isoformat(),
        end_datetime=datetime.now(timezone.utc).replace(hour=15, minute=0).isoformat(),
        event_type="meeting",
        description="Test meeting created by script",
        created_by=user
    )
    print(f"✅ Created: {today_event.title} (ID: {today_event.id})")
    
    # Tomorrow's event
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    tomorrow_event = Event.objects.create(
        tenant_id=tenant_id,
        title="Tomorrow's Appointment",
        start_datetime=tomorrow.replace(hour=10, minute=0).isoformat(),
        end_datetime=tomorrow.replace(hour=11, minute=0).isoformat(),
        event_type="appointment",
        all_day=False,
        description="Test appointment for tomorrow",
        created_by=user
    )
    print(f"✅ Created: {tomorrow_event.title} (ID: {tomorrow_event.id})")
    
    # All-day event
    next_week = datetime.now(timezone.utc) + timedelta(days=7)
    allday_event = Event.objects.create(
        tenant_id=tenant_id,
        title="Company Holiday",
        start_datetime=next_week.replace(hour=0, minute=0).isoformat(),
        end_datetime=next_week.replace(hour=23, minute=59).isoformat(),
        event_type="reminder",
        all_day=True,
        description="All-day test event",
        created_by=user
    )
    print(f"✅ Created: {allday_event.title} (ID: {allday_event.id})")
    
    # Check final count
    final_count = Event.objects.filter(tenant_id=tenant_id).count()
    print(f"\n📊 Final event count: {final_count}")
    
    # Direct SQL query to verify
    print(f"\n🔍 Direct SQL query to verify events exist:")
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, title, start_datetime, event_type, tenant_id 
            FROM events_event 
            WHERE tenant_id = %s 
            ORDER BY created_at DESC 
            LIMIT 5
        """, [tenant_id])
        rows = cursor.fetchall()
        for row in rows:
            print(f"   - {row[1]} (ID: {row[0]}, Start: {row[2]}, Type: {row[3]})")
    
    print(f"\n✅ Test events created successfully!")
    print("These should now appear in the calendar if the backend API is working correctly.")

if __name__ == "__main__":
    create_test_events()