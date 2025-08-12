"""
Fix Session Creation Logic for Google OAuth Users

This script patches the session creation logic to properly check
OnboardingProgress status instead of always setting needs_onboarding=True.

The issue is in the SessionService.create_session() method which
defaults to needs_onboarding=True without checking if the user
has actually completed onboarding.
"""

# This is a Django management command that should be placed in:
# backend/pyfactor/custom_auth/management/commands/fix_session_creation.py

from django.core.management.base import BaseCommand
from django.db import transaction
import inspect
import textwrap

class Command(BaseCommand):
    help = 'Fix session creation logic to properly check onboarding status'

    def handle(self, *args, **options):
        self.stdout.write("Analyzing session creation logic...")
        
        # First, let's create the fixed session service
        fixed_code = '''
# File: backend/pyfactor/custom_auth/services_fixed.py
# This is the FIXED version of SessionService that properly checks onboarding status

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
import uuid
import logging

from custom_auth.models import Session
from onboarding.models import OnboardingProgress
from users.models import UserProfile, Tenant

User = get_user_model()
logger = logging.getLogger(__name__)


class SessionServiceFixed:
    """Fixed session service that properly checks onboarding status"""
    
    @staticmethod
    def create_session(user, session_type='web', **kwargs):
        """
        Create a new session for a user with PROPER onboarding status checking
        """
        try:
            with transaction.atomic():
                # Generate session ID
                session_id = str(uuid.uuid4())
                
                # Set expiration (24 hours)
                expires_at = timezone.now() + timedelta(hours=24)
                
                # Get user's actual onboarding status from OnboardingProgress
                needs_onboarding = True  # Default
                tenant_id = None
                
                try:
                    # Check OnboardingProgress model for actual status
                    progress = OnboardingProgress.objects.select_related('tenant').get(user=user)
                    
                    # User has completed onboarding if setup_completed is True
                    needs_onboarding = not progress.setup_completed
                    
                    # Get tenant ID if available
                    if progress.tenant:
                        tenant_id = str(progress.tenant.id)
                    
                    logger.info(f"[SessionService] Found OnboardingProgress for {user.email}: "
                              f"setup_completed={progress.setup_completed}, "
                              f"needs_onboarding={needs_onboarding}, "
                              f"tenant_id={tenant_id}")
                    
                except OnboardingProgress.DoesNotExist:
                    # No progress record means user needs onboarding
                    logger.info(f"[SessionService] No OnboardingProgress for {user.email}, needs_onboarding=True")
                    needs_onboarding = True
                
                # Also check UserProfile for tenant
                if not tenant_id:
                    try:
                        # Fix the type mismatch issue - use user.id not user object
                        profile = UserProfile.objects.select_related('tenant').get(user_id=user.id)
                        if profile.tenant:
                            tenant_id = str(profile.tenant.id)
                            # If user has a tenant, they've likely completed onboarding
                            if needs_onboarding and tenant_id:
                                logger.warning(f"[SessionService] User {user.email} has tenant but "
                                             f"OnboardingProgress says needs_onboarding=True. "
                                             f"Setting needs_onboarding=False")
                                needs_onboarding = False
                    except UserProfile.DoesNotExist:
                        logger.info(f"[SessionService] No UserProfile for {user.email}")
                    except Exception as e:
                        logger.error(f"[SessionService] Error checking UserProfile: {str(e)}")
                
                # Build session data with CORRECT onboarding status
                session_data = {
                    'user_id': user.id,
                    'email': user.email,
                    'session_type': session_type,
                    'needs_onboarding': needs_onboarding,
                    'onboarding_completed': not needs_onboarding,
                    'created_at': timezone.now().isoformat(),
                }
                
                # Add tenant_id if available
                if tenant_id:
                    session_data['tenant_id'] = tenant_id
                
                # Add any additional kwargs
                session_data.update(kwargs)
                
                # Create session
                session = Session.objects.create(
                    session_id=session_id,
                    user=user,
                    expires_at=expires_at,
                    data=session_data,
                    is_active=True
                )
                
                logger.info(f"[SessionService] Created session for {user.email}: "
                          f"needs_onboarding={needs_onboarding}, "
                          f"tenant_id={tenant_id}")
                
                return {
                    'session_id': session_id,
                    'session_token': session_id,
                    'expires_at': expires_at.isoformat(),
                    'needs_onboarding': needs_onboarding,
                    'onboarding_completed': not needs_onboarding,
                    'tenant_id': tenant_id,
                    'user_id': user.id,
                    'email': user.email,
                }
                
        except Exception as e:
            logger.error(f"[SessionService] Error creating session: {str(e)}")
            raise


# Monkey patch to fix the issue immediately
def patch_session_service():
    """Apply the fix to the existing SessionService"""
    try:
        from custom_auth.services import SessionService
        
        # Replace the create_session method with our fixed version
        SessionService.create_session = SessionServiceFixed.create_session
        
        print("✅ Successfully patched SessionService.create_session")
        return True
        
    except Exception as e:
        print(f"❌ Failed to patch SessionService: {str(e)}")
        return False


# Also fix the session viewset if it exists
def fix_session_viewset():
    """Fix the session creation endpoint to use proper logic"""
    
    viewset_fix = """
# Add this to your SessionViewSet.create method:

from onboarding.models import OnboardingProgress

class SessionViewSet(viewsets.ModelViewSet):
    # ... existing code ...
    
    def create(self, request):
        \"\"\"Create a new session with PROPER onboarding checking\"\"\"
        try:
            user = request.user
            
            # Check actual onboarding status
            needs_onboarding = True
            tenant_id = None
            
            try:
                progress = OnboardingProgress.objects.select_related('tenant').get(user=user)
                needs_onboarding = not progress.setup_completed
                if progress.tenant:
                    tenant_id = str(progress.tenant.id)
            except OnboardingProgress.DoesNotExist:
                pass
            
            # Create session with correct status
            session_data = SessionService.create_session(
                user=user,
                session_type=request.data.get('session_type', 'web'),
                needs_onboarding=needs_onboarding,
                tenant_id=tenant_id
            )
            
            return Response(session_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
"""
    
    print("\n📝 Add this fix to your SessionViewSet:")
    print(viewset_fix)


if __name__ == "__main__":
    patch_session_service()
'''
        
        # Write the fixed service code
        with open('/tmp/session_service_fix.py', 'w') as f:
            f.write(fixed_code)
        
        self.stdout.write(self.style.SUCCESS('\n✅ Fixed session service code written to /tmp/session_service_fix.py'))
        
        # Now create the actual Django patch
        patch_code = '''
# File: backend/pyfactor/custom_auth/session_fix_patch.py
# Apply this patch to fix the session creation logic

from onboarding.models import OnboardingProgress
from users.models import UserProfile
import logging

logger = logging.getLogger(__name__)

def get_user_onboarding_status(user):
    """
    Get the actual onboarding status for a user.
    Returns tuple: (needs_onboarding, tenant_id)
    """
    needs_onboarding = True
    tenant_id = None
    
    try:
        # Check OnboardingProgress first
        progress = OnboardingProgress.objects.select_related('tenant').get(user=user)
        needs_onboarding = not progress.setup_completed
        
        if progress.tenant:
            tenant_id = str(progress.tenant.id)
            
        logger.info(f"OnboardingProgress for {user.email}: setup_completed={progress.setup_completed}")
        
    except OnboardingProgress.DoesNotExist:
        logger.info(f"No OnboardingProgress for {user.email}")
        
        # Fallback to UserProfile check
        try:
            profile = UserProfile.objects.select_related('tenant').get(user_id=user.id)
            if profile.tenant:
                tenant_id = str(profile.tenant.id)
                # If user has tenant, they've completed onboarding
                needs_onboarding = False
                logger.info(f"UserProfile has tenant for {user.email}, setting needs_onboarding=False")
        except UserProfile.DoesNotExist:
            pass
    
    return needs_onboarding, tenant_id


# Monkey patch for immediate fix
def apply_session_fix():
    """Apply the fix to SessionService"""
    try:
        from custom_auth.services import SessionService
        
        # Store original method
        original_create = SessionService.create_session
        
        @staticmethod
        def create_session_fixed(user, session_type='web', **kwargs):
            # Get actual onboarding status
            needs_onboarding, tenant_id = get_user_onboarding_status(user)
            
            # Override the kwargs with correct values
            kwargs['needs_onboarding'] = needs_onboarding
            kwargs['onboarding_completed'] = not needs_onboarding
            if tenant_id:
                kwargs['tenant_id'] = tenant_id
            
            # Call original with corrected kwargs
            result = original_create(user, session_type, **kwargs)
            
            # Fix the result if needed
            if isinstance(result, dict):
                result['needs_onboarding'] = needs_onboarding
                result['onboarding_completed'] = not needs_onboarding
                if tenant_id:
                    result['tenant_id'] = tenant_id
            
            return result
        
        # Replace method
        SessionService.create_session = create_session_fixed
        
        logger.info("✅ SessionService.create_session patched successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to patch SessionService: {str(e)}")
        return False
'''
        
        with open('/tmp/session_fix_patch.py', 'w') as f:
            f.write(patch_code)
            
        self.stdout.write(self.style.SUCCESS('✅ Session fix patch written to /tmp/session_fix_patch.py'))
        
        # Instructions for applying the fix
        self.stdout.write(self.style.WARNING('\n📋 To apply this fix:'))
        self.stdout.write('\n1. Copy the patch file to your backend:')
        self.stdout.write('   cp /tmp/session_fix_patch.py backend/pyfactor/custom_auth/')
        
        self.stdout.write('\n2. Add to your Django app initialization (e.g., in custom_auth/apps.py):')
        self.stdout.write('''
from django.apps import AppConfig

class CustomAuthConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'custom_auth'
    
    def ready(self):
        # Apply session creation fix
        from .session_fix_patch import apply_session_fix
        apply_session_fix()
''')
        
        self.stdout.write('\n3. Or add to your settings.py at the bottom:')
        self.stdout.write('''
# Apply session creation fix
from custom_auth.session_fix_patch import apply_session_fix
apply_session_fix()
''')
        
        self.stdout.write(self.style.SUCCESS('\n✅ Fix is ready to apply!'))