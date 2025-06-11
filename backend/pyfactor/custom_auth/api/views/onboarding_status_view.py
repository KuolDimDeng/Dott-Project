"""
Onboarding Status Update View
Handles updating onboarding completion status for Auth0 users
"""

import logging
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from custom_auth.auth0_authentication import Auth0JWTAuthentication
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)
User = get_user_model()


class UpdateOnboardingStatusView(APIView):
    """
    Update user onboarding status to ensure it persists across sessions.
    Endpoint: POST /api/users/update-onboarding-status/
    """
    authentication_classes = [Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            user = request.user
            data = request.data
            
            logger.info(f"[UPDATE_ONBOARDING_STATUS] Request from user: {user.email}")
            logger.info(f"[UPDATE_ONBOARDING_STATUS] Data: {data}")
            
            user_id = data.get('user_id', user.auth0_sub)
            tenant_id = data.get('tenant_id')
            onboarding_completed = data.get('onboarding_completed', False)
            needs_onboarding = data.get('needs_onboarding', True)
            current_step = data.get('current_step', 'business_info')
            
            # Ensure we have a tenant ID
            if not tenant_id:
                logger.error(f"[UPDATE_ONBOARDING_STATUS] No tenant_id provided")
                return Response({
                    'error': 'tenant_id is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            with transaction.atomic():
                # Get or create onboarding progress
                progress, created = OnboardingProgress.objects.get_or_create(
                    user=user,
                    defaults={
                        'tenant_id': tenant_id,
                        'onboarding_status': 'complete' if onboarding_completed else current_step,
                        'current_step': 'complete' if onboarding_completed else current_step,
                        'setup_completed': onboarding_completed
                    }
                )
                
                if not created:
                    # Update existing progress
                    progress.tenant_id = tenant_id
                    if onboarding_completed:
                        progress.onboarding_status = 'complete'
                        progress.current_step = 'complete'
                        progress.setup_completed = True
                        progress.completed_at = timezone.now()
                        if 'complete' not in progress.completed_steps:
                            progress.completed_steps.append('complete')
                    else:
                        progress.onboarding_status = current_step
                        progress.current_step = current_step
                        progress.setup_completed = False
                    
                    progress.save()
                
                # Ensure user has tenant relationship
                if not user.tenant or str(user.tenant.id) != str(tenant_id):
                    tenant = Tenant.objects.filter(id=tenant_id).first()
                    if tenant:
                        user.tenant = tenant
                        user.save(update_fields=['tenant'])
                        logger.info(f"[UPDATE_ONBOARDING_STATUS] Updated user.tenant to {tenant_id}")
                
                logger.info(f"[UPDATE_ONBOARDING_STATUS] Successfully updated status for {user.email}")
                logger.info(f"[UPDATE_ONBOARDING_STATUS] - tenant_id: {tenant_id}")
                logger.info(f"[UPDATE_ONBOARDING_STATUS] - onboarding_completed: {onboarding_completed}")
                logger.info(f"[UPDATE_ONBOARDING_STATUS] - current_step: {progress.current_step}")
                
                return Response({
                    'success': True,
                    'message': 'Onboarding status updated',
                    'data': {
                        'user_id': user.id,
                        'tenant_id': tenant_id,
                        'onboarding_completed': onboarding_completed,
                        'needs_onboarding': not onboarding_completed,
                        'current_step': progress.current_step
                    }
                })
                
        except Exception as e:
            logger.error(f"[UPDATE_ONBOARDING_STATUS] Error: {str(e)}")
            return Response({
                'error': 'Failed to update onboarding status',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)