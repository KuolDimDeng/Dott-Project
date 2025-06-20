#!/usr/bin/env python3
"""
Implement Session Onboarding Sync in Backend

This script actually implements the fix by patching the session creation
to sync with OnboardingProgress.
"""

import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from session_manager.models import Session
from onboarding.models import OnboardingProgress

print("Implementing Session Onboarding Sync")
print("=" * 50)

# Create a signal handler to sync onboarding status when session is created
@receiver(post_save, sender=Session)
def sync_session_onboarding_status(sender, instance, created, **kwargs):
    """
    When a new session is created, sync its onboarding status with
    the user's OnboardingProgress record.
    """
    if created:  # Only for newly created sessions
        try:
            progress = OnboardingProgress.objects.get(user=instance.user)
            
            # Update session based on actual onboarding progress
            instance.needs_onboarding = progress.status != 'complete'
            instance.onboarding_completed = progress.status == 'complete'
            instance.onboarding_step = progress.current_step
            
            # Save without triggering the signal again
            Session.objects.filter(pk=instance.pk).update(
                needs_onboarding=instance.needs_onboarding,
                onboarding_completed=instance.onboarding_completed,
                onboarding_step=instance.onboarding_step
            )
            
            print(f"✅ Synced session {instance.session_token[:8]}... with OnboardingProgress")
            print(f"   User: {instance.user.email}")
            print(f"   Onboarding Status: {progress.status}")
            print(f"   Needs Onboarding: {instance.needs_onboarding}")
            
        except OnboardingProgress.DoesNotExist:
            # User hasn't started onboarding yet - keep defaults
            print(f"ℹ️  No OnboardingProgress for {instance.user.email} - using defaults")

# Test the implementation
print("\nTesting the implementation...")

try:
    # Find a user who has completed onboarding
    from users.models import User
    test_user = User.objects.filter(
        id__in=OnboardingProgress.objects.filter(status='complete').values_list('user_id', flat=True)
    ).first()
    
    if test_user:
        print(f"\nTest user: {test_user.email}")
        progress = OnboardingProgress.objects.get(user=test_user)
        print(f"OnboardingProgress status: {progress.status}")
        
        # Create a test session
        from uuid import uuid4
        test_session = Session.objects.create(
            user=test_user,
            session_token=str(uuid4()),
            session_type='web'
        )
        
        # Verify it was synced
        test_session.refresh_from_db()
        print(f"\nCreated test session:")
        print(f"  needs_onboarding: {test_session.needs_onboarding}")
        print(f"  onboarding_completed: {test_session.onboarding_completed}")
        print(f"  onboarding_step: {test_session.onboarding_step}")
        
        if test_session.needs_onboarding == False and progress.status == 'complete':
            print("\n✅ SUCCESS! Session properly synced with OnboardingProgress")
        else:
            print("\n❌ FAILED! Session not properly synced")
        
        # Clean up test session
        test_session.delete()
        
except Exception as e:
    print(f"\n⚠️  Test failed: {e}")

print("\n" + "=" * 50)
print("Implementation Complete!")
print("=" * 50)
print("""
The signal handler has been registered for this session.
To make it permanent, add this code to one of these locations:

1. session_manager/signals.py (create if doesn't exist)
2. session_manager/models.py (at the bottom)
3. session_manager/apps.py (in the ready() method)

Example for apps.py:
-------------------
class SessionManagerConfig(AppConfig):
    name = 'session_manager'
    
    def ready(self):
        import session_manager.signals  # Import the signals module

Then create session_manager/signals.py with the sync function above.
""")