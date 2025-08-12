"""
Subscription API Views - Centralized Subscription Management
Single Source of Truth for all subscription operations
"""

import logging
import uuid
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes

from custom_auth.auth0_authentication import Auth0JWTAuthentication
from core.authentication.session_token_auth import SessionTokenAuthentication
from users.subscription_service import SubscriptionService
from users.models import Subscription

logger = logging.getLogger(__name__)

class SubscriptionSaveView(APIView):
    """
    API endpoint for saving subscription data
    POST /api/subscriptions/save/
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    
    def post(self, request):
        """
        Save subscription data to database
        
        Expected payload:
        {
            "tenant_id": "uuid",
            "selected_plan": "free|professional|enterprise", 
            "billing_cycle": "monthly|yearly",
            "status": "active"
        }
        """
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        try:
            logger.info(f"[SubscriptionSave] Saving subscription for user: {request.user.email}")
            logger.info(f"[SubscriptionSave] Request data: {request.data}")
            
            # Validate required fields
            required_fields = ['tenant_id', 'selected_plan']
            for field in required_fields:
                if field not in request.data:
                    return Response({
                        'success': False,
                        'error': f'Missing required field: {field}',
                        'request_id': request_id
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            tenant_id = request.data['tenant_id']
            selected_plan = request.data['selected_plan']
            billing_cycle = request.data.get('billing_cycle', 'monthly')
            subscription_status = request.data.get('status', 'active')
            
            # Validate plan
            valid_plans = ['free', 'professional', 'enterprise']
            if selected_plan not in valid_plans:
                return Response({
                    'success': False,
                    'error': f'Invalid plan. Must be one of: {valid_plans}',
                    'request_id': request_id
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate billing cycle
            valid_cycles = ['monthly', 'yearly', '6months']
            if billing_cycle not in valid_cycles:
                return Response({
                    'success': False,
                    'error': f'Invalid billing cycle. Must be one of: {valid_cycles}',
                    'request_id': request_id
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Use subscription service to create/update
            subscription = SubscriptionService.create_or_update_subscription(
                tenant_id=tenant_id,
                plan=selected_plan,
                status=subscription_status,
                billing_cycle=billing_cycle
            )
            
            logger.info(f"[SubscriptionSave] Successfully saved subscription: {subscription.id}")
            
            return Response({
                'success': True,
                'message': 'Subscription saved successfully',
                'subscription': {
                    'id': str(subscription.id),
                    'tenant_id': str(subscription.tenant_id),
                    'selected_plan': subscription.selected_plan,
                    'billing_cycle': subscription.billing_cycle,
                    'status': subscription.status,
                    'is_active': subscription.is_active,
                    'start_date': subscription.start_date.isoformat() if subscription.start_date else None,
                },
                'request_id': request_id
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"[SubscriptionSave] Error saving subscription: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to save subscription',
                'detail': str(e),
                'request_id': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SubscriptionDetailView(APIView):
    """
    API endpoint for retrieving subscription details
    GET /api/subscriptions/detail/
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    renderer_classes = [JSONRenderer]
    
    def get(self, request):
        """
        Get subscription details for authenticated user's tenant
        """
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        try:
            # Get tenant_id from query params or user profile
            tenant_id = request.query_params.get('tenant_id')
            
            if not tenant_id:
                # Get tenant_id from user profile
                try:
                    from users.models import UserProfile
                    profile = UserProfile.objects.get(user=request.user)
                    tenant_id = str(profile.tenant_id)
                except UserProfile.DoesNotExist:
                    return Response({
                        'success': False,
                        'error': 'No tenant found for user',
                        'request_id': request_id
                    }, status=status.HTTP_404_NOT_FOUND)
            
            logger.info(f"[SubscriptionDetail] Getting subscription for tenant: {tenant_id}")
            
            # Get subscription using service
            subscription = SubscriptionService.get_active_subscription(tenant_id)
            
            if not subscription:
                # Return default free subscription data
                return Response({
                    'success': True,
                    'subscription': {
                        'tenant_id': tenant_id,
                        'selected_plan': 'free',
                        'billing_cycle': 'monthly',
                        'status': 'active',
                        'is_active': True,
                        'features': SubscriptionService.get_subscription_features(tenant_id)
                    },
                    'request_id': request_id
                }, status=status.HTTP_200_OK)
            
            return Response({
                'success': True,
                'subscription': {
                    'id': str(subscription.id),
                    'tenant_id': str(subscription.tenant_id),
                    'selected_plan': subscription.selected_plan,
                    'billing_cycle': subscription.billing_cycle,
                    'status': subscription.status,
                    'is_active': subscription.is_active,
                    'start_date': subscription.start_date.isoformat() if subscription.start_date else None,
                    'features': SubscriptionService.get_subscription_features(tenant_id)
                },
                'request_id': request_id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"[SubscriptionDetail] Error getting subscription: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to get subscription details',
                'detail': str(e),
                'request_id': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_status(request):
    """
    LEGACY: Check subscription status (kept for backward compatibility)
    Use SubscriptionService for new implementations
    """
    try:
        # Get tenant_id from user profile
        from users.models import UserProfile
        profile = UserProfile.objects.get(user=request.user)
        tenant_id = str(profile.tenant_id)
        
        # Use new subscription service
        plan = SubscriptionService.get_subscription_plan(tenant_id)
        subscription = SubscriptionService.get_active_subscription(tenant_id)
        
        return Response({
            "expired": False,
            "plan": plan,
            "is_active": subscription.is_active if subscription else True,
            "expiry_date": subscription.end_date.isoformat() if subscription and subscription.end_date else None
        })
        
    except Exception as e:
        logger.error(f"[subscription_status] Error: {str(e)}")
        return Response({"expired": False, "plan": "free", "error": str(e)})