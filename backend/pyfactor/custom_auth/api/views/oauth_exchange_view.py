"""
OAuth Token Exchange View
Handles Auth0 OAuth token exchange securely on the backend
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
from django.db import transaction

logger = logging.getLogger(__name__)
User = get_user_model()


class OAuthExchangeView(APIView):
    """
    Exchange OAuth authorization code for tokens
    Endpoint: POST /api/auth/oauth-exchange/
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        logger.info("🔐 [OAUTH_EXCHANGE] === STARTING OAUTH TOKEN EXCHANGE ===")
        logger.info(f"🔐 [OAUTH_EXCHANGE] Request path: {request.path}")
        logger.info(f"🔐 [OAUTH_EXCHANGE] Request method: {request.method}")
        logger.info(f"🔐 [OAUTH_EXCHANGE] Request headers: {dict(request.headers)}")
        logger.info(f"🔐 [OAUTH_EXCHANGE] Request data: {request.data}")
        
        try:
            # Extract code and redirect_uri from request
            code = request.data.get('code')
            redirect_uri = request.data.get('redirect_uri')
            code_verifier = request.data.get('code_verifier')  # For PKCE
            
            logger.info(f"🔐 [OAUTH_EXCHANGE] Code received: {code[:10] if code else 'None'}...")
            logger.info(f"🔐 [OAUTH_EXCHANGE] Code length: {len(code) if code else 0}")
            logger.info(f"🔐 [OAUTH_EXCHANGE] Redirect URI: {redirect_uri}")
            logger.info(f"🔐 [OAUTH_EXCHANGE] PKCE verifier present: {bool(code_verifier)}")
            logger.info(f"🔐 [OAUTH_EXCHANGE] PKCE verifier length: {len(code_verifier) if code_verifier else 0}")
            
            if not code:
                logger.error("🔐 [OAUTH_EXCHANGE] Missing authorization code")
                return Response({
                    'error': 'Missing authorization code'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get Auth0 configuration
            auth0_domain = getattr(settings, 'AUTH0_DOMAIN', None)
            client_id = getattr(settings, 'AUTH0_CLIENT_ID', None)
            client_secret = getattr(settings, 'AUTH0_CLIENT_SECRET', None)
            
            logger.info(f"🔐 [OAUTH_EXCHANGE] Auth0 config check:")
            logger.info(f"🔐 [OAUTH_EXCHANGE]   - AUTH0_DOMAIN: {'✓' if auth0_domain else '✗'} ({auth0_domain})")
            logger.info(f"🔐 [OAUTH_EXCHANGE]   - AUTH0_CLIENT_ID: {'✓' if client_id else '✗'} ({client_id[:10]}... if client_id else None)")
            logger.info(f"🔐 [OAUTH_EXCHANGE]   - AUTH0_CLIENT_SECRET: {'✓' if client_secret else '✗'} (hidden)")
            
            if not auth0_domain or not client_id or not client_secret:
                missing = []
                if not auth0_domain:
                    missing.append('AUTH0_DOMAIN')
                if not client_id:
                    missing.append('AUTH0_CLIENT_ID')
                if not client_secret:
                    missing.append('AUTH0_CLIENT_SECRET')
                    
                logger.error(f"🔐 [OAUTH_EXCHANGE] Missing Auth0 configuration: {', '.join(missing)}")
                logger.error(f"🔐 [OAUTH_EXCHANGE] Available settings attributes: {[attr for attr in dir(settings) if attr.startswith('AUTH0')]}")
                
                return Response({
                    'error': 'Server configuration error',
                    'details': f'Missing Auth0 configuration: {', '.join(missing)}'
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
            
            # Add PKCE verifier if provided
            if code_verifier:
                token_payload['code_verifier'] = code_verifier
                logger.info("🔐 [OAUTH_EXCHANGE] Including PKCE code_verifier")
            
            logger.info(f"🔐 [OAUTH_EXCHANGE] Exchanging code at: {token_url}")
            
            try:
                response = requests.post(
                    token_url,
                    json=token_payload,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                logger.info(f"🔐 [OAUTH_EXCHANGE] Auth0 response status: {response.status_code}")
                
                if response.status_code == 200:
                    tokens = response.json()
                    logger.info("🔐 [OAUTH_EXCHANGE] Token exchange successful")
                    logger.info(f"🔐 [OAUTH_EXCHANGE] Tokens received: access_token={bool(tokens.get('access_token'))}, id_token={bool(tokens.get('id_token'))}")
                    
                    # Decode the ID token to get user info
                    id_token = tokens.get('id_token')
                    if not id_token:
                        logger.error("🔐 [OAUTH_EXCHANGE] No ID token received")
                        return Response({
                            'error': 'No ID token received from Auth0'
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                    try:
                        # Decode without verification for user info (verification done by Auth0)
                        user_info = jwt.decode(id_token, options={"verify_signature": False})
                        logger.info(f"🔐 [OAUTH_EXCHANGE] User info from ID token: email={user_info.get('email')}, sub={user_info.get('sub')}")
                        
                        # Get or create user
                        email = user_info.get('email')
                        if not email:
                            logger.error("🔐 [OAUTH_EXCHANGE] No email in ID token")
                            return Response({
                                'error': 'No email found in authentication response'
                            }, status=status.HTTP_400_BAD_REQUEST)
                        
                        # Create or update user
                        with transaction.atomic():
                            # Extract first and last name from Google OAuth data
                            first_name = user_info.get('given_name', '')
                            last_name = user_info.get('family_name', '')
                            full_name = user_info.get('name', '')
                            
                            # If given_name/family_name not provided, try to extract from full name
                            if not first_name and not last_name and full_name:
                                name_parts = full_name.strip().split(' ', 1)
                                first_name = name_parts[0] if len(name_parts) >= 1 else ''
                                last_name = name_parts[1] if len(name_parts) >= 2 else ''
                            
                            logger.info(f"🔐 [OAUTH_EXCHANGE] Extracted names - first: '{first_name}', last: '{last_name}', full: '{full_name}'")
                            
                            user, created = User.objects.get_or_create(
                                email=email.lower(),
                                defaults={
                                    'name': full_name,
                                    'first_name': first_name,
                                    'last_name': last_name,
                                    'picture': user_info.get('picture', ''),
                                    'is_active': True,
                                    'email_verified': user_info.get('email_verified', False)
                                }
                            )
                            
                            if not created:
                                # Update existing user
                                user.name = full_name or user.name
                                user.picture = user_info.get('picture', user.picture)
                                user.email_verified = user_info.get('email_verified', user.email_verified)
                                
                                # Update first and last name if provided and user doesn't have them
                                if first_name and not user.first_name:
                                    user.first_name = first_name
                                if last_name and not user.last_name:
                                    user.last_name = last_name
                                
                                user.save()
                            
                            logger.info(f"🔐 [OAUTH_EXCHANGE] User {'created' if created else 'updated'}: {user.email}")
                            
                            # Get tenant ONLY for users who have completed onboarding
                            from custom_auth.models import Tenant
                            
                            tenant = None
                            if user.onboarding_completed:
                                # Try to find existing tenant for user
                                tenant = Tenant.objects.filter(owner_id=str(user.id)).first()
                                
                                if not tenant:
                                    # This shouldn't happen - completed users should have a tenant
                                    logger.warning(f"🔐 [OAUTH_EXCHANGE] User {user.email} marked as onboarding_completed but has no tenant")
                            else:
                                # New users don't get a tenant until they complete onboarding
                                logger.info(f"🔐 [OAUTH_EXCHANGE] New user {user.email} - tenant will be created during onboarding")
                            
                            # Create session
                            from session_manager.services import SessionService
                            session_service = SessionService()
                            
                            # Extract request metadata
                            request_meta = {
                                'ip_address': request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0] or request.META.get('REMOTE_ADDR'),
                                'user_agent': request.META.get('HTTP_USER_AGENT', '')
                            }
                            
                            session = session_service.create_session(
                                user=user,
                                access_token=tokens.get('access_token'),
                                request_meta=request_meta,
                                tenant=tenant,
                                session_data={
                                    'auth_method': 'oauth',
                                    'provider': 'google',
                                    'auth0_sub': user_info.get('sub')
                                }
                            )
                            
                            logger.info(f"🔐 [OAUTH_EXCHANGE] Session created with ID: {session.session_id}")
                            
                            # Return session token and user info
                            response_data = {
                                'success': True,
                                'authenticated': True,
                                'session_token': str(session.session_id),  # This is what the frontend expects
                                'user': {
                                    'id': user.id,
                                    'email': user.email,
                                    'name': user.name,
                                    'picture': user.picture,
                                    'onboarding_completed': user.onboarding_completed
                                },
                                'needs_onboarding': not user.onboarding_completed,
                                'access_token': tokens.get('access_token'),  # Keep for backward compatibility
                                'id_token': tokens.get('id_token'),
                                'expires_in': tokens.get('expires_in')
                            }
                            
                            # Only include tenant_id for users who have completed onboarding
                            if tenant:
                                response_data['user']['tenant_id'] = tenant.id
                            
                            return Response(response_data, status=status.HTTP_200_OK)
                            
                    except jwt.DecodeError as e:
                        logger.error(f"🔐 [OAUTH_EXCHANGE] Failed to decode ID token: {e}")
                        return Response({
                            'error': 'Invalid ID token'
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    except Exception as e:
                        logger.error(f"🔐 [OAUTH_EXCHANGE] User/session creation failed: {e}")
                        return Response({
                            'error': 'Failed to create user session'
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                else:
                    error_data = response.json() if response.text else {}
                    logger.error(f"🔐 [OAUTH_EXCHANGE] Token exchange failed: {error_data}")
                    
                    # Handle specific Auth0 errors
                    error_code = error_data.get('error', 'unknown_error')
                    error_desc = error_data.get('error_description', 'Token exchange failed')
                    
                    return Response({
                        'error': error_code,
                        'message': error_desc,
                        'status': response.status_code
                    }, status=response.status_code)
                    
            except requests.exceptions.Timeout:
                logger.error("🔐 [OAUTH_EXCHANGE] Auth0 request timeout")
                return Response({
                    'error': 'Authentication service timeout'
                }, status=status.HTTP_504_GATEWAY_TIMEOUT)
                
            except requests.exceptions.RequestException as e:
                logger.error(f"🔐 [OAUTH_EXCHANGE] Auth0 request failed: {str(e)}")
                return Response({
                    'error': 'Authentication service unavailable'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                
        except Exception as e:
            logger.error(f"🔐 [OAUTH_EXCHANGE] Unexpected error: {str(e)}")
            return Response({
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)