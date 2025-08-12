#!/usr/bin/env python
"""
Test calendar functionality for a specific tenant.

Usage:
    python scripts/test_calendar_for_tenant.py <tenant_id>
"""

import os
import sys
import django
from datetime import datetime, timezone

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from events.models import Event
from users.models import User, Business
from tenant_context.context import set_tenant_context

def test_calendar_for_tenant(tenant_id):
    """Test calendar functionality for a specific tenant."""
    print(f"\n🧪 Testing calendar for tenant: {tenant_id}")
    
    try:
        # Set tenant context
        set_tenant_context(tenant_id)
        print(f"✅ Tenant context set")
        
        # Get the user
        user = User.objects.filter(tenant_id=tenant_id).first()
        if user:
            print(f"✅ Found user: {user.email}")
        else:
            print("⚠️  No user found for this tenant")
            user = None
        
        # Count existing events
        existing_count = Event.objects.filter(tenant_id=tenant_id).count()
        print(f"\n📊 Current event count: {existing_count}")
        
        # List existing events
        if existing_count > 0:
            print("\n📅 Existing events:")
            events = Event.objects.filter(tenant_id=tenant_id).order_by('-created_at')[:5]
            for event in events:
                print(f"   - {event.title} (ID: {event.id}, Created: {event.created_at})")
        
        # Create a test event
        print(f"\n🆕 Creating test event...")
        test_event = Event.objects.create(
            tenant_id=tenant_id,
            title="Calendar Test Event",
            start_datetime=datetime.now(timezone.utc).isoformat(),
            end_datetime=datetime.now(timezone.utc).replace(hour=(datetime.now().hour + 1) % 24).isoformat(),
            event_type="appointment",
            description="This is a test event to verify calendar functionality",
            created_by=user
        )
        print(f"✅ Test event created: {test_event.title} (ID: {test_event.id})")
        
        # Verify we can retrieve it
        retrieved = Event.objects.get(id=test_event.id)
        print(f"✅ Event retrieved successfully")
        
        # Clean up
        test_event.delete()
        print(f"✅ Test event cleaned up")
        
        # Final count
        final_count = Event.objects.filter(tenant_id=tenant_id).count()
        print(f"\n📊 Final event count: {final_count}")
        
        print(f"\n✅ Calendar is working properly for tenant {tenant_id}!")
        print("   Users should now be able to create and view events.")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error testing calendar: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/test_calendar_for_tenant.py <tenant_id>")
        sys.exit(1)
    
    tenant_id = sys.argv[1]
    success = test_calendar_for_tenant(tenant_id)
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()