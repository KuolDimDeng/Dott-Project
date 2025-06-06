"""
Simple Auth0 Authentication Test Endpoint
"""

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from custom_auth.auth0_authentication import Auth0JWTAuthentication
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)

class Auth0TestView(APIView):
    \"\"\"
    Simple test endpoint to verify Auth0 authentication is working
    \"\"\"
    authentication_classes = [Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        \"\"\"Test GET endpoint for Auth0 authentication\"\"\"
        try:
            logger.info(f"🧪 Auth0 test endpoint called by user: {request.user.email}")
            
            user_data = {
                'success': True,
                'message': 'Auth0 authentication working correctly',
                'user': {
                    'id': request.user.pk,
                    'email': request.user.email,
                    'auth0_sub': getattr(request.user, 'auth0_sub', None),
                    'tenant': getattr(request.user, 'tenant_id', None),
                    'is_authenticated': request.user.is_authenticated,
                },
                'request_info': {
                    'path': request.path,
                    'method': request.method,
                    'has_auth_header': 'HTTP_AUTHORIZATION' in request.META,
                }
            }
            
            logger.info(f"✅ Auth0 test successful for: {request.user.email}")
            return Response(user_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Auth0 test endpoint error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e),
                'message': 'Auth0 authentication test failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        \"\"\"Test POST endpoint for Auth0 authentication\"\"\"
        try:
            data = request.data
            logger.info(f"🧪 Auth0 test POST endpoint called by user: {request.user.email}")
            logger.info(f"🧪 Received data: {data}")
            
            response_data = {
                'success': True,
                'message': 'Auth0 authentication working correctly for POST',
                'user': {
                    'id': request.user.pk,
                    'email': request.user.email,
                    'auth0_sub': getattr(request.user, 'auth0_sub', None),
                },
                'received_data': data,
                'echo': f"Hello {request.user.email}, your POST request was authenticated!"
            }
            
            logger.info(f"✅ Auth0 test POST successful for: {request.user.email}")
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Auth0 test POST endpoint error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e),
                'message': 'Auth0 authentication POST test failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 