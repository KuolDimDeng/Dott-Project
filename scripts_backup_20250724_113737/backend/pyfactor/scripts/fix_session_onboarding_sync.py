#!/usr/bin/env python3
"""
Fix Session Creation to Sync with OnboardingProgress

This script updates the session creation logic to check the user's
actual onboarding status from the OnboardingProgress table instead
of defaulting to needs_onboarding=True.
"""

import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import models
from session_manager.models import Session
from onboarding.models import OnboardingProgress
from users.models import User

print("Session Onboarding Sync Fix")
print("=" * 50)

# First, let's check the current state
total_sessions = Session.objects.count()
sessions_needing_onboarding = Session.objects.filter(needs_onboarding=True).count()
users_with_completed_onboarding = OnboardingProgress.objects.filter(status='complete').values_list('user_id', flat=True)
mismatched_sessions = Session.objects.filter(
    user_id__in=users_with_completed_onboarding,
    needs_onboarding=True
).count()

print(f"\nCurrent State:")
print(f"- Total sessions: {total_sessions}")
print(f"- Sessions marked as needing onboarding: {sessions_needing_onboarding}")
print(f"- Users who completed onboarding: {len(users_with_completed_onboarding)}")
print(f"- Mismatched sessions (completed users but session says needs onboarding): {mismatched_sessions}")

if mismatched_sessions > 0:
    print(f"\n⚠️  Found {mismatched_sessions} sessions with incorrect onboarding status!")
    
    # Fix existing sessions
    print("\nFixing existing sessions...")
    updated_count = 0
    
    for session in Session.objects.filter(user_id__in=users_with_completed_onboarding, needs_onboarding=True):
        try:
            progress = OnboardingProgress.objects.get(user=session.user)
            if progress.status == 'complete':
                session.needs_onboarding = False
                session.onboarding_completed = True
                session.onboarding_step = 'complete'
                session.save()
                updated_count += 1
                print(f"  ✅ Fixed session {session.session_token[:8]}... for user {session.user.email}")
        except OnboardingProgress.DoesNotExist:
            print(f"  ⚠️  No OnboardingProgress found for user {session.user.email}")
    
    print(f"\n✅ Updated {updated_count} sessions")
else:
    print("\n✅ No mismatched sessions found!")

print("\n" + "=" * 50)
print("Next Steps - Update Session Creation Logic")
print("=" * 50)

print("""
To prevent this issue in the future, update the session creation logic:

1. In session_manager/views_fixed.py or views.py, find SessionCreateView
2. Update the create method to check OnboardingProgress:

class SessionCreateViewFixed(APIView):
    def post(self, request):
        # ... existing code ...
        
        # After creating the session, sync onboarding status
        session = serializer.save()
        
        # Sync with OnboardingProgress
        try:
            progress = OnboardingProgress.objects.get(user=session.user)
            if progress.status == 'complete':
                session.needs_onboarding = False
                session.onboarding_completed = True
                session.onboarding_step = 'complete'
            else:
                session.needs_onboarding = True
                session.onboarding_completed = False
                session.onboarding_step = progress.current_step
            session.save()
        except OnboardingProgress.DoesNotExist:
            # User hasn't started onboarding yet
            pass
        
        return Response(serializer.data)

3. Or better yet, override the Session model's save method:

class Session(models.Model):
    # ... existing fields ...
    
    def save(self, *args, **kwargs):
        # If this is a new session, sync onboarding status
        if not self.pk:
            try:
                progress = OnboardingProgress.objects.get(user=self.user)
                self.needs_onboarding = progress.status != 'complete'
                self.onboarding_completed = progress.status == 'complete'
                self.onboarding_step = progress.current_step
            except OnboardingProgress.DoesNotExist:
                # Keep defaults
                pass
        
        super().save(*args, **kwargs)
""")