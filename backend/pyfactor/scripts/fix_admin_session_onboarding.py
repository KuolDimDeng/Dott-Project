"""
Quick fix script to sync admin@dottapps.com session with OnboardingProgress

Run this in Django shell:
python manage.py shell < scripts/fix_admin_session_onboarding.py
"""

from session_manager.models import UserSession
from onboarding.models import OnboardingProgress
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

def fix_admin_session():
    """Fix admin@dottapps.com session onboarding status"""
    try:
        # Get user
        user = User.objects.get(email='admin@dottapps.com')
        print(f"Found user: {user.email} (ID: {user.id})")
        
        # Get OnboardingProgress
        try:
            progress = OnboardingProgress.objects.get(user=user)
            print(f"OnboardingProgress status: {progress.onboarding_status}")
            print(f"Setup completed: {progress.setup_completed}")
        except OnboardingProgress.DoesNotExist:
            print("ERROR: No OnboardingProgress found for user")
            return
        
        # Get active sessions
        sessions = UserSession.objects.filter(
            user=user,
            is_active=True,
            expires_at__gt=timezone.now()
        ).order_by('-created_at')
        
        print(f"\nFound {sessions.count()} active sessions")
        
        # Update each session
        for session in sessions:
            print(f"\nSession ID: {session.session_id}")
            print(f"  Current needs_onboarding: {session.needs_onboarding}")
            print(f"  Current onboarding_completed: {session.onboarding_completed}")
            
            # Determine correct values based on OnboardingProgress
            needs_onboarding = progress.onboarding_status != 'complete'
            onboarding_completed = progress.onboarding_status == 'complete'
            
            # Update session
            session.needs_onboarding = needs_onboarding
            session.onboarding_completed = onboarding_completed
            session.onboarding_step = progress.current_step or 'complete'
            session.save()
            
            print(f"  Updated needs_onboarding: {session.needs_onboarding}")
            print(f"  Updated onboarding_completed: {session.onboarding_completed}")
            print(f"  Updated onboarding_step: {session.onboarding_step}")
            print("  ✓ Session updated successfully")
        
        print("\nAll sessions updated successfully!")
        
    except User.DoesNotExist:
        print("ERROR: User admin@dottapps.com not found")
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

# Run the fix
if __name__ == '__main__':
    fix_admin_session()