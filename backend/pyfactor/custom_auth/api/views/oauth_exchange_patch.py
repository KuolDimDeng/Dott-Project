"""
Patch for the existing OAuth Exchange View to add better error handling
This can be applied without breaking existing functionality
"""

import logging
from django.db import transaction, IntegrityError
from users.models import UserProfile
from onboarding.models import OnboardingProgress
import traceback

logger = logging.getLogger(__name__)


def patch_oauth_exchange_view():
    """
    Apply improvements to the existing OAuthExchangeView
    """
    from .oauth_exchange_view import OAuthExchangeView
    
    # Save original post method
    original_post = OAuthExchangeView.post
    
    def enhanced_post(self, request):
        """
        Enhanced post method with better error handling
        """
        try:
            # Call original method
            response = original_post(self, request)
            
            # Check if it was successful
            if response.status_code == 200 and response.data.get('success'):
                logger.info("✅ OAuth exchange successful")
            else:
                logger.warning(f"⚠️ OAuth exchange returned status {response.status_code}")
            
            return response
            
        except Exception as e:
            logger.error(f"❌ OAuth exchange failed with exception: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Try to recover
            try:
                from rest_framework.response import Response
                from rest_framework import status
                
                # Check if we at least got the email
                if hasattr(self, '_last_email'):
                    email = self._last_email
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    
                    # Try to get the user
                    user = User.objects.filter(email=email).first()
                    if user:
                        logger.info(f"✅ Found existing user {email} during recovery")
                        return Response({
                            'success': False,
                            'authenticated': True,
                            'recovery_mode': True,
                            'user': {
                                'id': user.id,
                                'email': user.email,
                                'name': user.name or user.get_full_name()
                            },
                            'message': 'Authentication partially successful. Please sign in again.',
                            'needs_onboarding': not user.onboarding_completed
                        }, status=status.HTTP_200_OK)
                
                # If we can't recover, return error
                return Response({
                    'error': 'Authentication failed',
                    'message': 'Please try signing in again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            except Exception as recovery_error:
                logger.error(f"❌ Recovery also failed: {str(recovery_error)}")
                from rest_framework.response import Response
                from rest_framework import status
                return Response({
                    'error': 'Critical authentication failure',
                    'message': 'Please contact support if this persists.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Apply the patch
    OAuthExchangeView.post = enhanced_post
    logger.info("✅ OAuth Exchange View patched with enhanced error handling")
    return True


def ensure_user_completeness(user):
    """
    Ensure a user has all required related objects
    """
    try:
        # Ensure UserProfile exists
        profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={}
        )
        if created:
            logger.info(f"✅ Created missing UserProfile for {user.email}")
        
        # Ensure OnboardingProgress exists for incomplete users
        if not user.onboarding_completed:
            progress, created = OnboardingProgress.objects.get_or_create(
                user=user,
                defaults={
                    'onboarding_status': 'not_started',
                    'current_step': 'business_info',
                    'completed_steps': [],
                    'setup_completed': False,
                    'payment_completed': False,
                }
            )
            if created:
                logger.info(f"✅ Created missing OnboardingProgress for {user.email}")
        
        # Ensure required fields are set
        updated = False
        
        if not user.role:
            user.role = 'OWNER'
            updated = True
        
        if not user.subscription_plan:
            user.subscription_plan = 'free'
            updated = True
        
        if not hasattr(user, 'email_verified') or user.email_verified is None:
            user.email_verified = True  # OAuth users are verified
            updated = True
        
        if updated:
            user.save()
            logger.info(f"✅ Updated missing fields for {user.email}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error ensuring user completeness for {user.email}: {str(e)}")
        return False


def add_user_creation_retry(email, user_info, max_retries=3):
    """
    Retry user creation with exponential backoff
    """
    from django.contrib.auth import get_user_model
    import time
    
    User = get_user_model()
    
    for attempt in range(max_retries):
        try:
            with transaction.atomic():
                # Try to create user
                user, created = User.objects.get_or_create(
                    email=email.lower().strip(),
                    defaults={
                        'first_name': user_info.get('given_name', '')[:30] or email.split('@')[0][:30],
                        'last_name': user_info.get('family_name', '')[:150],
                        'name': user_info.get('name', '')[:255] or email.split('@')[0],
                        'is_active': True,
                        'email_verified': True,
                        'role': 'OWNER',
                        'subscription_plan': 'free',
                    }
                )
                
                if created:
                    user.set_unusable_password()
                    user.save()
                    logger.info(f"✅ Created user {email} on attempt {attempt + 1}")
                
                # Ensure completeness
                ensure_user_completeness(user)
                
                return user, created
                
        except IntegrityError as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff
                logger.warning(f"⚠️ User creation attempt {attempt + 1} failed, retrying in {wait_time}s: {str(e)}")
                time.sleep(wait_time)
            else:
                logger.error(f"❌ Failed to create user after {max_retries} attempts: {str(e)}")
                raise
        
        except Exception as e:
            logger.error(f"❌ Unexpected error creating user: {str(e)}")
            raise
    
    return None, False