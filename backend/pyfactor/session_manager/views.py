"""
Session API Views
RESTful endpoints for session management
"""

import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .authentication import SessionAuthentication
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .services import session_service
from .models import UserSession
from custom_auth.rls import set_tenant_context, clear_tenant_context
from .serializers import (
    SessionSerializer,
    SessionCreateSerializer,
    SessionUpdateSerializer
)
from custom_auth.auth0_authentication import Auth0JWTAuthentication
from core.decorators import deprecated_class_view
from pyfactor.analytics import track_event, identify_user

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
@deprecated_class_view('/api/auth/session-v2', removal_date='2025-02-01')
class SessionCreateView(APIView):
    """
    Create a new session after Auth0 authentication
    POST /api/sessions/create/
    
    DEPRECATED: Use POST /api/auth/session-v2 instead
    """
    authentication_classes = [Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Create new session"""
        try:
            logger.info(f"[SessionCreate] Starting session creation for path: {request.path}")
            logger.info(f"[SessionCreate] Request type: {type(request).__name__}")
            logger.info(f"[SessionCreate] User authenticated: {hasattr(request, 'user') and request.user.is_authenticated}")
            logger.info(f"[SessionCreate] User: {getattr(request, 'user', 'NO USER')}")
            logger.info(f"[SessionCreate] Auth token present: {hasattr(request, 'auth') and bool(request.auth)}")
            
            # Handle different request types
            if hasattr(request, 'data'):
                data = request.data
            else:
                # Fallback for non-DRF requests
                import json
                if request.body:
                    data = json.loads(request.body)
                else:
                    data = {}
            
            logger.info(f"[SessionCreate] Request data: {data}")
            
            serializer = SessionCreateSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            
            user = request.user
            logger.info(f"[SessionCreate] User details - ID: {user.id}, Email: {user.email}, Auth0 Sub: {getattr(user, 'auth0_sub', 'NO AUTH0 SUB')}")
            
            # Get request metadata
            request_meta = {
                'ip_address': self._get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', '')
            }
            
            # Get access token from Auth0 authentication
            access_token = request.auth  # This is set by Auth0JWTAuthentication
            logger.info(f"[SessionCreate] Access token length: {len(access_token) if access_token else 0}")
            
            # Log tenant information
            user_tenant = getattr(user, 'tenant', None)
            logger.info(f"[SessionCreate] User tenant: {user_tenant}")
            if user_tenant:
                logger.info(f"[SessionCreate] User tenant ID: {user_tenant.id}, Name: {user_tenant.name}")
            
            # Log subscription information - check user model first (single source of truth)
            user_subscription = getattr(user, 'subscription_plan', 'free')
            logger.info(f"[SessionCreate] User subscription from user model: {user_subscription}")
            
            # Also check OnboardingProgress as fallback
            if hasattr(user, 'onboardingprogress'):
                onboarding = user.onboardingprogress
                progress_subscription = getattr(onboarding, 'subscription_plan', None)
                if progress_subscription:
                    user_subscription = progress_subscription
                    logger.info(f"[SessionCreate] User subscription from onboarding: {user_subscription}")
                logger.info(f"[SessionCreate] Onboarding status: {onboarding.onboarding_status}")
                logger.info(f"[SessionCreate] Setup completed: {onboarding.setup_completed}")
            
            # Check if user has active Stripe subscription
            try:
                from accounts.models import Subscription
                active_sub = Subscription.objects.filter(
                    user=user,
                    status__in=['active', 'trialing']
                ).first()
                if active_sub:
                    logger.info(f"[SessionCreate] Found active Stripe subscription: {active_sub.stripe_subscription_id}")
                    logger.info(f"[SessionCreate] Subscription plan: {active_sub.plan_name}")
                    user_subscription = active_sub.plan_name or user_subscription
            except Exception as e:
                logger.warning(f"[SessionCreate] Error checking Stripe subscription: {e}")
            
            # Create session
            logger.info(f"[SessionCreate] Calling session_service.create_session with validated data: {serializer.validated_data}")
            # Include subscription plan in session creation
            session_data = serializer.validated_data.copy()
            if user_subscription:
                session_data['subscription_plan'] = user_subscription
            
            session = session_service.create_session(
                user=user,
                access_token=access_token,
                request_meta=request_meta,
                **session_data
            )
            
            # Prepare response
            response_data = {
                'session_token': str(session.session_id),
                'expires_at': session.expires_at.isoformat(),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': getattr(user, 'name', ''),
                    'role': getattr(user, 'role', 'USER'),  # Include user role
                },
                'tenant': {
                    'id': str(session.tenant.id) if session.tenant else None,
                    'name': session.tenant.name if session.tenant else None,
                },
                'needs_onboarding': session.needs_onboarding,
                'onboarding_completed': session.onboarding_completed,
                'subscription_plan': session.subscription_plan,
            }
            
            logger.info(f"Session created for user {user.email}: {session.session_id}")
            
            # Track user login event
            user_id = str(user.id)
            track_event(
                user_id=user_id,
                event_name='user_logged_in',
                properties={
                    'login_method': 'auth0',
                    'has_tenant': bool(session.tenant),
                    'needs_onboarding': session.needs_onboarding,
                    'subscription_plan': session.subscription_plan,
                    'session_type': session_data.get('session_type', 'web')
                }
            )
            
            # Identify user in PostHog
            identify_user(user)
            
            # Create response with session cookie
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
            logger.error(f"[SessionCreate] Session creation error: {str(e)}")
            logger.error(f"[SessionCreate] Error type: {type(e).__name__}")
            logger.error(f"[SessionCreate] Traceback:", exc_info=True)
            return Response(
                {'error': 'Failed to create session', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_client_ip(self, request):
        """Get client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SessionDetailView(APIView):
    """
    Get, update, or delete current session
    GET/PATCH/DELETE /api/sessions/current/
    """
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, session_id=None):
        """Get current session details or specific session by ID"""
        try:
            session = request.session_obj
            
            if not session:
                return Response(
                    {'error': 'No active session'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Check if session needs syncing with OnboardingProgress
            if session.needs_onboarding:
                try:
                    from onboarding.models import OnboardingProgress
                    progress = OnboardingProgress.objects.get(user=session.user)
                    
                    # If OnboardingProgress shows complete but session doesn't, sync it
                    if progress.onboarding_status == 'complete' and session.needs_onboarding:
                        logger.info(
                            f"Syncing session {session.session_id} with OnboardingProgress "
                            f"for user {session.user.email}"
                        )
                        
                        # Update session
                        session.needs_onboarding = False
                        session.onboarding_completed = True
                        session.onboarding_step = progress.current_step or 'complete'
                        session.save(update_fields=[
                            'needs_onboarding', 
                            'onboarding_completed', 
                            'onboarding_step',
                            'updated_at'
                        ])
                except Exception as e:
                    logger.debug(f"Could not check OnboardingProgress: {e}")
            
            serializer = SessionSerializer(session)
            
            # Debug logging for missing user data
            logger.info(f"[SessionDetail] Session data for {session.user.email}:")
            logger.info(f"  - User ID: {session.user.id}")
            logger.info(f"  - First name: '{session.user.first_name}'")
            logger.info(f"  - Last name: '{session.user.last_name}'")
            logger.info(f"  - Full name: '{getattr(session.user, 'name', 'N/A')}'")
            logger.info(f"  - Subscription plan: '{session.user.subscription_plan}'")
            logger.info(f"  - Has tenant: {session.tenant is not None}")
            if session.tenant:
                logger.info(f"  - Tenant name: '{session.tenant.name}'")
            
            # Check onboarding progress
            try:
                from onboarding.models import OnboardingProgress
                progress = OnboardingProgress.objects.filter(user=session.user).first()
                if progress:
                    logger.info(f"  - Has OnboardingProgress: Yes")
                    logger.info(f"  - Has Business: {progress.business is not None}")
                    if progress.business:
                        logger.info(f"  - Business name: '{progress.business.name}'")
                        logger.info(f"  - Business type: '{progress.business.business_type}'")
                else:
                    logger.info(f"  - Has OnboardingProgress: No")
            except Exception as e:
                logger.error(f"  - Error checking OnboardingProgress: {e}")
            
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Session retrieval error: {str(e)}")
            return Response(
                {'error': 'Failed to get session'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def patch(self, request, session_id=None):
        """Update current session or specific session by ID"""
        try:
            session = request.session_obj
            
            if not session:
                return Response(
                    {'error': 'No active session'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            serializer = SessionUpdateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Update session
            updated_session = session_service.update_session(
                str(session.session_id),
                **serializer.validated_data
            )
            
            if not updated_session:
                return Response(
                    {'error': 'Failed to update session'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            response_serializer = SessionSerializer(updated_session)
            return Response(response_serializer.data)
            
        except Exception as e:
            logger.error(f"Session update error: {str(e)}")
            return Response(
                {'error': 'Failed to update session', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def delete(self, request, session_id=None):
        """Invalidate current session (logout) or specific session by ID"""
        try:
            session = request.session_obj
            
            if session:
                session_service.invalidate_session(str(session.session_id))
                logger.info(f"Session invalidated for user {session.user.email}")
            
            response = Response(
                {'message': 'Session terminated successfully'},
                status=status.HTTP_200_OK
            )
            
            # Clear session cookie
            response.delete_cookie('session_token')
            
            return response
            
        except Exception as e:
            logger.error(f"Session deletion error: {str(e)}")
            return Response(
                {'error': 'Failed to delete session'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SessionRefreshView(APIView):
    """
    Refresh/extend current session
    POST /api/sessions/refresh/
    """
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Extend session expiration"""
        try:
            session = request.session_obj
            
            if not session:
                return Response(
                    {'error': 'No active session'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Extend session
            hours = request.data.get('hours', 24)
            extended_session = session_service.extend_session(
                str(session.session_id),
                hours=hours
            )
            
            if not extended_session:
                return Response(
                    {'error': 'Failed to extend session'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response({
                'message': 'Session extended successfully',
                'expires_at': extended_session.expires_at.isoformat()
            })
            
        except Exception as e:
            logger.error(f"Session refresh error: {str(e)}")
            return Response(
                {'error': 'Failed to refresh session'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SessionListView(APIView):
    """
    List all active sessions for current user
    GET /api/sessions/
    """
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all user sessions"""
        try:
            user = request.user
            
            sessions = UserSession.objects.filter(
                user=user,
                is_active=True,
                expires_at__gt=timezone.now()
            ).order_by('-last_activity')
            
            serializer = SessionSerializer(sessions, many=True)
            
            return Response({
                'count': sessions.count(),
                'sessions': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Session list error: {str(e)}")
            return Response(
                {'error': 'Failed to list sessions'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SessionInvalidateAllView(APIView):
    """
    Invalidate all sessions for current user
    POST /api/sessions/invalidate-all/
    """
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Invalidate all user sessions"""
        try:
            user = request.user
            
            count = session_service.invalidate_all_user_sessions(user)
            
            logger.info(f"Invalidated {count} sessions for user {user.email}")
            
            response = Response({
                'message': f'Successfully invalidated {count} sessions',
                'count': count
            })
            
            # Clear current session cookie
            response.delete_cookie('session_token')
            
            return response
            
        except Exception as e:
            logger.error(f"Session invalidation error: {str(e)}")
            return Response(
                {'error': 'Failed to invalidate sessions'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )