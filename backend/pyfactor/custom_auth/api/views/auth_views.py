import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.shortcuts import get_object_or_404
from custom_auth.models import Tenant
from django.utils import timezone
from django.db import IntegrityError, transaction
import uuid
import json
import traceback
import requests
from django.conf import settings
from onboarding.models import OnboardingProgress
from session_manager.services import session_service

logger = logging.getLogger('Pyfactor')
User = get_user_model()

class VerifyCredentialsView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Email and password are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = get_object_or_404(User, email=email)
            if check_password(password, user.password):
                return Response({'success': True})
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid credentials'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

class SignUpView(APIView):
    """
    Handle user creation for Auth0 signups.
    This endpoint is called when users sign up via email/password or OAuth providers.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            request_id = str(uuid.uuid4())
            logger.info(f"[SignUp:{request_id}] New user signup request")
            
            # Extract user data from request
            email = request.data.get('email')
            password = request.data.get('password')
            given_name = request.data.get('given_name', request.data.get('firstName', ''))
            family_name = request.data.get('family_name', request.data.get('lastName', ''))
            name = request.data.get('name', '')
            auth0_sub = request.data.get('auth0_sub')  # Optional, for OAuth signups
            user_role = request.data.get('userRole', 'owner')
            is_verified = request.data.get('is_already_verified', False)
            
            logger.info(f"[SignUp:{request_id}] Processing signup for email: {email}")
            
            if not email:
                logger.error(f"[SignUp:{request_id}] Missing email")
                return Response({
                    'success': False,
                    'error': 'Email is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # For email/password signup, password is required
            if not auth0_sub and not password:
                logger.error(f"[SignUp:{request_id}] Missing password for email/password signup")
                return Response({
                    'success': False,
                    'error': 'Password is required for email/password signup'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            with transaction.atomic():
                # Check if user already exists
                existing_user = User.objects.filter(email=email).first()
                if existing_user:
                    logger.info(f"[SignUp:{request_id}] User already exists, checking auth0_sub")
                    # Update auth0_sub if provided and different
                    if hasattr(existing_user, 'auth0_sub') and auth0_sub and existing_user.auth0_sub != auth0_sub:
                        existing_user.auth0_sub = auth0_sub
                        existing_user.save(update_fields=['auth0_sub'])
                    
                    return Response({
                        'success': True,
                        'message': 'User already exists',
                        'user_id': str(existing_user.id),
                        'onboarding_status': getattr(existing_user, 'onboarding_status', 'not_started')
                    })
                
                # Create new user
                user_data = {
                    'email': email,
                    'first_name': given_name or first_name,
                    'last_name': family_name or last_name,
                    'is_active': True,
                    'date_joined': timezone.now()
                }
                
                # Add fields that might exist on the User model
                if hasattr(User, 'auth0_sub') and auth0_sub:
                    user_data['auth0_sub'] = auth0_sub
                if hasattr(User, 'name') and name:
                    user_data['name'] = name
                elif name:
                    # If name field doesn't exist, use it to populate first/last name
                    name_parts = name.split(' ', 1)
                    if not user_data['first_name']:
                        user_data['first_name'] = name_parts[0]
                    if len(name_parts) > 1 and not user_data['last_name']:
                        user_data['last_name'] = name_parts[1]
                
                if hasattr(User, 'is_verified'):
                    user_data['is_verified'] = is_verified
                if hasattr(User, 'user_role'):
                    user_data['user_role'] = user_role
                if hasattr(User, 'onboarding_status'):
                    user_data['onboarding_status'] = 'not_started'
                if hasattr(User, 'onboarding_completed'):
                    user_data['onboarding_completed'] = False
                
                # Set password
                if password:
                    user_data['password'] = make_password(password)
                else:
                    # Generate a random password for OAuth users (they won't use it)
                    user_data['password'] = make_password(str(uuid.uuid4()))
                
                user = User.objects.create(**user_data)
                logger.info(f"[SignUp:{request_id}] Created user {user.id} for email {email}")
                
                return Response({
                    'success': True,
                    'message': 'User created successfully',
                    'user_id': str(user.id),
                    'onboarding_status': getattr(user, 'onboarding_status', 'not_started')
                })
                
        except IntegrityError as e:
            logger.error(f"[SignUp:{request_id}] IntegrityError: {str(e)}")
            # Try to get the existing user
            try:
                existing_user = User.objects.get(email=email)
                return Response({
                    'success': True,
                    'message': 'User already exists',
                    'user_id': str(existing_user.id),
                    'onboarding_status': getattr(existing_user, 'onboarding_status', 'not_started')
                })
            except User.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Database integrity error',
                    'detail': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"[SignUp:{request_id}] Unexpected error: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': 'Internal server error',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserProfileView(APIView):
    """
    Get user profile information for authenticated users.
    This endpoint is called by the frontend after OAuth login.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            request_id = str(uuid.uuid4())
            user = request.user
            logger.info(f"[UserProfile:{request_id}] Getting profile for user {user.id}")
            
            # Get user's tenant if exists
            tenant = None
            tenant_id = None
            try:
                tenant = Tenant.objects.filter(owner_id=user.id).first()
                if tenant:
                    tenant_id = str(tenant.id)
                    logger.info(f"[UserProfile:{request_id}] Found tenant {tenant_id} for user {user.id}")
            except Exception as e:
                logger.warning(f"[UserProfile:{request_id}] Error getting tenant: {str(e)}")
            
            # Build profile response
            profile_data = {
                'id': str(user.id),
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'tenant_id': tenant_id,
                'tenantId': tenant_id,  # Alternative naming for frontend compatibility
            }
            
            # Add optional fields if they exist on the user model
            optional_fields = [
                'auth0_sub', 'user_role', 'onboarding_status', 'is_verified',
                'current_step', 'next_step', 'selected_plan', 'onboarding_completed'
            ]
            
            for field in optional_fields:
                if hasattr(user, field):
                    value = getattr(user, field)
                    profile_data[field] = value
            
            # Add setup_done based on onboarding_status
            onboarding_status = getattr(user, 'onboarding_status', 'not_started')
            profile_data['setup_done'] = onboarding_status == 'complete'
            profile_data['onboarding_status'] = onboarding_status
                
            logger.info(f"[UserProfile:{request_id}] Profile retrieved successfully")
            return Response(profile_data)
            
        except Exception as e:
            logger.error(f"[UserProfile:{request_id}] Error: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to get user profile',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def patch(self, request):
        """Update user profile information"""
        try:
            request_id = str(uuid.uuid4())
            user = request.user
            logger.info(f"[UserProfile:{request_id}] Updating profile for user {user.id}")
            
            # Fields that can be updated
            updatable_fields = [
                'first_name', 'last_name', 'onboarding_status', 
                'current_step', 'next_step', 'selected_plan'
            ]
            
            updated_fields = []
            for field in updatable_fields:
                if field in request.data and hasattr(user, field):
                    setattr(user, field, request.data[field])
                    updated_fields.append(field)
            
            if updated_fields:
                user.save(update_fields=updated_fields)
                logger.info(f"[UserProfile:{request_id}] Updated fields: {updated_fields}")
            
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'updated_fields': updated_fields
            })
            
        except Exception as e:
            logger.error(f"[UserProfile:{request_id}] Update error: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to update user profile',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifySessionView(APIView):
    """
    Verify the user's session and return session data
    Required by the frontend to validate authentication
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        request_id = str(uuid.uuid4())
        logger.debug(f"Session verification request {request_id}")
        
        if not request.user.is_authenticated:
            logger.debug(f"Session verification failed - user not authenticated {request_id}")
            return Response({
                'isLoggedIn': False,
                'authenticated': False,
                'requestId': request_id
            }, status=status.HTTP_200_OK)
        
        try:
            # Return basic user session data
            logger.debug(f"Session verification successful for user {request.user.id} {request_id}")
            response_data = {
                'isLoggedIn': True,
                'authenticated': True,
                'user': {
                    'id': str(request.user.id),
                    'email': request.user.email,
                    'lastLogin': request.user.last_login.isoformat() if request.user.last_login else None,
                },
                'requestId': request_id
            }
            
            # Add onboarding status if available
            if hasattr(request.user, 'onboarding_status'):
                response_data['user']['onboardingStatus'] = request.user.onboarding_status
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error verifying session: {str(e)}")
            return Response({
                'isLoggedIn': False,
                'authenticated': False,
                'error': str(e),
                'requestId': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CheckUserAttributesView(APIView):
    """
    Check and return the user's attributes
    Required by the frontend to determine user state
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        request_id = str(uuid.uuid4())
        logger.debug(f"Attribute check request {request_id}")
        
        if not request.user.is_authenticated:
            logger.debug(f"Attribute check failed - user not authenticated {request_id}")
            return Response({
                'isLoggedIn': False,
                'authenticated': False,
                'requestId': request_id
            }, status=status.HTTP_200_OK)
        
        try:
            # Gather all user attributes
            attributes = {}
            
            # Map Django User model fields to attribute names
            if hasattr(request.user, 'email'):
                attributes['email'] = request.user.email
                
            # Custom fields we may have on the User model
            custom_fields = [
                'onboarding_status', 'current_step', 'next_step',
                'selected_plan', 'database_status', 'setup_status'
            ]
            
            for field in custom_fields:
                if hasattr(request.user, field):
                    value = getattr(request.user, field)
                    # Convert to camelCase for frontend
                    camel_case_field = ''.join([field.split('_')[0]] + 
                                     [w.capitalize() for w in field.split('_')[1:]])
                    attributes[camel_case_field] = value
            
            # Add basic preferences if not present
            if 'preferences' not in attributes:
                attributes['preferences'] = json.dumps({
                    "notifications": True,
                    "theme": "light",
                    "language": "en"
                })
                
            logger.debug(f"Attribute check successful for user {request.user.id} {request_id}")
            return Response({
                'isLoggedIn': True,
                'authenticated': True,
                'attributes': attributes,
                'requestId': request_id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error checking user attributes: {str(e)}")
            return Response({
                'isLoggedIn': False,
                'authenticated': False,
                'error': str(e),
                'requestId': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyTenantView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Verify that the provided tenant ID is correct for this user"""
        try:
            tenant_id = request.data.get('tenantId')
            
            # Log the verification attempt
            logger.info(f"Tenant verification request for user {request.user.id} with tenantId: {tenant_id}")
            
            # CRITICAL: Always check if the user has ANY existing tenant first
            existing_tenant = Tenant.objects.filter(owner_id=str(request.user.id)).first()
            
            if existing_tenant:
                # User has a tenant - check if the ID matches
                if str(existing_tenant.id) != tenant_id:
                    logger.warning(f"Tenant ID mismatch for user {request.user.id}: provided {tenant_id} but actual is {existing_tenant.id}")
                    return Response({
                        'status': 'corrected',
                        'message': 'The provided tenant ID is incorrect for this user',
                        'correctTenantId': str(existing_tenant.id),
                        'correctSchemaName': existing_tenant.id
                    })
                else:
                    # Tenant ID is correct
                    return Response({
                        'status': 'verified',
                        'message': 'Tenant ID verified successfully'
                    })
            else:
                # User has no tenant yet - they need to go through onboarding
                return Response({
                    'status': 'no_tenant',
                    'message': 'User has no tenant, needs onboarding'
                })
                
        except Exception as e:
            logger.error(f"Error verifying tenant: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Error verifying tenant',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
            
            # Get Auth0 configuration from environment
            auth0_domain = settings.AUTH0_DOMAIN
            client_id = settings.AUTH0_CLIENT_ID
            client_secret = settings.AUTH0_CLIENT_SECRET
            audience = settings.AUTH0_AUDIENCE or f'https://{auth0_domain}/api/v2/'
            
            logger.info(f"🔐 [PASSWORD_LOGIN] Auth0 config - Domain: {auth0_domain}, Audience: {audience}")
            
            # Authenticate with Auth0
            auth_url = f'https://{auth0_domain}/oauth/token'
            auth_payload = {
                'grant_type': 'password',
                'username': email,
                'password': password,
                'client_id': client_id,
                'client_secret': client_secret,
                'audience': audience,
                'scope': 'openid profile email offline_access'
            }
            
            logger.info(f"🔐 [PASSWORD_LOGIN] Sending auth request to Auth0: {auth_url}")
            
            try:
                auth_response = requests.post(
                    auth_url,
                    json=auth_payload,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                logger.info(f"🔐 [PASSWORD_LOGIN] Auth0 response status: {auth_response.status_code}")
                
                if auth_response.status_code == 200:
                    auth_data = auth_response.json()
                    logger.info(f"🔐 [PASSWORD_LOGIN] Auth0 authentication successful")
                    
                    # Get user info from Auth0
                    access_token = auth_data.get('access_token')
                    userinfo_url = f'https://{auth0_domain}/userinfo'
                    userinfo_response = requests.get(
                        userinfo_url,
                        headers={'Authorization': f'Bearer {access_token}'},
                        timeout=10
                    )
                    
                    if userinfo_response.status_code == 200:
                        userinfo = userinfo_response.json()
                        auth0_sub = userinfo.get('sub')
                        logger.info(f"🔐 [PASSWORD_LOGIN] Got user info from Auth0, sub: {auth0_sub}")
                    else:
                        logger.error(f"🔐 [PASSWORD_LOGIN] Failed to get user info: {userinfo_response.status_code}")
                        auth0_sub = auth_data.get('sub', f'auth0|{email}')
                    
                    # Get or create user
                    with transaction.atomic():
                        user, created = User.objects.get_or_create(
                            auth0_sub=auth0_sub,
                            defaults={
                                'email': email,
                                'is_active': True
                            }
                        )
                        
                        if created:
                            logger.info(f"🔐 [PASSWORD_LOGIN] Created new user: {user.id}")
                        else:
                            logger.info(f"🔐 [PASSWORD_LOGIN] Found existing user: {user.id}")
                        
                        # Check if user account is closed
                        if hasattr(user, 'account_closed') and user.account_closed:
                            logger.warning(f"🔐 [PASSWORD_LOGIN] User account is closed: {user.id}")
                            return Response({
                                'error': 'This account has been closed. Please contact support if you need assistance.'
                            }, status=status.HTTP_403_FORBIDDEN)
                        
                        # Get tenant information
                        tenant = Tenant.objects.filter(owner_id=user.id).first()
                        tenant_data = None
                        if tenant:
                            tenant_data = {
                                'id': str(tenant.id),
                                'name': tenant.name
                            }
                            logger.info(f"🔐 [PASSWORD_LOGIN] User has tenant: {tenant.id}")
                        else:
                            logger.info(f"🔐 [PASSWORD_LOGIN] User has no tenant yet")
                        
                        # Check onboarding status
                        try:
                            onboarding = OnboardingProgress.objects.get(user=user)
                            needs_onboarding = onboarding.current_step != 'complete'
                            current_step = onboarding.current_step
                            subscription_plan = onboarding.selected_plan
                        except OnboardingProgress.DoesNotExist:
                            needs_onboarding = not user.onboarding_completed
                            current_step = 'business_info'
                            subscription_plan = 'basic'
                        
                        # Create session
                        remember_me = request.data.get('remember_me', False)
                        session_duration = 7 * 24 * 60 * 60 if remember_me else 24 * 60 * 60  # 7 days or 24 hours
                        
                        # Create session using the correct method signature
                        session = session_service.create_session(
                            user=user,
                            access_token=access_token
                        )
                        
                        # Get session data for response
                        session_data = {
                            'session_token': str(session.session_id),
                            'expires_at': session.expires_at
                        }
                        
                        logger.info(f"🔐 [PASSWORD_LOGIN] Session created: {session_data['session_token']}")
                        
                        # Prepare response
                        response_data = {
                            'success': True,
                            'session_token': session_data['session_token'],
                            'session_id': session_data['session_token'],  # For compatibility
                            'expires_at': session_data['expires_at'].isoformat(),
                            'user': {
                                'id': user.id,
                                'email': user.email,
                                'name': getattr(user, 'name', user.email),
                                'picture': getattr(user, 'picture', ''),
                                'role': getattr(user, 'role', 'USER')
                            },
                            'tenant': tenant_data,
                            'tenant_id': str(tenant.id) if tenant else None,
                            'tenantId': str(tenant.id) if tenant else None,  # For frontend compatibility
                            'needs_onboarding': needs_onboarding,
                            'onboarding_completed': not needs_onboarding,
                            'current_step': current_step,
                            'subscription_plan': subscription_plan,
                            'auth0_sub': auth0_sub
                        }
                        
                        # Create response with session cookie
                        response = Response(response_data, status=status.HTTP_200_OK)
                        
                        # Set session cookie
                        max_age = session_duration
                        response.set_cookie(
                            'session_token',
                            session_data['session_token'],
                            max_age=max_age,
                            httponly=True,
                            secure=True,
                            samesite='Lax'
                        )
                        
                        logger.info(f"🔐 [PASSWORD_LOGIN] Login successful for user: {user.id}")
                        return response
                        
                elif auth_response.status_code == 401:
                    logger.warning(f"🔐 [PASSWORD_LOGIN] Invalid credentials for: {email}")
                    return Response({
                        'error': 'Wrong email or password'
                    }, status=status.HTTP_401_UNAUTHORIZED)
                    
                elif auth_response.status_code == 403:
                    error_data = auth_response.json()
                    logger.error(f"🔐 [PASSWORD_LOGIN] Auth0 403 error: {error_data}")
                    return Response({
                        'error': error_data.get('error_description', 'Authentication forbidden')
                    }, status=status.HTTP_403_FORBIDDEN)
                    
                else:
                    error_data = auth_response.json() if auth_response.text else {}
                    logger.error(f"🔐 [PASSWORD_LOGIN] Auth0 error {auth_response.status_code}: {error_data}")
                    return Response({
                        'error': 'Authentication service error. Please try again later.'
                    }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                    
            except requests.exceptions.Timeout:
                logger.error("🔐 [PASSWORD_LOGIN] Auth0 request timeout")
                return Response({
                    'error': 'Authentication service timeout. Please try again.'
                }, status=status.HTTP_504_GATEWAY_TIMEOUT)
                
            except requests.exceptions.RequestException as e:
                logger.error(f"🔐 [PASSWORD_LOGIN] Auth0 request failed: {str(e)}")
                return Response({
                    'error': 'Authentication service unavailable. Please try again later.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                
        except Exception as e:
            logger.error(f"🔐 [PASSWORD_LOGIN] Unexpected error: {str(e)}")
            logger.error(f"🔐 [PASSWORD_LOGIN] Traceback: {traceback.format_exc()}")
            return Response({
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DeploymentCheckView(APIView):
    """Simple endpoint to verify deployment"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        return Response({
            'status': 'ok',
            'message': 'Deployment successful',
            'timestamp': timezone.now().isoformat(),
            'version': '2025-07-11-v1'
        }, status=status.HTTP_200_OK)
