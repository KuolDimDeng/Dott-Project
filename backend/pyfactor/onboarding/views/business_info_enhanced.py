"""
Enhanced Business Info View that handles currency and creates BusinessSettings
"""
import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from custom_auth.auth0_authentication import Auth0JWTAuthentication
from core.authentication.session_token_auth import SessionTokenAuthentication
from onboarding.serializers_enhanced import BusinessInfoEnhancedSerializer
from onboarding.models import OnboardingProgress

logger = logging.getLogger(__name__)

class SaveBusinessInfoEnhancedView(APIView):
    """
    Enhanced view to save business information including currency preference
    and create BusinessSettings for POS and other features
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]

    def post(self, request, *args, **kwargs):
        """
        Save business information with currency
        
        Expected payload:
        {
            "business_name": "My Business",
            "business_type": "RETAIL",
            "country": "SS",
            "currency": "SSP",  // Auto-detected or user-selected
            "legal_structure": "LLC",
            "date_founded": "2020-01-01"
        }
        """
        try:
            logger.info(f"Saving business info for user {request.user.id}")
            logger.info(f"Request data: {request.data}")
            
            # Create serializer with request context
            serializer = BusinessInfoEnhancedSerializer(
                data=request.data,
                context={'request': request}
            )
            
            if serializer.is_valid():
                # Save business info and create BusinessSettings
                business = serializer.save()
                
                # Get the updated progress
                progress = OnboardingProgress.objects.filter(user=request.user).first()
                
                logger.info(f"Business info saved successfully for user {request.user.id}")
                logger.info(f"Currency set to: {request.data.get('currency', 'USD')}")
                
                return Response({
                    'success': True,
                    'message': 'Business information saved successfully',
                    'business_id': str(business.id),
                    'tenant_id': str(request.user.tenant.id) if request.user.tenant else None,
                    'next_step': 'subscription',
                    'currency': request.data.get('currency', 'USD')
                }, status=status.HTTP_200_OK)
            else:
                logger.error(f"Validation errors: {serializer.errors}")
                return Response({
                    'success': False,
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error saving business info: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to save business information',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request, *args, **kwargs):
        """
        Get existing business information
        """
        try:
            progress = OnboardingProgress.get_for_user(request.user)
            
            if progress and progress.business:
                serializer = BusinessInfoEnhancedSerializer(progress.business)
                data = serializer.to_representation(progress)
                
                # Add currency from BusinessSettings if available
                from users.models import BusinessSettings
                tenant_id = request.user.tenant.id if request.user.tenant else request.user.tenant_id
                
                if tenant_id:
                    business_settings = BusinessSettings.objects.filter(tenant_id=tenant_id).first()
                    if business_settings:
                        data['currency'] = business_settings.preferred_currency_code
                
                return Response({
                    'success': True,
                    'data': data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'error': 'Business information not found'
                }, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            logger.error(f"Error getting business info: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to retrieve business information',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)