"""
Data API Views for Onboarding
Provides the /api/data/ endpoint that the frontend expects
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

from custom_auth.auth0_authentication import Auth0JWTAuthentication
from core.authentication.session_token_auth import SessionTokenAuthentication
from onboarding.models import OnboardingProgress
from users.models import Business, BusinessDetails

logger = logging.getLogger(__name__)

class OnboardingDataView(APIView):
    """
    API endpoint for retrieving onboarding data including business information
    
    This endpoint provides the data that the frontend expects at /api/onboarding/data/
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    
    def get(self, request):
        """
        Get onboarding data including business information
        
        Returns:
            Response: Onboarding data with business information
        """
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        try:
            logger.info(f"[OnboardingDataView] Getting onboarding data for user: {request.user.email}")
            
            # Get tenant ID from query params
            tenant_id = request.GET.get('tenant_id')
            if not tenant_id:
                logger.warning(f"[OnboardingDataView] No tenant_id provided")
                return Response({
                    'error': 'tenant_id parameter is required',
                    'request_id': request_id
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Set tenant context for RLS
            from custom_auth.rls import set_tenant_context
            set_tenant_context(tenant_id)
            
            # Get onboarding progress for the user
            try:
                progress = OnboardingProgress.objects.get(user=request.user)
                logger.info(f"[OnboardingDataView] Found onboarding progress: {progress.onboarding_status}")
            except OnboardingProgress.DoesNotExist:
                logger.warning(f"[OnboardingDataView] No onboarding progress found for user {request.user.id}")
                return Response({
                    'error': 'Onboarding progress not found',
                    'request_id': request_id
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Initialize response data
            response_data = {
                'onboarding_status': progress.onboarding_status,
                'current_step': progress.current_step,
                'next_step': progress.next_step,
                'selected_plan': progress.selected_plan,
                'subscription_plan': progress.subscription_plan,
                'subscription_type': progress.subscription_plan,  # Alias for compatibility
                'tenant_id': str(progress.tenant_id) if progress.tenant_id else tenant_id,
                'onboarding_completed': progress.onboarding_status == 'complete',
                'request_id': request_id
            }
            
            # Get business information if available
            if progress.business:
                business = progress.business
                logger.info(f"[OnboardingDataView] Found linked business: {business.name}")
                
                # Get business details
                business_details = None
                try:
                    business_details = BusinessDetails.objects.get(business=business)
                except BusinessDetails.DoesNotExist:
                    logger.warning(f"[OnboardingDataView] No business details found for business {business.id}")
                
                # Add business information to response
                response_data.update({
                    'business_name': business.name,
                    'legal_name': business.name,  # Alias for compatibility
                    'business_type': business_details.business_type if business_details else '',
                    'legal_structure': business_details.legal_structure if business_details else '',
                    'country': business_details.country if business_details else '',
                })
                
                # Add other business fields if they exist in metadata
                if progress.metadata:
                    business_info = progress.metadata.get('business-info', {}).get('business_info', {})
                    if business_info:
                        response_data.update({
                            'owner_first_name': business_info.get('ownerFirstName', ''),
                            'owner_last_name': business_info.get('ownerLastName', ''),
                            'phone_number': business_info.get('phoneNumber', ''),
                            'address': business_info.get('address', ''),
                            'state': business_info.get('state', ''),
                        })
            else:
                logger.warning(f"[OnboardingDataView] No business linked to onboarding progress")
                # Set empty business fields
                response_data.update({
                    'business_name': '',
                    'legal_name': '',
                    'business_type': '',
                    'legal_structure': '',
                    'country': '',
                    'owner_first_name': '',
                    'owner_last_name': '',
                    'phone_number': '',
                    'address': '',
                    'state': '',
                })
            
            logger.info(f"[OnboardingDataView] Returning data with business_name: '{response_data.get('business_name', 'NONE')}'")
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"[OnboardingDataView] Error retrieving onboarding data: {str(e)}")
            return Response({
                'error': 'Failed to retrieve onboarding data',
                'detail': str(e),
                'request_id': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)