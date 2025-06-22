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
            
            # Extract subscription plan from request data
            subscription_plan = request.data.get('subscriptionPlan') or request.data.get('selectedPlan') or 'free'
            if subscription_plan == 'basic':
                subscription_plan = 'free'  # Normalize 'basic' to 'free'
            
            # Update subscription plan on User model
            if subscription_plan in ['free', 'professional', 'enterprise']:
                user.subscription_plan = subscription_plan
                logger.info(f"Setting user subscription plan to: {subscription_plan}")
            
            # Extract user name from request data (for Auth0 users who might not have it set)
            first_name = request.data.get('given_name', '').strip() or request.data.get('first_name', '').strip()
            last_name = request.data.get('family_name', '').strip() or request.data.get('last_name', '').strip()
            
            # If names are not provided in request, try to extract from user's name field
            if not first_name and not last_name and user.name:
                name_parts = user.name.strip().split(' ', 1)
                if len(name_parts) >= 1:
                    first_name = name_parts[0]
                if len(name_parts) >= 2:
                    last_name = name_parts[1]
            
            # Update name fields if we have them
            if first_name:
                user.first_name = first_name
            if last_name:
                user.last_name = last_name
            
            # Save all user updates
            update_fields = ['onboarding_completed', 'onboarding_completed_at', 'subscription_plan']
            if first_name:
                update_fields.append('first_name')
            if last_name:
                update_fields.append('last_name')
                
            user.save(update_fields=update_fields)
            
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
