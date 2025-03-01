from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.renderers import JSONRenderer
from rest_framework.parsers import JSONParser
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import uuid
import logging

logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class SetupStatusView(APIView):
    """
    View for handling setup status checks without requiring authentication.
    This view provides a lightweight way to check setup status before authentication.
    """
    authentication_classes = []  # No authentication required
    permission_classes = []  # No permissions required
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]

    def get(self, request):
        """Handle GET requests for setup status"""
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        try:
            # For unauthenticated requests, return a basic setup status
            response_data = {
                'status': 'setup_available',
                'setup_id': str(uuid.uuid4()),
                'message': 'Setup is available',
                'requires_auth': False,
                'timestamp': str(uuid.uuid1())
            }
            
            response = Response(response_data, status=status.HTTP_200_OK)
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Credentials"] = "true"
            return response
            
        except Exception as e:
            logger.error(f"Error checking setup status: {str(e)}")
            error_response = Response({
                'error': 'Failed to check setup status',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            error_response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            error_response["Access-Control-Allow-Credentials"] = "true"
            return error_response

    def options(self, request, *args, **kwargs):
        """Handle OPTIONS requests"""
        response = Response()
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Request-Id"
        response["Access-Control-Allow-Credentials"] = "true"
        return response

@method_decorator(csrf_exempt, name='dispatch')
class InitializeSetupView(APIView):
    """
    View for initializing setup process without requiring authentication.
    This allows users to start the setup process before authentication.
    """
    authentication_classes = []  # No authentication required
    permission_classes = []  # No permissions required
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]

    def post(self, request):
        """Handle POST requests to initialize setup"""
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        try:
            # Generate a unique setup ID
            setup_id = str(uuid.uuid4())
            
            # Return setup initialization data
            response_data = {
                'status': 'setup_initialized',
                'setup_id': setup_id,
                'message': 'Setup process initialized successfully',
                'requires_auth': False,
                'next_step': 'business_info',
                'timestamp': str(uuid.uuid1())
            }
            
            response = Response(response_data, status=status.HTTP_200_OK)
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Credentials"] = "true"
            return response
            
        except Exception as e:
            logger.error(f"Error initializing setup: {str(e)}")
            error_response = Response({
                'error': 'Failed to initialize setup',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            error_response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            error_response["Access-Control-Allow-Credentials"] = "true"
            return error_response

    def options(self, request, *args, **kwargs):
        """Handle OPTIONS requests"""
        response = Response()
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Request-Id"
        response["Access-Control-Allow-Credentials"] = "true"
        return response

__all__ = ['SetupStatusView', 'InitializeSetupView']