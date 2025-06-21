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
    Returns tuple: (needs_onboarding, onboarding_completed, tenant)
    """
    from onboarding.models import OnboardingProgress
    from users.models import UserProfile
    from custom_auth.models import Tenant
    
    # CRITICAL FIX: Check if user has a tenant FIRST
    # If they have a tenant, they MUST have completed onboarding
    if hasattr(user, 'tenant') and user.tenant:
        logger.info(f"[SessionFix] User {user.email} has tenant {user.tenant.name} - onboarding MUST be complete")
        return False, True, user.tenant
    
    needs_onboarding = True
    onboarding_completed = False
    tenant = None
    
    try:
        # Check OnboardingProgress first - this is the source of truth
        # Fix: OnboardingProgress has 'business' relation, not 'tenant'
        progress = OnboardingProgress.objects.select_related('business').get(user=user)
        
        # Check multiple conditions for completed onboarding
        if progress.setup_completed:
            needs_onboarding = False
            onboarding_completed = True
        elif progress.payment_completed or progress.selected_plan == 'free':
            # Payment completed or free plan = onboarding done
            needs_onboarding = False
            onboarding_completed = True
        elif (progress.business_info_completed and 
              progress.subscription_selected and 
              progress.business is not None):
            # All steps complete and has business = onboarding done
            needs_onboarding = False
            onboarding_completed = True
        else:
            # Still in progress
            needs_onboarding = not progress.setup_completed
            onboarding_completed = progress.setup_completed
        
        # Get tenant from business if available
        if hasattr(progress, 'business') and progress.business:
            # Business is not a Tenant - need to get the actual tenant from user
            tenant = user.tenant if hasattr(user, 'tenant') and user.tenant else None
            # If we have a business, onboarding should be complete
            if progress.business and needs_onboarding:
                logger.warning(f"[SessionFix] User {user.email} has business but needs_onboarding=True - fixing")
                needs_onboarding = False
                onboarding_completed = True
            
        logger.info(f"[SessionFix] OnboardingProgress for {user.email}: "
                   f"setup_completed={progress.setup_completed}, "
                   f"payment_completed={progress.payment_completed}, "
                   f"selected_plan={progress.selected_plan}, "
                   f"needs_onboarding={needs_onboarding}, "
                   f"tenant={tenant.id if tenant else None}")
        
    except OnboardingProgress.DoesNotExist:
        logger.info(f"[SessionFix] No OnboardingProgress for {user.email}, checking UserProfile")
        
        # Fallback to UserProfile check
        try:
            # Fix the type mismatch - use user.id not user object
            profile = UserProfile.objects.select_related('tenant').get(user_id=user.id)
            if profile.tenant:
                tenant = profile.tenant
                # If user has tenant, they've completed onboarding
                needs_onboarding = False
                onboarding_completed = True
                logger.info(f"[SessionFix] UserProfile has tenant for {user.email}, "
                           f"onboarding is complete")
        except UserProfile.DoesNotExist:
            logger.info(f"[SessionFix] No UserProfile for {user.email}, needs_onboarding=True")
        except Exception as e:
            logger.error(f"[SessionFix] Error checking UserProfile: {str(e)}")
    except Exception as e:
        logger.error(f"[SessionFix] Error checking OnboardingProgress: {str(e)}")
    
    return needs_onboarding, onboarding_completed, tenant


def create_session_with_proper_status(user, access_token, request_meta=None, **kwargs):
    """
    Create a session with the CORRECT onboarding status by checking
    the OnboardingProgress model instead of defaulting to True
    """
    from session_manager.services import session_service
    import hashlib
    
    try:
        # Get ACTUAL onboarding status
        needs_onboarding, onboarding_completed, tenant = get_user_onboarding_status(user)
        
        # Log what we're going to do
        logger.info(f"[SessionFix] Creating session for {user.email} with: "
                   f"needs_onboarding={needs_onboarding}, "
                   f"onboarding_completed={onboarding_completed}, "
                   f"tenant={tenant.id if tenant else None}")
        
        # Override kwargs with our detected values
        kwargs['needs_onboarding'] = needs_onboarding
        kwargs['onboarding_completed'] = onboarding_completed
        if tenant:
            kwargs['tenant'] = tenant
        
        # Call the original service to create session
        # This now uses the correct UserSession model structure
        session = session_service.create_session(
            user=user,
            access_token=access_token,
            request_meta=request_meta,
            **kwargs
        )
        
        logger.info(f"[SessionFix] Session created successfully for {user.email}: "
                   f"session_id={session.session_id}, "
                   f"needs_onboarding={session.needs_onboarding}")
        
        return session
            
    except Exception as e:
        logger.error(f"[SessionFix] Error creating session: {str(e)}")
        import traceback
        logger.error(f"[SessionFix] Traceback: {traceback.format_exc()}")
        raise


def apply_session_fix():
    """
    Apply the fix to SessionService by intercepting the create_session method
    to ensure it checks actual onboarding status
    """
    try:
        from session_manager.services import session_service
        
        # Store original method for fallback
        if not hasattr(session_service, '_original_create_session'):
            session_service._original_create_session = session_service.create_session
        
        # Create a wrapper that fixes the onboarding status
        def create_session_wrapper(self, user, access_token, request_meta=None, **kwargs):
            """Wrapper that ensures correct onboarding status is used"""
            # Get ACTUAL onboarding status
            needs_onboarding, onboarding_completed, tenant = get_user_onboarding_status(user)
            
            # Override with our detected values
            kwargs['needs_onboarding'] = needs_onboarding
            kwargs['onboarding_completed'] = onboarding_completed
            if tenant:
                kwargs['tenant'] = tenant
            elif 'tenant' in kwargs:
                # If a Business object was passed as tenant, remove it
                # The service will handle getting the proper tenant from the user
                if hasattr(kwargs.get('tenant'), 'owner_id'):
                    logger.warning(f"[SessionFix] Removing invalid tenant (Business object) from kwargs")
                    kwargs.pop('tenant', None)
                
            logger.info(f"[SessionFix] Intercepted create_session for {user.email}: "
                       f"setting needs_onboarding={needs_onboarding}")
            
            # Call original method with corrected values
            return self._original_create_session(user, access_token, request_meta, **kwargs)
        
        # Bind the wrapper to the instance
        import types
        session_service.create_session = types.MethodType(create_session_wrapper, session_service)
        
        logger.info("✅ [SessionFix] session_service.create_session wrapped successfully")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ [SessionFix] Failed to wrap session_service: {str(e)}")
        import traceback
        logger.error(f"[SessionFix] Traceback: {traceback.format_exc()}")
        return False


# Auto-apply on import if running in Django
try:
    from django.conf import settings
    if settings.configured:
        apply_session_fix()
except:
    pass