#!/usr/bin/env python
"""
Sample data for testing the calendar events app.
Run this from the Django shell: python manage.py shell < events/sample_data.py
"""

from datetime import datetime, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from events.models import Event
from custom_auth.models import Tenant

User = get_user_model()

# Get the first tenant and user for testing
try:
    tenant = Tenant.objects.filter(is_active=True).first()
    if not tenant:
        print("No active tenant found. Please create a tenant first.")
        exit(1)
    
    user = User.objects.filter(tenant=tenant).first()
    if not user:
        print("No user found for tenant. Please create a user first.")
        exit(1)
    
    print(f"Using tenant: {tenant.name} (ID: {tenant.id})")
    print(f"Using user: {user.email}")
    
    # Create sample events
    now = timezone.now()
    
    events_data = [
        {
            'title': 'Team Meeting',
            'start_datetime': now.replace(hour=10, minute=0) + timedelta(days=1),
            'end_datetime': now.replace(hour=11, minute=0) + timedelta(days=1),
            'event_type': 'meeting',
            'location': 'Conference Room A',
            'reminder_minutes': 15,
            'description': 'Weekly team sync meeting'
        },
        {
            'title': 'Client Presentation',
            'start_datetime': now.replace(hour=14, minute=0) + timedelta(days=2),
            'end_datetime': now.replace(hour=15, minute=30) + timedelta(days=2),
            'event_type': 'appointment',
            'location': 'Zoom',
            'reminder_minutes': 30,
            'description': 'Q4 results presentation to client'
        },
        {
            'title': 'Tax Filing Deadline',
            'start_datetime': now.replace(hour=17, minute=0) + timedelta(days=7),
            'end_datetime': now.replace(hour=17, minute=0) + timedelta(days=7),
            'event_type': 'deadline',
            'reminder_minutes': 1440,  # 24 hours
            'description': 'Quarterly tax filing deadline'
        },
        {
            'title': 'Office Birthday Party',
            'start_datetime': now.replace(hour=16, minute=0) + timedelta(days=3),
            'end_datetime': now.replace(hour=17, minute=0) + timedelta(days=3),
            'event_type': 'personal',
            'location': 'Break Room',
            'description': 'Birthday celebration for Sarah'
        },
        {
            'title': 'Product Launch',
            'start_datetime': now.replace(hour=9, minute=0) + timedelta(days=14),
            'end_datetime': now.replace(hour=18, minute=0) + timedelta(days=14),
            'event_type': 'business',
            'all_day': True,
            'description': 'New product line launch event'
        },
    ]
    
    created_count = 0
    for event_data in events_data:
        event, created = Event.objects.get_or_create(
            title=event_data['title'],
            tenant_id=tenant.id,
            defaults={
                **event_data,
                'created_by': user
            }
        )
        if created:
            created_count += 1
            print(f"✅ Created event: {event.title}")
        else:
            print(f"⚠️  Event already exists: {event.title}")
    
    print(f"\n✅ Created {created_count} new events")
    print(f"Total events for tenant: {Event.objects.filter(tenant_id=tenant.id).count()}")
    
except Exception as e:
    print(f"❌ Error creating sample data: {e}")
    import traceback
    traceback.print_exc()