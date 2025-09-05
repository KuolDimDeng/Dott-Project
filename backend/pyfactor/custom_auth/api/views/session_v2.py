"""
Industry-Standard Session Management API v2
Unified session endpoint following REST best practices
"""

import logging
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from session_manager.models import UserSession
from session_manager.services import session_service
from session_manager.authentication import SessionAuthentication
from users.models import UserProfile
import uuid

logger = logging.getLogger(__name__)


class SessionV2View(APIView):
    """
    Industry-standard unified session management endpoint
    GET /api/auth/session-v2 - Validate and get session details
    POST /api/auth/session-v2 - Create new session (login)
    PATCH /api/auth/session-v2 - Refresh session
    DELETE /api/auth/session-v2 - Destroy session (logout)
    """
    permission_classes = [AllowAny]  # Auth is handled per method
    
    def get(self, request):
        """
        Validate session and return user details
        Expects: Authorization: Session <token> header
        """
        try:
            # Extract session token from Authorization header
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            
            if not auth_header.startswith('Session '):
                logger.warning('[SessionV2] Missing or invalid Authorization header')
                return Response(
                    {'error': 'Invalid authentication header'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            session_token = auth_header.replace('Session ', '').strip()
            
            if not session_token:
                logger.warning('[SessionV2] Empty session token')
                return Response(
                    {'error': 'No session token provided'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Validate session token
            try:
                session_uuid = uuid.UUID(session_token)
            except (ValueError, AttributeError):
                logger.warning(f'[SessionV2] Invalid session token format: {session_token[:8]}...')
                return Response(
                    {'error': 'Invalid session token format'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Get session from database
            try:
                session = UserSession.objects.select_related('user').get(
                    session_id=session_uuid,
                    is_active=True
                )
            except UserSession.DoesNotExist:
                logger.info(f'[SessionV2] Session not found: {session_token[:8]}...')
                return Response(
                    {'error': 'Invalid or expired session'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Check if session is expired
            if session.expires_at < timezone.now():
                logger.info(f'[SessionV2] Session expired for user {session.user.email}')
                session.is_active = False
                session.save(update_fields=['is_active'])
                return Response(
                    {'error': 'Session expired'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Get user profile
            user = session.user
            profile = UserProfile.objects.filter(user=user).first()
            
            # Get tenant info (tenant_id is the user's ID in this system)
            tenant_id = user.id
            
            # Get user role
            user_role = getattr(user, 'role', 'USER')
            
            # Check if user has a business (tenant)
            has_business = bool(user.tenant)
            
            # Build response
            response_data = {
                'success': True,
                'session': {
                    'id': str(session.session_id),
                    'expires_at': session.expires_at.isoformat(),
                    'created_at': session.created_at.isoformat(),
                },
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_active': user.is_active,
                    'date_joined': user.date_joined.isoformat(),
                    'role': user_role,  # Include user role
                    'has_business': has_business,  # Include business status
                }
            }
            
            # Add profile data if exists
            if profile:
                response_data['user'].update({
                    'phone_number': profile.phone_number,
                    'country': profile.country,
                    'business_name': profile.business_name,
                    'industry': profile.industry,
                    'onboarding_completed': profile.onboarding_completed,
                    'subscription_plan': profile.subscription_plan,
                    'subscription_status': profile.subscription_status,
                })
            
            # Add tenant data (in this system, tenant_id is the user's ID)
            response_data['tenant'] = {
                'id': tenant_id,
                'name': profile.business_name if profile else f"User {user.id}",
            }
            response_data['user']['tenant_id'] = tenant_id
            
            logger.info(f'[SessionV2] Session validated for user {user.email}')
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f'[SessionV2] GET error: {str(e)}', exc_info=True)
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """
        Create new session (login)
        Expects: {email, password} in body
        """
        try:
            email = request.data.get('email')
            password = request.data.get('password')
            
            if not email or not password:
                return Response(
                    {'error': 'Email and password are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Authenticate user
            from django.contrib.auth import authenticate
            user = authenticate(request, username=email, password=password)
            
            if not user:
                logger.warning(f'[SessionV2] Failed login attempt for {email}')
                return Response(
                    {'error': 'Invalid credentials'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            if not user.is_active:
                logger.warning(f'[SessionV2] Inactive user login attempt: {email}')
                return Response(
                    {'error': 'Account is disabled'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Create session
            session = session_service.create_session(
                user=user,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            logger.info(f'[SessionV2] Session created for user {user.email}')
            
            # Get user profile
            profile = UserProfile.objects.filter(user=user).first()
            
            # Get user role
            user_role = getattr(user, 'role', 'USER')
            
            # Check if user has a business (tenant)
            has_business = bool(user.tenant)
            
            # Build response
            response_data = {
                'success': True,
                'session_token': str(session.session_id),
                'expires_at': session.expires_at.isoformat(),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user_role,  # Include user role
                    'has_business': has_business,  # Include business status
                    'onboarding_completed': profile.onboarding_completed if profile else False,
                }
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f'[SessionV2] POST error: {str(e)}', exc_info=True)
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def patch(self, request):
        """
        Refresh session expiration
        Expects: Authorization: Session <token> header
        """
        try:
            # Extract session token
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            
            if not auth_header.startswith('Session '):
                return Response(
                    {'error': 'Invalid authentication header'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            session_token = auth_header.replace('Session ', '').strip()
            
            # Validate and get session
            try:
                session_uuid = uuid.UUID(session_token)
                session = UserSession.objects.get(
                    session_id=session_uuid,
                    is_active=True
                )
            except (ValueError, UserSession.DoesNotExist):
                return Response(
                    {'error': 'Invalid session'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Refresh session - extend by 24 hours
            session_service.extend_session(str(session.session_id), hours=24)
            # Refresh the session object to get updated expires_at
            session.refresh_from_db()
            
            logger.info(f'[SessionV2] Session refreshed for user {session.user.email}')
            
            return Response({
                'success': True,
                'expires_at': session.expires_at.isoformat(),
                'message': 'Session refreshed successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f'[SessionV2] PATCH error: {str(e)}', exc_info=True)
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def delete(self, request):
        """
        Destroy session (logout)
        Expects: Authorization: Session <token> header
        """
        try:
            # Extract session token
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            
            if not auth_header.startswith('Session '):
                # Already logged out
                return Response({
                    'success': True,
                    'message': 'Session destroyed'
                }, status=status.HTTP_200_OK)
            
            session_token = auth_header.replace('Session ', '').strip()
            
            # Try to get and destroy session
            try:
                session_uuid = uuid.UUID(session_token)
                session = UserSession.objects.get(session_id=session_uuid)
                user_email = session.user.email
                
                # Destroy session
                session.is_active = False
                session.save(update_fields=['is_active'])
                
                logger.info(f'[SessionV2] Session destroyed for user {user_email}')
            except (ValueError, UserSession.DoesNotExist):
                # Session doesn't exist, consider it already destroyed
                pass
            
            return Response({
                'success': True,
                'message': 'Session destroyed successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f'[SessionV2] DELETE error: {str(e)}', exc_info=True)
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )