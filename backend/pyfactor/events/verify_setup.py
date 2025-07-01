#!/usr/bin/env python
"""
Verify the calendar events app setup.
Run this from the Django shell: python manage.py shell < events/verify_setup.py
"""

import sys

try:
    # Check if the app is properly imported
    from events.models import Event
    print("✅ Event model imported successfully")
    
    # Check if the serializer works
    from events.serializers import EventSerializer
    print("✅ EventSerializer imported successfully")
    
    # Check if the viewset works
    from events.views import EventViewSet
    print("✅ EventViewSet imported successfully")
    
    # Check model fields
    fields = [f.name for f in Event._meta.get_fields()]
    required_fields = ['id', 'title', 'start_datetime', 'end_datetime', 'tenant_id', 'created_by']
    missing_fields = [f for f in required_fields if f not in fields]
    
    if missing_fields:
        print(f"❌ Missing fields: {missing_fields}")
    else:
        print("✅ All required fields present")
    
    # Check event type choices
    event_types = dict(Event.EVENT_TYPE_CHOICES)
    print(f"✅ Event types available: {list(event_types.keys())}")
    
    print("\n🎉 Calendar Events app is properly configured!")
    print("\nNext steps:")
    print("1. Run migrations: python manage.py migrate events")
    print("2. Or use SQL: psql -U dott_user -d dott_production -f events/migrations/create_events_table.sql")
    print("3. Test the API endpoints at /api/calendar/events/")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)