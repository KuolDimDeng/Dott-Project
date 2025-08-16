"""
Wise API Test View for Staging Environment
This endpoint is for testing Wise integration in staging only.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from banking.services.wise_service import WiseService
import logging

logger = logging.getLogger(__name__)

class WiseTestView(APIView):
    """
    Test endpoint for Wise API integration.
    Only available in staging/development environments.
    """
    
    def get(self, request):
        """
        Test Wise API connection and configuration.
        """
        # Only allow in non-production environments
        if settings.ENVIRONMENT == 'production':
            return Response({
                'error': 'This endpoint is not available in production'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Check configuration
            config_status = {
                'environment': settings.ENVIRONMENT,
                'wise_environment': settings.WISE_ENVIRONMENT,
                'wise_base_url': settings.WISE_BASE_URL,
                'api_token_configured': bool(settings.WISE_API_TOKEN),
                'profile_id_configured': bool(settings.WISE_PROFILE_ID),
            }
            
            # Try to initialize the service
            wise_service = WiseService()
            
            # Test creating a quote (USD to EUR)
            test_quote = None
            if settings.WISE_API_TOKEN and settings.WISE_PROFILE_ID:
                try:
                    test_quote = wise_service.create_quote(
                        source_currency='USD',
                        target_currency='EUR',
                        amount=100
                    )
                    logger.info(f"Successfully created test quote: {test_quote}")
                except Exception as e:
                    logger.error(f"Error creating test quote: {str(e)}")
                    test_quote = {'error': str(e)}
            
            return Response({
                'status': 'success',
                'configuration': config_status,
                'test_quote': test_quote,
                'message': 'Wise API test endpoint is working'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in WiseTestView: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)