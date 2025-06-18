"""
Enhanced Session Views with Security Features
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
from .security_service import security_service
from .models import UserSession
from .serializers import (
    SessionSerializer,
    SessionCreateSerializer,
    SessionUpdateSerializer
)
from custom_auth.auth0_authentication import Auth0JWTAuthentication

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class SessionCreateViewEnhanced(APIView):
    """
    Create a new session with enhanced security features
    POST /api/sessions/create/
    """
    authentication_classes = [Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        """Create new session with device fingerprinting and risk assessment"""
        try:
            logger.info(f"[SessionCreateEnhanced] Starting secure session creation")
            logger.info(f"[SessionCreateEnhanced] User: {getattr(request, 'user', 'NO USER')}")
            
            # Ensure we have an authenticated user
            if not hasattr(request, 'user') or not request.user.is_authenticated:
                logger.error("[SessionCreateEnhanced] No authenticated user in request")
                return Response(
                    {'error': 'Authentication required'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            user = request.user
            
            # Get request data
            try:
                data = request.data if hasattr(request, 'data') else None
                if data is None:
                    if request.body:
                        data = json.loads(request.body.decode('utf-8'))
                    else:
                        data = {}
                        
                logger.info(f"[SessionCreateEnhanced] Request data keys: {list(data.keys())}")
                
            except Exception as e:
                logger.error(f"[SessionCreateEnhanced] Error parsing request data: {e}")
                data = {}
            
            # Extract device fingerprint
            fingerprint_data = data.pop('deviceFingerprint', {})
            if not fingerprint_data:
                logger.warning("[SessionCreateEnhanced] No device fingerprint provided")
                # Create minimal fingerprint data
                fingerprint_data = {
                    'userAgent': request.META.get('HTTP_USER_AGENT', ''),
                    'ipAddress': self._get_client_ip(request)
                }
            else:
                # Add IP address to fingerprint
                fingerprint_data['ipAddress'] = self._get_client_ip(request)
            
            # Validate session data
            serializer = SessionCreateSerializer(data=data)
            if not serializer.is_valid():
                logger.error(f"[SessionCreateEnhanced] Validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            # Get request metadata
            request_meta = {
                'ip_address': self._get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', '')
            }
            
            # Get access token
            access_token = getattr(request, 'auth', 'no_token_available')
            if not access_token or access_token == 'no_token_available':
                auth_header = request.META.get('HTTP_AUTHORIZATION', '')
                if auth_header.startswith('Bearer '):
                    access_token = auth_header[7:]
                else:
                    access_token = f"session_for_user_{user.id}"
            
            logger.info(f"[SessionCreateEnhanced] Creating secure session for user {user.email}")
            
            # Create session with enhanced security
            session, session_security = security_service.create_secure_session(
                user=user,
                access_token=access_token,
                fingerprint_data=fingerprint_data,
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
                'security': {
                    'risk_score': session_security.current_risk_score,
                    'is_verified': session_security.is_verified,
                    'requires_verification': session_security.current_risk_score > 70,
                    'device_trusted': session_security.device_fingerprint.is_trusted if session_security.device_fingerprint else False,
                }
            }
            
            logger.info(f"[SessionCreateEnhanced] Secure session created: {session.session_id}")
            logger.info(f"[SessionCreateEnhanced] Risk score: {session_security.current_risk_score}")
            
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
            
            # Add security headers
            if session_security.current_risk_score > 70:
                response['X-Requires-Verification'] = 'true'
            
            return response
            
        except Exception as e:
            logger.error(f"[SessionCreateEnhanced] Unexpected error: {str(e)}", exc_info=True)
            
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