"""
Simplified onboarding completion endpoint that ensures data consistency
Created to fix redirect loop issue
"""

from django.utils import timezone
from custom_auth.rls import set_tenant_context, clear_tenant_context
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from custom_auth.api.authentication import Auth0JWTAuthentication
from onboarding.models import OnboardingProgress
from user_sessions.models import UserSession
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_all_onboarding(request):
    """
    Complete all onboarding steps and ensure User.onboarding_completed is True.
    This endpoint fixes the redirect loop issue by properly updating all models.
    """
    try:
        user = request.user
        
        with transaction.atomic():
            # 1. Ensure user has a tenant
            if not user.tenant:
                return Response({
                    'error': 'User has no tenant assigned',
                    'details': 'Tenant must be created during onboarding'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            tenant_id = user.tenant.id
            
            # 2. Update or create OnboardingProgress
            progress, created = OnboardingProgress.objects.get_or_create(
                user=user,
                defaults={
                    'tenant_id': tenant_id,
                    'onboarding_status': 'complete',
                    'current_step': 'complete',
                    'setup_completed': True,
                    'payment_completed': True,
                    'completed_steps': ['business_info', 'subscription', 'payment', 'setup', 'complete']
                }
            )
            
            if not created:
                # Update existing progress
                progress.onboarding_status = 'complete'
                progress.current_step = 'complete'
                progress.setup_completed = True
                progress.payment_completed = True
                progress.tenant_id = tenant_id
                
                # Ensure all steps are marked complete
                all_steps = ['business_info', 'subscription', 'payment', 'setup', 'complete']
                progress.completed_steps = list(set(progress.completed_steps + all_steps))
                progress.save()
            
            # 3. CRITICAL: Update User.onboarding_completed (single source of truth)
            user.onboarding_completed = True
            user.onboarding_completed_at = timezone.now()
            
            # Set business_id to match tenant_id (required for HR module)
            if user.tenant and user.tenant.id:
                user.business_id = user.tenant.id
                logger.info(f"[Complete-All] Setting user.business_id to tenant.id: {user.business_id}")
            
            # Log all incoming request data for debugging
            logger.info(f"[Complete-All] Incoming request data: {request.data}")
            logger.info(f"[Complete-All] User email: {user.email}")
            logger.info(f"[Complete-All] Current user data - subscription_plan: {user.subscription_plan}, first_name: '{user.first_name}', last_name: '{user.last_name}'")
            
            # Extract subscription plan from request data
            subscription_plan = request.data.get('subscriptionPlan') or request.data.get('selectedPlan') or 'free'
            if subscription_plan == 'basic':
                subscription_plan = 'free'  # Normalize 'basic' to 'free'
            
            logger.info(f"[Complete-All] Extracted subscription plan: {subscription_plan}")
            
            # Update subscription plan on User model
            if subscription_plan in ['free', 'professional', 'enterprise']:
                user.subscription_plan = subscription_plan
                logger.info(f"[Complete-All] Setting user subscription plan to: {subscription_plan}")
            else:
                logger.warning(f"[Complete-All] Invalid subscription plan: {subscription_plan}")
            
            # Extract user name from request data (for Auth0 users who might not have it set)
            first_name = request.data.get('given_name', '').strip() or request.data.get('first_name', '').strip()
            last_name = request.data.get('family_name', '').strip() or request.data.get('last_name', '').strip()
            
            logger.info(f"[Complete-All] Extracted names from request - first_name: '{first_name}', last_name: '{last_name}'")
            
            # If names are not provided in request, try to extract from user's name field
            if (not first_name or not last_name) and hasattr(user, 'name') and user.name:
                name_parts = user.name.strip().split(' ', 1)
                if not first_name and len(name_parts) >= 1:
                    first_name = name_parts[0]
                    logger.info(f"[Complete-All] Extracted first_name from user.name: '{first_name}'")
                if not last_name and len(name_parts) >= 2:
                    last_name = name_parts[1]
                    logger.info(f"[Complete-All] Extracted last_name from user.name: '{last_name}'")
            
            # If STILL no names, check if user already has data and keep it
            if not first_name and user.first_name:
                first_name = user.first_name
                logger.info(f"[Complete-All] Keeping existing first_name: '{first_name}'")
            if not last_name and user.last_name:
                last_name = user.last_name
                logger.info(f"[Complete-All] Keeping existing last_name: '{last_name}'")
            
            # Final fallback for first name - use email prefix
            if not first_name:
                email_prefix = user.email.split('@')[0]
                first_name = email_prefix.capitalize()
                logger.info(f"[Complete-All] Using email prefix as first_name: '{first_name}'")
            
            # Always update name fields to ensure they're set (even if empty strings become actual names)
            needs_name_update = False
            if first_name and (not user.first_name or user.first_name != first_name):
                user.first_name = first_name
                needs_name_update = True
                logger.info(f"[Complete-All] Setting user.first_name to: '{first_name}'")
            if last_name and (not user.last_name or user.last_name != last_name):
                user.last_name = last_name
                needs_name_update = True
                logger.info(f"[Complete-All] Setting user.last_name to: '{last_name}'")
            
            if needs_name_update:
                logger.info(f"[Complete-All] Name fields will be updated during save")
            
            # Extract and set timezone from request data
            timezone_value = request.data.get('timezone')
            if timezone_value:
                # Validate timezone
                try:
                    import pytz
                    pytz.timezone(timezone_value)
                    user.timezone = timezone_value
                    logger.info(f"[Complete-All] Setting user timezone to: {timezone_value}")
                except:
                    logger.warning(f"[Complete-All] Invalid timezone: {timezone_value}, keeping default")
            elif not user.timezone:
                # Set default timezone if none provided
                user.timezone = 'UTC'
                logger.info(f"[Complete-All] Setting default timezone: UTC")
            
            # Save all user updates
            update_fields = ['onboarding_completed', 'onboarding_completed_at', 'subscription_plan', 'timezone', 'business_id']
            if first_name:
                update_fields.append('first_name')
            if last_name:
                update_fields.append('last_name')
                
            logger.info(f"[Complete-All] Saving user with update_fields: {update_fields}")
            user.save(update_fields=update_fields)
            
            # Log user data after save
            logger.info(f"[Complete-All] After save - subscription_plan: {user.subscription_plan}, first_name: '{user.first_name}', last_name: '{user.last_name}'")
            
            # 4. Update user session
            try:
                # Get all active sessions for the user
                sessions = UserSession.objects.filter(user=user, is_active=True)
                for session in sessions:
                    session.needs_onboarding = False
                    session.onboarding_completed = True
                    session.tenant = user.tenant  # Set the tenant foreign key relationship
                    session.save()
                logger.info(f"Updated {sessions.count()} active sessions for user {user.email}")
            except Exception as e:
                logger.warning(f"Error updating sessions: {e}")
                # Don't fail the whole operation if session update fails
            
            logger.info(f"Successfully completed onboarding for user {user.email} with tenant {tenant_id}")
            
            return Response({
                'success': True,
                'message': 'Onboarding completed successfully',
                'tenant_id': str(tenant_id),
                'onboarding_completed': True,
                'needs_onboarding': False,
                'redirect_url': f'/{tenant_id}/dashboard'
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        logger.error(f"Error completing onboarding: {str(e)}")
        return Response({
            'error': 'Failed to complete onboarding',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
