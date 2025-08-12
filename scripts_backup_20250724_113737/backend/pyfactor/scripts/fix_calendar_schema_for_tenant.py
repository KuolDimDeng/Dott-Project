#!/usr/bin/env python
"""
Fix calendar schema for a specific tenant.
This script ensures the events app tables are properly created for the tenant.

Usage:
    python scripts/fix_calendar_schema_for_tenant.py <tenant_id>
    
For the current issue:
    python scripts/fix_calendar_schema_for_tenant.py cb86762b-3e32-43bb-963d-f5d5b0bc009e
"""

import os
import sys
import django
from django.db import connection, transaction
from django.core.management import call_command

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from users.models import User, Business
from django.contrib.auth import get_user_model
from tenant_context.context import set_tenant_context

def fix_calendar_schema_for_tenant(tenant_id):
    """Fix calendar/events schema for a specific tenant."""
    print(f"\n🔧 Fixing calendar schema for tenant: {tenant_id}")
    
    try:
        # First, verify the tenant exists
        business = Business.objects.filter(tenant_id=tenant_id).first()
        if not business:
            print(f"❌ Error: No business found with tenant_id {tenant_id}")
            return False
            
        print(f"✅ Found business: {business.name}")
        
        # Get the owner user
        owner = User.objects.filter(tenant_id=tenant_id, role='OWNER').first()
        if not owner:
            owner = User.objects.filter(tenant_id=tenant_id).first()
            
        if owner:
            print(f"✅ Found user: {owner.email}")
        else:
            print("⚠️  Warning: No user found for this tenant")
        
        # Set tenant context for RLS
        print(f"\n🔒 Setting tenant context for RLS operations...")
        set_tenant_context(tenant_id)
        
        # Run migrations for the events app
        print(f"\n🚀 Running migrations for events app...")
        call_command('migrate', 'events', verbosity=2)
        
        # Verify the Event model can be accessed
        print(f"\n🔍 Verifying Event model access...")
        from events.models import Event
        
        # Try to query events (this will create the table if it doesn't exist)
        with transaction.atomic():
            event_count = Event.objects.filter(tenant_id=tenant_id).count()
            print(f"✅ Current event count for tenant: {event_count}")
            
            # Create a test event to ensure everything works
            test_event = Event.objects.create(
                tenant_id=tenant_id,
                title="System Test Event - Calendar Setup Complete",
                start_datetime="2025-07-09T12:00:00Z",
                end_datetime="2025-07-09T13:00:00Z",
                event_type="appointment",
                description="This test event confirms your calendar is properly set up.",
                created_by=owner if owner else None
            )
            print(f"✅ Test event created with ID: {test_event.id}")
            
            # Verify we can retrieve it
            retrieved = Event.objects.get(id=test_event.id)
            print(f"✅ Test event retrieved successfully: {retrieved.title}")
            
            # Delete the test event
            test_event.delete()
            print(f"✅ Test event cleaned up")
        
        # Check if there are any existing events that need tenant_id
        print(f"\n🔍 Checking for events without tenant_id...")
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) FROM events_event 
                WHERE tenant_id IS NULL OR tenant_id = ''
            """)
            orphan_count = cursor.fetchone()[0]
            if orphan_count > 0:
                print(f"⚠️  Found {orphan_count} events without tenant_id")
                if owner:
                    print(f"   Updating them to tenant_id: {tenant_id}")
                    cursor.execute("""
                        UPDATE events_event 
                        SET tenant_id = %s 
                        WHERE tenant_id IS NULL OR tenant_id = ''
                    """, [tenant_id])
                    print(f"✅ Updated {orphan_count} orphan events")
        
        print(f"\n✅ Calendar schema successfully fixed for tenant {tenant_id}")
        print(f"   The calendar should now work properly for this tenant.")
        
        # Final verification
        print(f"\n📊 Final verification:")
        final_count = Event.objects.filter(tenant_id=tenant_id).count()
        print(f"   Total events for tenant: {final_count}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error fixing calendar schema: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/fix_calendar_schema_for_tenant.py <tenant_id>")
        print("\nExample:")
        print("  python scripts/fix_calendar_schema_for_tenant.py cb86762b-3e32-43bb-963d-f5d5b0bc009e")
        sys.exit(1)
    
    tenant_id = sys.argv[1]
    
    # Fix the schema
    success = fix_calendar_schema_for_tenant(tenant_id)
    
    if success:
        print("\n🎉 Success! The calendar should now work for this tenant.")
        print("   Users can now create and view calendar events.")
    else:
        print("\n❌ Failed to fix calendar schema. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()