"""
Password Login View
Handles Auth0 password authentication and session creation
"""

import logging
import requests
import traceback
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from session_manager.services import session_service

logger = logging.getLogger(__name__)
User = get_user_model()


class PasswordLoginView(APIView):
    """
    Authenticate user with email and password via Auth0
    Creates a session and returns session details
    Endpoint: POST /api/auth/password-login/
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        logger.info("🔐 [PASSWORD_LOGIN] === STARTING PASSWORD LOGIN FLOW ===")
        logger.info(f"🔐 [PASSWORD_LOGIN] Request path: {request.path}")
        logger.info(f"🔐 [PASSWORD_LOGIN] Request method: {request.method}")
        logger.info(f"🔐 [PASSWORD_LOGIN] Request headers: {dict(request.headers)}")
        logger.info(f"🔐 [PASSWORD_LOGIN] Request data: {request.data}")
        
        try:
            # Extract credentials from request
            email = request.data.get('email', '').strip().lower()
            password = request.data.get('password', '')
            
            logger.info(f"🔐 [PASSWORD_LOGIN] Login attempt for email: {email}")
            logger.info(f"🔐 [PASSWORD_LOGIN] Password length: {len(password)}")
            
            # Validate input
            if not email or not password:
                logger.error(f"🔐 [PASSWORD_LOGIN] Missing email or password - email: {bool(email)}, password: {bool(password)}")
                return Response({
                    'error': 'Email and password are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Authenticate with Auth0 using Resource Owner Password Grant
            logger.info(f"🔐 [PASSWORD_LOGIN] Attempting Auth0 authentication for {email}")
            
            auth0_domain = settings.AUTH0_DOMAIN
            auth0_client_id = settings.AUTH0_CLIENT_ID
            auth0_client_secret = settings.AUTH0_CLIENT_SECRET
            auth0_audience = settings.AUTH0_AUDIENCE
            
            # Use the actual Auth0 domain (not custom domain) for token endpoint
            if auth0_domain == 'auth.dottapps.com':
                # Use the real Auth0 domain for API calls
                auth0_api_domain = 'dev-cbyy63jovi6zrcos.us.auth0.com'
            else:
                auth0_api_domain = auth0_domain
            
            auth_response = requests.post(
                f"https://{auth0_api_domain}/oauth/token",
                json={
                    'grant_type': 'password',
                    'username': email,
                    'password': password,
                    'client_id': auth0_client_id,
                    'client_secret': auth0_client_secret,
                    'audience': auth0_audience,
                    'scope': 'openid profile email'
                },
                timeout=10
            )
            
            if auth_response.status_code != 200:
                logger.error(f"🔐 [PASSWORD_LOGIN] Auth0 authentication failed: {auth_response.status_code}")
                logger.error(f"🔐 [PASSWORD_LOGIN] Response: {auth_response.text}")
                
                # Parse Auth0 error response
                try:
                    error_data = auth_response.json()
                    error_description = error_data.get('error_description', 'Invalid credentials')
                except:
                    error_description = 'Authentication failed'
                
                return Response({
                    'error': error_description
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Parse Auth0 response
            auth_data = auth_response.json()
            access_token = auth_data.get('access_token')
            id_token = auth_data.get('id_token')
            
            logger.info(f"🔐 [PASSWORD_LOGIN] Auth0 authentication successful, got access token")
            
            # Get user info from Auth0
            user_info_response = requests.get(
                f"https://{auth0_api_domain}/userinfo",
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10
            )
            
            if user_info_response.status_code != 200:
                logger.error(f"🔐 [PASSWORD_LOGIN] Failed to get user info: {user_info_response.status_code}")
                return Response({
                    'error': 'Failed to get user information'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            user_info = user_info_response.json()
            auth0_sub = user_info.get('sub')
            email = user_info.get('email', email)  # Use email from user info if available
            
            logger.info(f"🔐 [PASSWORD_LOGIN] Got user info - sub: {auth0_sub}, email: {email}")
            
            # Get or create user in our database
            with transaction.atomic():
                # Check if user exists by Auth0 sub first (most reliable)
                try:
                    user = User.objects.get(auth0_sub=auth0_sub)
                    created = False
                    logger.info(f"🔐 [PASSWORD_LOGIN] Found existing user by auth0_sub: {user.id}")
                except User.DoesNotExist:
                    # Fallback to email lookup or create new user
                    user, created = User.objects.get_or_create(
                        email=email,
                        defaults={
                            'auth0_sub': auth0_sub,
                            'name': user_info.get('name', ''),
                            'first_name': user_info.get('given_name', ''),
                            'last_name': user_info.get('family_name', ''),
                            'picture': user_info.get('picture', ''),
                            'email_verified': user_info.get('email_verified', False)
                        }
                    )
                    logger.info(f"🔐 [PASSWORD_LOGIN] User lookup result - created: {created}, user_id: {user.id}")
                
                # Update user info if not created
                if not created:
                    # Update auth0_sub if not set
                    if not user.auth0_sub:
                        user.auth0_sub = auth0_sub
                    # Update other fields from Auth0
                    user.name = user_info.get('name', user.name)
                    user.picture = user_info.get('picture', user.picture)
                    user.email_verified = user_info.get('email_verified', user.email_verified)
                    user.save()
                    logger.info(f"🔐 [PASSWORD_LOGIN] Updated existing user {user.id}")
                
                # Check if account has been deleted/closed
                if hasattr(user, 'is_deleted') and user.is_deleted:
                    logger.error(f"🔐 [PASSWORD_LOGIN] User {user.email} has a deleted/closed account")
                    return Response({
                        'error': 'This account has been closed. Please contact support if you need assistance.'
                    }, status=status.HTTP_403_FORBIDDEN)
                
                # Get user's tenant
                tenant = None
                if hasattr(user, 'tenant') and user.tenant:
                    tenant = user.tenant
                    logger.info(f"🔐 [PASSWORD_LOGIN] Found tenant via user.tenant: {tenant.id}")
                else:
                    # Look for tenant where user is owner
                    user_id_str = str(user.id)
                    tenant = Tenant.objects.filter(owner_id=user_id_str).first()
                    if tenant:
                        # Update user.tenant relationship
                        user.tenant = tenant
                        user.save(update_fields=['tenant'])
                        logger.info(f"🔐 [PASSWORD_LOGIN] Found tenant via owner_id: {tenant.id}")
                
                # Get onboarding status
                needs_onboarding = not user.onboarding_completed
                onboarding_completed = user.onboarding_completed
                current_step = 'business_info'
                
                # Get OnboardingProgress for additional info
                try:
                    progress = OnboardingProgress.objects.get(user=user)
                    current_step = progress.current_step or 'business_info'
                    if onboarding_completed:
                        current_step = 'complete'
                    logger.info(f"🔐 [PASSWORD_LOGIN] Found onboarding progress - step: {current_step}")
                except OnboardingProgress.DoesNotExist:
                    logger.info(f"🔐 [PASSWORD_LOGIN] No onboarding progress found")
                
                # Get user's subscription plan
                user_subscription = 'free'
                if hasattr(user, 'subscription_plan'):
                    user_subscription = user.subscription_plan
                
                # Check for active Stripe subscription
                try:
                    from users.models import Subscription
                    active_sub = Subscription.objects.filter(
                        user=user,
                        status__in=['active', 'trialing']
                    ).first()
                    if active_sub:
                        user_subscription = active_sub.plan_name
                        logger.info(f"🔐 [PASSWORD_LOGIN] Active Stripe subscription: {user_subscription}")
                except Exception as e:
                    logger.warning(f"🔐 [PASSWORD_LOGIN] Error checking Stripe: {e}")
                
                # Create session
                logger.info(f"🔐 [PASSWORD_LOGIN] Creating session for user {user.email}")
                
                # Get request metadata
                request_meta = {
                    'ip_address': self._get_client_ip(request),
                    'user_agent': request.META.get('HTTP_USER_AGENT', '')
                }
                
                # Create session with all necessary data
                session = session_service.create_session(
                    user=user,
                    access_token=access_token,
                    request_meta=request_meta,
                    session_type='web',
                    subscription_plan=user_subscription,
                    remember_me=request.data.get('remember_me', False)
                )
                
                logger.info(f"🔐 [PASSWORD_LOGIN] Session created successfully: {session.session_id}")
                
                # Prepare response
                response_data = {
                    'success': True,
                    'session_token': str(session.session_id),
                    'expires_at': session.expires_at.isoformat(),
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'name': user.name or f"{user.first_name} {user.last_name}".strip(),
                        'picture': user.picture,
                        'role': getattr(user, 'role', 'USER'),
                    },
                    'tenant': {
                        'id': str(tenant.id) if tenant else None,
                        'name': tenant.name if tenant else None,
                    } if tenant else None,
                    'tenantId': str(tenant.id) if tenant else None,
                    'needs_onboarding': needs_onboarding,
                    'onboarding_completed': onboarding_completed,
                    'current_step': current_step,
                    'subscription_plan': user_subscription,
                }
                
                logger.info(f"🔐 [PASSWORD_LOGIN] Login successful for {user.email}")
                logger.info("🔐 [PASSWORD_LOGIN] === PASSWORD LOGIN FLOW COMPLETE ===")
                
                # Create response with session cookie
                response = Response(response_data, status=status.HTTP_200_OK)
                
                # Set session cookie
                max_age = 7 * 24 * 60 * 60 if request.data.get('remember_me') else 24 * 60 * 60
                response.set_cookie(
                    'session_token',
                    str(session.session_id),
                    max_age=max_age,
                    httponly=True,
                    secure=True,
                    samesite='lax',
                    path='/'
                )
                
                return response
            
        except requests.exceptions.Timeout:
            logger.error("🔐 [PASSWORD_LOGIN] Auth0 request timeout")
            return Response({
                'error': 'Authentication service timeout. Please try again.'
            }, status=status.HTTP_504_GATEWAY_TIMEOUT)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"🔐 [PASSWORD_LOGIN] Auth0 request error: {str(e)}")
            return Response({
                'error': 'Authentication service error. Please try again later.'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        except Exception as e:
            logger.error(f"🔐 [PASSWORD_LOGIN] Unexpected error: {str(e)}")
            logger.error(f"🔐 [PASSWORD_LOGIN] Traceback: {traceback.format_exc()}")
            return Response({
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_client_ip(self, request):
        """Get client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip