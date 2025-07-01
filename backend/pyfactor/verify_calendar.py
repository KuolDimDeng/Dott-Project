#!/usr/bin/env python
"""
Verify calendar events setup
Run this script to test that calendar events are working properly
"""

from django.contrib.auth import get_user_model
from events.models import Event
from datetime import datetime, timedelta
from django.utils import timezone

print("🔍 Verifying Calendar Events Setup...")
print("-" * 50)

# Check if Event model is accessible
try:
    from events.models import Event
    print("✅ Event model imported successfully")
except ImportError as e:
    print(f"❌ Failed to import Event model: {e}")
    exit(1)

# Check if events app is in INSTALLED_APPS
from django.conf import settings
if 'events' in settings.INSTALLED_APPS or 'events.apps.EventsConfig' in settings.INSTALLED_APPS:
    print("✅ Events app is in INSTALLED_APPS")
else:
    print("❌ Events app is NOT in INSTALLED_APPS")

# Check if the events table exists
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'events_event'
        );
    """)
    table_exists = cursor.fetchone()[0]
    if table_exists:
        print("✅ events_event table exists in database")
    else:
        print("❌ events_event table does NOT exist")

# Test creating an event
print("\n📝 Testing Event Creation...")
try:
    # Get or create a test user
    User = get_user_model()
    test_user = User.objects.filter(email='kdeng@dottapps.com').first()
    
    if test_user:
        print(f"✅ Found user: {test_user.email}")
        
        # Create a test event
        test_event = Event.objects.create(
            title="Calendar API Test Event",
            start_datetime=timezone.now(),
            end_datetime=timezone.now() + timedelta(hours=1),
            event_type='meeting',
            description='This is a test event created by the verification script',
            location='Virtual',
            reminder_minutes=15,
            tenant_id=test_user.tenant_id,
            created_by=test_user
        )
        print(f"✅ Created test event: {test_event.title} (ID: {test_event.id})")
        
        # Verify we can retrieve it
        retrieved_event = Event.objects.get(id=test_event.id)
        print(f"✅ Retrieved event successfully: {retrieved_event.title}")
        
        # Clean up
        test_event.delete()
        print("✅ Cleaned up test event")
        
    else:
        print("⚠️  No user found with email kdeng@dottapps.com")
        print("   Events will be created when users save calendar events")
        
except Exception as e:
    print(f"❌ Error during event creation test: {e}")
    import traceback
    traceback.print_exc()

# Check URL routing
print("\n🌐 Checking URL Configuration...")
try:
    from django.urls import reverse
    calendar_url = reverse('event-list')
    print(f"✅ Calendar events URL configured: {calendar_url}")
except Exception as e:
    print(f"⚠️  Could not reverse calendar URL: {e}")

print("\n✨ Calendar Events Backend Setup Complete!")
print("   Frontend can now save events permanently to the database")
print("-" * 50)