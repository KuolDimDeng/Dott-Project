"""
OAuth Token Exchange View
Handles Auth0 OAuth token exchange securely on the backend
"""

import logging
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)


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
                    
                    # Return the tokens to frontend
                    return Response({
                        'access_token': tokens.get('access_token'),
                        'id_token': tokens.get('id_token'),
                        'refresh_token': tokens.get('refresh_token'),
                        'expires_in': tokens.get('expires_in'),
                        'token_type': tokens.get('token_type', 'Bearer')
                    }, status=status.HTTP_200_OK)
                    
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