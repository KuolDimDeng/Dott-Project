#!/usr/bin/env python
"""
Create tenant for kdeng@dottapps.com
"""
import os
import sys
import django

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
django.setup()

from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress

User = get_user_model()

# Find the user
user = User.objects.get(email="kdeng@dottapps.com")
print(f"Found user: {user.email} (ID: {user.id})")

# Create tenant
tenant = Tenant.objects.create(
    name="kdeng's Business",
    owner_id=str(user.id)  # Store as string
)
print(f"Created tenant: {tenant.id}")

# Update user.tenant relationship
user.tenant = tenant
user.save(update_fields=['tenant'])
print(f"Updated user.tenant relationship")

# Create onboarding progress as complete
progress, created = OnboardingProgress.objects.get_or_create(
    user=user,
    defaults={
        'tenant_id': tenant.id,
        'onboarding_status': 'complete',
        'setup_completed': True,
        'current_step': 'complete',
        'completed_steps': ['business_info', 'subscription', 'payment', 'setup', 'complete'],
        'selected_plan': 'free',
        'subscription_plan': 'free',
        'payment_completed': True
    }
)

if created:
    print(f"Created onboarding progress as complete")
else:
    # Update existing to complete
    progress.tenant_id = tenant.id
    progress.onboarding_status = 'complete'
    progress.setup_completed = True
    progress.current_step = 'complete'
    if 'complete' not in progress.completed_steps:
        progress.completed_steps.append('complete')
    progress.save()
    print(f"Updated onboarding progress to complete")

print("\n✅ SUCCESS! User now has:")
print(f"   - Tenant: {tenant.id} ({tenant.name})")
print(f"   - Onboarding: Complete")
print(f"   - Ready to access dashboard!")
print("\nSign out and sign back in to test.")