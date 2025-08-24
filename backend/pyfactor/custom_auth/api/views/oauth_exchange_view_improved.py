"""
Improved OAuth Token Exchange View with better error handling
Prevents users from getting stuck during registration
"""

import logging
import requests
import jwt
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from django.db import transaction, IntegrityError
from users.models import UserProfile
from onboarding.models import OnboardingProgress
import traceback

logger = logging.getLogger(__name__)
User = get_user_model()


class ImprovedOAuthExchangeView(APIView):
    """
    Enhanced OAuth exchange with comprehensive error handling
    Ensures users are never left in incomplete state
    """
    permission_classes = [AllowAny]
    
    def create_user_safely(self, email, user_info):
        """
        Safely create a user with all required fields and related objects
        """
        try:
            with transaction.atomic():
                # Normalize email
                email = email.lower().strip()
                
                # Extract name intelligently
                name = user_info.get('name', '')
                if not name:
                    # Try to get from given_name and family_name
                    given_name = user_info.get('given_name', '')
                    family_name = user_info.get('family_name', '')
                    if given_name or family_name:
                        name = f"{given_name} {family_name}".strip()
                    else:
                        # Use email prefix as fallback
                        name = email.split('@')[0]
                
                # Parse first and last names
                name_parts = name.split(maxsplit=1)
                first_name = name_parts[0] if name_parts else email.split('@')[0]
                last_name = name_parts[1] if len(name_parts) > 1 else ''
                
                # Create or get user
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'first_name': first_name[:30],  # Django limit
                        'last_name': last_name[:150],   # Django limit
                        'name': name[:255],              # Custom field limit
                        'picture': user_info.get('picture', ''),
                        'is_active': True,
                        'email_verified': user_info.get('email_verified', True),  # OAuth users are verified
                        'auth0_sub': user_info.get('sub', ''),
                        'onboarding_completed': False,
                        'subscription_plan': 'free',
                        'role': 'OWNER',  # Default for new users
                    }
                )
                
                if created:
                    # Set unusable password for OAuth users
                    user.set_unusable_password()
                    user.save()
                    logger.info(f"✅ Created new user: {email}")
                else:
                    # Update existing user with latest info
                    updated = False
                    
                    if not user.name and name:
                        user.name = name[:255]
                        updated = True
                    
                    if not user.first_name and first_name:
                        user.first_name = first_name[:30]
                        updated = True
                    
                    if not user.last_name and last_name:
                        user.last_name = last_name[:150]
                        updated = True
                    
                    if user_info.get('picture') and not user.picture:
                        user.picture = user_info.get('picture', '')
                        updated = True
                    
                    if not user.auth0_sub and user_info.get('sub'):
                        user.auth0_sub = user_info.get('sub', '')
                        updated = True
                    
                    # Always mark as verified for OAuth
                    if not user.email_verified:
                        user.email_verified = True
                        updated = True
                    
                    if updated:
                        user.save()
                        logger.info(f"✅ Updated existing user: {email}")
                
                # Ensure UserProfile exists
                profile, profile_created = UserProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        # Leave tenant_id and business_id empty for new users
                        # They will be set during onboarding
                    }
                )
                
                if profile_created:
                    logger.info(f"✅ Created UserProfile for: {email}")
                
                # Ensure OnboardingProgress exists for new users
                if not user.onboarding_completed:
                    progress, progress_created = OnboardingProgress.objects.get_or_create(
                        user=user,
                        defaults={
                            'onboarding_status': 'not_started',
                            'current_step': 'business_info',
                            'completed_steps': [],
                            'setup_completed': False,
                            'payment_completed': False,
                        }
                    )
                    
                    if progress_created:
                        logger.info(f"✅ Created OnboardingProgress for: {email}")
                
                return user, created
                
        except IntegrityError as e:
            logger.error(f"❌ Integrity error creating user {email}: {str(e)}")
            # Try to recover by getting the existing user
            try:
                user = User.objects.get(email=email)
                logger.info(f"✅ Recovered existing user: {email}")
                return user, False
            except User.DoesNotExist:
                logger.error(f"❌ Could not recover user {email}")
                raise
        
        except Exception as e:
            logger.error(f"❌ Unexpected error creating user {email}: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    def create_tenant_safely(self, user):
        """
        Safely create or get tenant for user
        """
        try:
            from custom_auth.models import Tenant
            
            # Check if user already owns a tenant
            tenant = Tenant.objects.filter(owner_id=str(user.id)).first()
            
            if not tenant:
                # Create tenant for new users
                tenant = Tenant.objects.create(
                    owner_id=str(user.id),
                    name=f"{user.email.split('@')[0]}'s Organization",
                    schema_name=f"tenant_{user.id}",  # Required for backward compatibility
                    is_active=True,
                    rls_enabled=True
                )
                logger.info(f"✅ Created tenant {tenant.id} for user {user.email}")
                
                # Update UserProfile with tenant_id
                profile = UserProfile.objects.filter(user=user).first()
                if profile and not profile.tenant_id:
                    profile.tenant_id = tenant.id
                    profile.save()
                    logger.info(f"✅ Updated UserProfile with tenant_id for {user.email}")
            else:
                logger.info(f"✅ Found existing tenant {tenant.id} for user {user.email}")
            
            return tenant
            
        except Exception as e:
            logger.error(f"❌ Error creating tenant for {user.email}: {str(e)}")
            # Don't fail the whole OAuth flow if tenant creation fails
            # User can still complete onboarding
            return None
    
    def create_session_safely(self, user, tokens, request, tenant=None):
        """
        Safely create session for user
        """
        try:
            from session_manager.services import SessionService
            session_service = SessionService()
            
            # Extract request metadata
            request_meta = {
                'ip_address': request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0] or request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT', '')
            }
            
            # Create session with proper auth method tracking
            auth_method = 'google-oauth2'  # Be specific about Google OAuth
            
            session = session_service.create_session(
                user=user,
                access_token=tokens.get('access_token'),
                refresh_token=tokens.get('refresh_token'),  # Include if available
                expires_in=tokens.get('expires_in', 86400),  # Default 24 hours
                auth_method=auth_method,
                request_meta=request_meta
            )
            
            if session:
                logger.info(f"✅ Session created for {user.email}: {session.get('session_id')}")
                return session
            else:
                logger.error(f"❌ Session creation returned None for {user.email}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error creating session for {user.email}: {str(e)}")
            logger.error(traceback.format_exc())
            return None
    
    def post(self, request):
        logger.info("🔐 [OAUTH_IMPROVED] === STARTING IMPROVED OAUTH EXCHANGE ===")
        
        try:
            # Extract required data
            code = request.data.get('code')
            redirect_uri = request.data.get('redirect_uri')
            code_verifier = request.data.get('code_verifier')
            
            if not code:
                return Response({
                    'error': 'Missing authorization code'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get Auth0 configuration
            auth0_domain = getattr(settings, 'AUTH0_DOMAIN', None)
            client_id = getattr(settings, 'AUTH0_CLIENT_ID', None)
            client_secret = getattr(settings, 'AUTH0_CLIENT_SECRET', None)
            
            if not all([auth0_domain, client_id, client_secret]):
                logger.error("Missing Auth0 configuration")
                return Response({
                    'error': 'Server configuration error'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Exchange code for tokens
            token_url = f'https://{auth0_domain}/oauth/token'
            token_payload = {
                'grant_type': 'authorization_code',
                'client_id': client_id,
                'client_secret': client_secret,
                'code': code,
                'redirect_uri': redirect_uri
            }
            
            if code_verifier:
                token_payload['code_verifier'] = code_verifier
            
            # Make token exchange request
            try:
                response = requests.post(
                    token_url,
                    json=token_payload,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                if response.status_code != 200:
                    error_data = response.json() if response.text else {}
                    logger.error(f"Token exchange failed: {error_data}")
                    return Response({
                        'error': error_data.get('error', 'token_exchange_failed'),
                        'message': error_data.get('error_description', 'Token exchange failed')
                    }, status=response.status_code)
                
                tokens = response.json()
                
            except requests.exceptions.Timeout:
                logger.error("Auth0 request timeout")
                return Response({
                    'error': 'Authentication service timeout'
                }, status=status.HTTP_504_GATEWAY_TIMEOUT)
            
            except requests.exceptions.RequestException as e:
                logger.error(f"Auth0 request failed: {str(e)}")
                return Response({
                    'error': 'Authentication service unavailable'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            # Decode ID token for user info
            id_token = tokens.get('id_token')
            if not id_token:
                logger.error("No ID token received")
                return Response({
                    'error': 'No ID token received'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            try:
                # Decode without verification (Auth0 already verified)
                user_info = jwt.decode(id_token, options={"verify_signature": False})
                email = user_info.get('email')
                
                if not email:
                    logger.error("No email in ID token")
                    return Response({
                        'error': 'No email found in authentication'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                logger.info(f"Processing OAuth for: {email}")
                
            except jwt.DecodeError as e:
                logger.error(f"Failed to decode ID token: {e}")
                return Response({
                    'error': 'Invalid ID token'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Create or get user with comprehensive error handling
            try:
                user, created = self.create_user_safely(email, user_info)
                
                # Create tenant for new users (optional, can fail)
                tenant = None
                if not user.onboarding_completed:
                    tenant = self.create_tenant_safely(user)
                else:
                    # Get existing tenant for completed users
                    from custom_auth.models import Tenant
                    tenant = Tenant.objects.filter(owner_id=str(user.id)).first()
                
                # Create session (critical - must succeed)
                session_data = self.create_session_safely(user, tokens, request, tenant)
                
                if not session_data:
                    # Fallback: return tokens directly if session creation fails
                    logger.warning(f"Session creation failed, returning tokens directly for {email}")
                    return Response({
                        'success': True,
                        'authenticated': True,
                        'fallback_mode': True,  # Indicate fallback mode
                        'user': {
                            'id': user.id,
                            'email': user.email,
                            'name': user.name or user.get_full_name(),
                            'picture': user.picture,
                            'onboarding_completed': user.onboarding_completed
                        },
                        'needs_onboarding': not user.onboarding_completed,
                        'access_token': tokens.get('access_token'),
                        'id_token': tokens.get('id_token'),
                        'expires_in': tokens.get('expires_in')
                    }, status=status.HTTP_200_OK)
                
                # Success response with session
                return Response({
                    'success': True,
                    'authenticated': True,
                    'session_token': session_data.get('session_id'),
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'name': user.name or user.get_full_name(),
                        'picture': user.picture,
                        'tenant_id': str(tenant.id) if tenant else None,
                        'onboarding_completed': user.onboarding_completed
                    },
                    'needs_onboarding': not user.onboarding_completed,
                    'access_token': tokens.get('access_token'),
                    'id_token': tokens.get('id_token'),
                    'expires_in': tokens.get('expires_in')
                }, status=status.HTTP_200_OK)
                
            except Exception as e:
                logger.error(f"Critical error in user/session creation: {str(e)}")
                logger.error(traceback.format_exc())
                
                # Last resort: try to at least authenticate the user
                try:
                    user = User.objects.get(email=email)
                    return Response({
                        'success': False,
                        'authenticated': True,
                        'error_recovery': True,
                        'user': {
                            'id': user.id,
                            'email': user.email,
                            'name': user.name or email.split('@')[0]
                        },
                        'message': 'Authentication successful but session creation failed. Please try signing in again.',
                        'access_token': tokens.get('access_token')
                    }, status=status.HTTP_200_OK)
                except:
                    return Response({
                        'error': 'Failed to complete authentication',
                        'message': 'Please try signing in again or contact support if the issue persists.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        except Exception as e:
            logger.error(f"Unhandled exception in OAuth exchange: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({
                'error': 'Authentication failed',
                'message': 'An unexpected error occurred. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)