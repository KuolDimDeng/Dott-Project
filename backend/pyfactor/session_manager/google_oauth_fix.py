# Fix for Google OAuth session creation
# This ensures that Google OAuth users get the correct onboarding status

import logging
from django.db import transaction as db_transaction
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


def fix_google_oauth_session_creation(view_class):
    """
    Decorator to fix Google OAuth session creation in the API view.
    This ensures that the onboarding status is checked properly.
    """
    
    # Store original post method
    original_post = view_class.post
    
    def fixed_post(self, request, *args, **kwargs):
        """Fixed post method that checks actual onboarding status"""
        
        # Check if this is a Google OAuth request
        is_google_oauth = False
        if hasattr(request, 'user') and request.user.is_authenticated:
            # Check if user has Google OAuth provider
            try:
                from custom_auth.models import User
                user = request.user
                
                # Simple heuristic: if email contains gmail or user has no password set
                if '@gmail.com' in user.email or not user.has_usable_password():
                    is_google_oauth = True
                    logger.info(f"[GoogleOAuthFix] Detected Google OAuth user: {user.email}")
            except Exception as e:
                logger.error(f"[GoogleOAuthFix] Error checking user type: {e}")
        
        if is_google_oauth:
            # For Google OAuth users, we need to check their actual onboarding status
            try:
                from onboarding.models import OnboardingProgress
                from users.models import UserProfile
                
                user = request.user
                needs_onboarding = True
                onboarding_completed = False
                
                # Check OnboardingProgress
                try:
                    progress = OnboardingProgress.objects.get(user=user)
                    if progress.setup_completed:
                        needs_onboarding = False
                        onboarding_completed = True
                        logger.info(f"[GoogleOAuthFix] User {user.email} has completed onboarding")
                except OnboardingProgress.DoesNotExist:
                    # Check if user has a tenant through UserProfile
                    try:
                        profile = UserProfile.objects.get(user_id=user.id)
                        if profile.tenant:
                            needs_onboarding = False
                            onboarding_completed = True
                            logger.info(f"[GoogleOAuthFix] User {user.email} has tenant, assuming onboarding complete")
                    except UserProfile.DoesNotExist:
                        pass
                
                # Override request data with correct onboarding status
                if hasattr(request, 'data') and isinstance(request.data, dict):
                    request.data['needs_onboarding'] = needs_onboarding
                    request.data['onboarding_completed'] = onboarding_completed
                    logger.info(f"[GoogleOAuthFix] Set needs_onboarding={needs_onboarding} for {user.email}")
                
            except Exception as e:
                logger.error(f"[GoogleOAuthFix] Error fixing onboarding status: {e}")
        
        # Call original method
        return original_post(self, request, *args, **kwargs)
    
    # Replace the post method
    view_class.post = fixed_post
    
    logger.info("✅ [GoogleOAuthFix] Applied fix to session creation view")
    
    return view_class


def apply_google_oauth_fix():
    """Apply the Google OAuth fix to the session creation view"""
    try:
        from session_manager.views import SessionCreateView
        
        # Apply the decorator
        fix_google_oauth_session_creation(SessionCreateView)
        
        logger.info("✅ [GoogleOAuthFix] Successfully applied Google OAuth session fix")
        return True
        
    except Exception as e:
        logger.error(f"❌ [GoogleOAuthFix] Failed to apply fix: {e}")
        return False