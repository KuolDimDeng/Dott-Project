"""
Test the session creation fix

Usage:
    python manage.py test_session_fix [email]
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from custom_auth.services import SessionService
from onboarding.models import OnboardingProgress
import json

User = get_user_model()


class Command(BaseCommand):
    help = 'Test the session creation fix for Google OAuth users'

    def add_arguments(self, parser):
        parser.add_argument(
            'email',
            nargs='?',
            type=str,
            help='Email address to test (optional)'
        )

    def handle(self, *args, **options):
        email = options.get('email')
        
        if email:
            self.test_specific_user(email)
        else:
            self.test_recent_users()
    
    def test_specific_user(self, email):
        """Test session creation for a specific user"""
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f"\nTesting session creation for: {email}")
            
            # Check OnboardingProgress
            self.stdout.write("\n1. Checking OnboardingProgress:")
            try:
                progress = OnboardingProgress.objects.get(user=user)
                self.stdout.write(f"   - setup_completed: {progress.setup_completed}")
                self.stdout.write(f"   - business_name: {progress.business_name}")
                self.stdout.write(f"   - tenant_id: {getattr(progress, 'tenant_id', 'N/A')}")
                expected_needs_onboarding = not progress.setup_completed
            except OnboardingProgress.DoesNotExist:
                self.stdout.write("   - No OnboardingProgress record")
                expected_needs_onboarding = True
            
            # Create a test session
            self.stdout.write("\n2. Creating test session:")
            session_data = SessionService.create_session(user, session_type='test')
            
            self.stdout.write(f"   - session_id: {session_data['session_id'][:8]}...")
            self.stdout.write(f"   - needs_onboarding: {session_data['needs_onboarding']}")
            self.stdout.write(f"   - onboarding_completed: {session_data.get('onboarding_completed', 'N/A')}")
            self.stdout.write(f"   - tenant_id: {session_data.get('tenant_id', 'N/A')}")
            
            # Check if it matches expected
            self.stdout.write("\n3. Verification:")
            if session_data['needs_onboarding'] == expected_needs_onboarding:
                self.stdout.write(self.style.SUCCESS("   ✅ Session has CORRECT onboarding status!"))
            else:
                self.stdout.write(self.style.ERROR(
                    f"   ❌ Session has WRONG onboarding status! "
                    f"Expected: {expected_needs_onboarding}, Got: {session_data['needs_onboarding']}"
                ))
            
            # Clean up test session
            from custom_auth.models import Session
            Session.objects.filter(session_id=session_data['session_id']).delete()
            self.stdout.write("\n   (Test session cleaned up)")
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"User {email} not found"))
    
    def test_recent_users(self):
        """Test session creation for recent users"""
        self.stdout.write("\nTesting session creation for recent users...")
        
        # Get last 5 users
        recent_users = User.objects.order_by('-date_joined')[:5]
        
        if not recent_users:
            self.stdout.write("No users found")
            return
        
        for user in recent_users:
            self.stdout.write(f"\n{'='*50}")
            self.test_specific_user(user.email)