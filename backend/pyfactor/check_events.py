from events.models import Event
from django.contrib.auth import get_user_model

User = get_user_model()

# Count total events
total_events = Event.objects.count()
print(f"Total calendar events in database: {total_events}")

# Check for your user's events
try:
    user = User.objects.get(email='kdeng@dottapps.com')
    user_events = Event.objects.filter(tenant_id=user.tenant_id).count()
    print(f"Events for tenant {user.tenant_id}: {user_events}")
    
    # List recent events
    recent_events = Event.objects.filter(tenant_id=user.tenant_id).order_by('-created_at')[:5]
    print("\nRecent events:")
    for event in recent_events:
        print(f"- {event.title} (ID: {event.id}, Created: {event.created_at})")
except User.DoesNotExist:
    print("User not found")