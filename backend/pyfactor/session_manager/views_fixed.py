"""
Fixed Session API Views
Handles edge cases with request parsing
"""

import logging
import json
from datetime import timedelta

from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .authentication import SessionAuthentication
from .services import session_service
from .models import UserSession
from .serializers import (
    SessionSerializer,
    SessionCreateSerializer,
    SessionUpdateSerializer
)
from custom_auth.auth0_authentication import Auth0JWTAuthentication

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class SessionCreateViewFixed(APIView):
    """
    Create a new session after Auth0 authentication
    POST /api/sessions/create/
    """
    authentication_classes = [Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        """Create new session with better error handling"""
        try:
            logger.info(f"[SessionCreate] Starting session creation")
            logger.info(f"[SessionCreate] Request class: {request.__class__.__name__}")
            logger.info(f"[SessionCreate] User: {getattr(request, 'user', 'NO USER')}")
            
            # Ensure we have an authenticated user
            if not hasattr(request, 'user') or not request.user.is_authenticated:
                logger.error("[SessionCreate] No authenticated user in request")
                return Response(
                    {'error': 'Authentication required'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            user = request.user
            
            # Get request data - handle both DRF and regular Django requests
            try:
                # Try DRF way first
                data = request.data if hasattr(request, 'data') else None
                
                if data is None:
                    # Fallback to parsing JSON from body
                    if request.body:
                        data = json.loads(request.body.decode('utf-8'))
                    else:
                        data = {}
                        
                logger.info(f"[SessionCreate] Request data: {data}")
                
            except Exception as e:
                logger.error(f"[SessionCreate] Error parsing request data: {e}")
                data = {}
            
            # Validate data
            serializer = SessionCreateSerializer(data=data)
            if not serializer.is_valid():
                logger.error(f"[SessionCreate] Validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            # Get request metadata
            request_meta = {
                'ip_address': self._get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', '')
            }
            
            # Get access token
            access_token = getattr(request, 'auth', 'no_token_available')
            if not access_token or access_token == 'no_token_available':
                # Try to get from Authorization header as fallback
                auth_header = request.META.get('HTTP_AUTHORIZATION', '')
                if auth_header.startswith('Bearer '):
                    access_token = auth_header[7:]
                else:
                    access_token = f"session_for_user_{user.id}"
            
            logger.info(f"[SessionCreate] Creating session for user {user.email}")
            
            # Create session
            session = session_service.create_session(
                user=user,
                access_token=access_token,
                request_meta=request_meta,
                **serializer.validated_data
            )
            
            # Prepare response
            response_data = {
                'session_token': str(session.session_id),
                'expires_at': session.expires_at.isoformat(),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': getattr(user, 'name', ''),
                },
                'tenant': {
                    'id': str(session.tenant.id) if session.tenant else None,
                    'name': session.tenant.name if session.tenant else None,
                },
                'needs_onboarding': session.needs_onboarding,
                'onboarding_completed': session.onboarding_completed,
                'subscription_plan': session.subscription_plan,
            }
            
            logger.info(f"[SessionCreate] Session created successfully: {session.session_id}")
            
            # Create response
            response = Response(response_data, status=status.HTTP_201_CREATED)
            
            # Set session cookie
            response.set_cookie(
                'session_token',
                str(session.session_id),
                max_age=86400,  # 24 hours
                httponly=True,
                secure=True,
                samesite='lax',
                path='/'
            )
            
            return response
            
        except Exception as e:
            logger.error(f"[SessionCreate] Unexpected error: {str(e)}", exc_info=True)
            
            # Return a proper JSON error response
            error_response = {
                'error': 'Failed to create session',
                'detail': str(e),
                'type': type(e).__name__
            }
            
            return Response(
                error_response,
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_client_ip(self, request):
        """Get client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
        return ip