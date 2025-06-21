# File: backend/pyfactor/custom_auth/session_fix_patch.py
# This patch fixes the session creation logic to properly check onboarding status
# instead of always setting needs_onboarding=True

from django.db import transaction
from django.utils import timezone
from datetime import timedelta
import uuid
import logging

logger = logging.getLogger(__name__)


def get_user_onboarding_status(user):
    """
    Get the actual onboarding status for a user.
    Returns tuple: (needs_onboarding, tenant_id)
    """
    from onboarding.models import OnboardingProgress
    from users.models import UserProfile
    
    needs_onboarding = True
    tenant_id = None
    
    try:
        # Check OnboardingProgress first - this is the source of truth
        progress = OnboardingProgress.objects.select_related('tenant').get(user=user)
        
        # Check setup_completed field
        needs_onboarding = not progress.setup_completed
        
        # Get tenant if available
        if hasattr(progress, 'tenant') and progress.tenant:
            tenant_id = str(progress.tenant.id)
            
        logger.info(f"[SessionFix] OnboardingProgress for {user.email}: "
                   f"setup_completed={progress.setup_completed}, "
                   f"needs_onboarding={needs_onboarding}, "
                   f"tenant_id={tenant_id}")
        
    except OnboardingProgress.DoesNotExist:
        logger.info(f"[SessionFix] No OnboardingProgress for {user.email}, checking UserProfile")
        
        # Fallback to UserProfile check
        try:
            # Fix the type mismatch - use user.id not user object
            profile = UserProfile.objects.select_related('tenant').get(user_id=user.id)
            if hasattr(profile, 'tenant') and profile.tenant:
                tenant_id = str(profile.tenant.id)
                # If user has tenant, they've likely completed onboarding
                needs_onboarding = False
                logger.info(f"[SessionFix] UserProfile has tenant for {user.email}, "
                           f"setting needs_onboarding=False")
        except UserProfile.DoesNotExist:
            logger.info(f"[SessionFix] No UserProfile for {user.email}, needs_onboarding=True")
        except Exception as e:
            logger.error(f"[SessionFix] Error checking UserProfile: {str(e)}")
    except Exception as e:
        logger.error(f"[SessionFix] Error checking OnboardingProgress: {str(e)}")
    
    return needs_onboarding, tenant_id


def create_session_with_proper_status(user, session_type='web', **kwargs):
    """
    Create a session with the CORRECT onboarding status by checking
    the OnboardingProgress model instead of defaulting to True
    """
    from custom_auth.models import Session
    
    try:
        with transaction.atomic():
            # Generate session ID
            session_id = str(uuid.uuid4())
            
            # Set expiration (24 hours)
            expires_at = timezone.now() + timedelta(hours=24)
            
            # Get ACTUAL onboarding status
            needs_onboarding, tenant_id = get_user_onboarding_status(user)
            
            # Build session data with CORRECT status
            session_data = {
                'user_id': user.id,
                'email': user.email,
                'session_type': session_type,
                'needs_onboarding': needs_onboarding,  # Use actual status!
                'onboarding_completed': not needs_onboarding,
                'created_at': timezone.now().isoformat(),
            }
            
            # Add tenant_id if available
            if tenant_id:
                session_data['tenant_id'] = tenant_id
            
            # Override with any kwargs but log if we're overriding our detected values
            for key, value in kwargs.items():
                if key in ['needs_onboarding', 'tenant_id'] and key in session_data:
                    if session_data[key] != value:
                        logger.warning(f"[SessionFix] Overriding {key}: "
                                     f"detected={session_data[key]}, "
                                     f"provided={value}")
                session_data[key] = value
            
            # Create session
            session = Session.objects.create(
                session_id=session_id,
                user=user,
                expires_at=expires_at,
                data=session_data,
                is_active=True
            )
            
            logger.info(f"[SessionFix] Created session for {user.email}: "
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
        logger.error(f"[SessionFix] Error creating session: {str(e)}")
        raise


def apply_session_fix():
    """
    Apply the fix to SessionService by monkey patching the create_session method
    """
    try:
        from custom_auth.services import SessionService
        
        # Store original method for fallback
        if not hasattr(SessionService, '_original_create_session'):
            SessionService._original_create_session = SessionService.create_session
        
        # Replace with our fixed version
        SessionService.create_session = staticmethod(create_session_with_proper_status)
        
        logger.info("✅ [SessionFix] SessionService.create_session patched successfully")
        
        # Also try to fix the session sync if it exists
        try:
            if hasattr(SessionService, 'sync_session_onboarding_status'):
                original_sync = SessionService.sync_session_onboarding_status
                
                @staticmethod
                def sync_with_fix(session):
                    """Fixed sync that doesn't error on missing attributes"""
                    try:
                        from onboarding.models import OnboardingProgress
                        
                        user = session.user
                        progress = OnboardingProgress.objects.get(user=user)
                        
                        # Use setup_completed, not status
                        session.data['needs_onboarding'] = not progress.setup_completed
                        session.data['onboarding_completed'] = progress.setup_completed
                        
                        if hasattr(progress, 'tenant') and progress.tenant:
                            session.data['tenant_id'] = str(progress.tenant.id)
                        
                        session.save()
                        logger.info(f"[SessionFix] Synced session for {user.email}")
                        
                    except OnboardingProgress.DoesNotExist:
                        logger.info(f"[SessionFix] No OnboardingProgress to sync for session {session.session_id}")
                    except Exception as e:
                        logger.error(f"[SessionFix] Error syncing session: {str(e)}")
                
                SessionService.sync_session_onboarding_status = sync_with_fix
                logger.info("✅ [SessionFix] SessionService.sync_session_onboarding_status also patched")
                
        except Exception as e:
            logger.info(f"[SessionFix] Could not patch sync method: {str(e)}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ [SessionFix] Failed to patch SessionService: {str(e)}")
        return False


# Auto-apply on import if running in Django
try:
    from django.conf import settings
    if settings.configured:
        apply_session_fix()
except:
    pass