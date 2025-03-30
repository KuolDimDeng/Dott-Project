# custom_auth/authentication.py
import logging
import boto3
import json
import jwt
import base64
import requests
import datetime
from botocore.exceptions import ClientError
from django.conf import settings
from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed
from .models import User
from django.contrib.auth import get_user_model

from .cognito import cognito_client

logger = logging.getLogger(__name__)
User = get_user_model()

class CognitoAuthentication(authentication.BaseAuthentication):
    def __init__(self):
        try:
            self.cognito_client = boto3.client(
                'cognito-idp',
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
            
            logger.info("[Auth] CognitoAuthentication initialized", {
                'region': settings.AWS_REGION,
                'user_pool_id': settings.COGNITO_USER_POOL_ID
            })
        except Exception as e:
            logger.error("[Auth] Failed to initialize Cognito client", {
                'error': str(e),
                'type': type(e).__name__,
                'region': settings.AWS_REGION
            })
            raise

    def authenticate(self, request):
        try:
            auth_header = request.headers.get('Authorization')
            
            if not auth_header:
                return None
                
            parts = auth_header.split()
            
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                return None
                
            token = parts[1]
            
            # Store the request for later use
            self.request = request
            
            # First do a quick validation by decoding the token
            try:
                decoded = jwt.decode(token, options={"verify_signature": False})
                # Store the decoded token for later use
                self.decoded_token = decoded
                
                # Check expiration manually
                exp = decoded.get('exp')
                if exp and datetime.datetime.fromtimestamp(exp) < datetime.datetime.now():
                    logger.warning("[Auth] Token is expired", {
                        'exp': exp,
                        'now': datetime.datetime.now().timestamp()
                    })
                    
                    # If in development mode, we might accept expired tokens
                    is_development = settings.DEBUG
                    if not is_development:
                        raise AuthenticationFailed({
                            'code': 'token_expired',
                            'message': 'Your session has expired. Please sign in again.'
                        })
            except Exception as e:
                logger.error("[Auth] Token decode failed", {
                    'error': str(e),
                    'token_length': len(token) if token else 0
                })
                raise AuthenticationFailed({
                    'code': 'invalid_token',
                    'message': 'Invalid authentication token',
                    'detail': str(e)
                })

            # Check if we're in development mode
            is_development = getattr(settings, 'DEBUG', False)
            
            # Validate token with Cognito
            try:
                # First validate token locally before calling Cognito
                if not token.startswith('eyJ') or token.count('.') != 2:
                    raise AuthenticationFailed('Invalid JWT format')

                # Decode token header to get key ID
                header = json.loads(base64.urlsafe_b64decode(token.split('.')[0] + '==='))
                kid = header.get('kid')
                if not kid:
                    raise AuthenticationFailed('Missing key ID in token header')

                # Get JWKS from Cognito
                jwks_url = f'https://cognito-idp.{settings.AWS_REGION}.amazonaws.com/{settings.COGNITO_USER_POOL_ID}/.well-known/jwks.json'
                jwks_response = requests.get(jwks_url)
                jwks_response.raise_for_status()
                jwks = jwks_response.json()

                # Find matching public key
                public_key = None
                for key in jwks['keys']:
                    if key['kid'] == kid:
                        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
                        break
                if not public_key:
                    raise AuthenticationFailed('No matching public key found')

                # Verify token signature and claims
                try:
                    decoded = jwt.decode(
                        token,
                        public_key,
                        algorithms=['RS256'],
                        issuer=f'https://cognito-idp.{settings.AWS_REGION}.amazonaws.com/{settings.COGNITO_USER_POOL_ID}',
                        options={
                            'require_exp': True,
                            'verify_aud': False,  # Make audience verification optional
                            'verify_signature': True
                        }
                    )
                except jwt.ExpiredSignatureError:
                    if is_development:
                        # In development mode, decode without verification for expired tokens
                        logger.warning("[Auth] Token expired but continuing in development mode")
                        decoded = jwt.decode(
                            token,
                            options={
                                'verify_signature': False,
                                'verify_exp': False
                            }
                        )
                    else:
                        # In production, strictly enforce token expiration
                        raise AuthenticationFailed('Token has expired')

                # Verify audience if present
                if 'aud' in decoded and decoded['aud'] != settings.COGNITO_APP_CLIENT_ID:
                    raise AuthenticationFailed('Invalid audience claim')

                # Verify token is not expired (already handled above, but keeping for clarity)
                now = datetime.datetime.utcnow().timestamp()
                
                if decoded['exp'] < now and not is_development:
                    raise AuthenticationFailed('Token has expired')

                # Check if we're in development mode
                is_development = getattr(settings, 'DEBUG', False)
                
                try:
                    # Now verify with Cognito service
                    user_data = self.cognito_client.get_user(AccessToken=token)
                    
                    logger.debug("[Auth] Token validation successful", {
                        'username': user_data.get('Username')
                    })
                    
                    # Get or create Django user
                    user = self.get_or_create_user(user_data)
                    return (user, token)
                except ClientError as e:
                    # Check if this is an expired token error in development mode
                    error_code = e.response['Error']['Code']
                    error_msg = e.response['Error'].get('Message', str(e))
                    
                    if is_development and (
                        'expired' in error_msg.lower() or
                        'token is invalid' in error_msg.lower()
                    ):
                        # In development mode, extract user info from the decoded token
                        logger.warning("[Auth] Token expired but continuing in development mode", {
                            'exp': decoded.get('exp'),
                            'now': datetime.datetime.utcnow().timestamp(),
                            'error_code': error_code,
                            'error_message': error_msg
                        })
                        
                        # Extract user info from token
                        cognito_sub = decoded.get('sub')
                        if not cognito_sub:
                            raise AuthenticationFailed('Missing sub claim in token')
                        
                        # Create mock user_data structure
                        mock_user_data = {
                            'Username': cognito_sub,
                            'UserAttributes': []
                        }
                        
                        # Add email from ID token if available
                        id_token = request.headers.get('X-Id-Token')
                        if id_token:
                            try:
                                id_token_payload = jwt.decode(id_token, options={'verify_signature': False})
                                if 'email' in id_token_payload:
                                    mock_user_data['UserAttributes'].append({
                                        'Name': 'email',
                                        'Value': id_token_payload['email']
                                    })
                                if 'given_name' in id_token_payload:
                                    mock_user_data['UserAttributes'].append({
                                        'Name': 'given_name',
                                        'Value': id_token_payload['given_name']
                                    })
                                if 'family_name' in id_token_payload:
                                    mock_user_data['UserAttributes'].append({
                                        'Name': 'family_name',
                                        'Value': id_token_payload['family_name']
                                    })
                            except Exception as id_err:
                                logger.warning("[Auth] Error decoding ID token in development mode", {
                                    'error': str(id_err)
                                })
                        
                        # Get or create Django user using mock data
                        user = self.get_or_create_user(mock_user_data)
                        return (user, decoded)
                    else:
                        # In production or for other errors, raise the exception
                        raise

            except ClientError as e:
                error_code = e.response['Error']['Code']
                error_msg = e.response['Error'].get('Message', str(e))
                
                logger.error("[Auth] Token validation failed", {
                    'error_code': error_code,
                    'error_message': error_msg
                })

                raise AuthenticationFailed({
                    'code': 'token_validation_failed',
                    'message': 'Please sign in again',
                    'detail': 'Your session has expired or is invalid'
                })

        except Exception as e:
            logger.error("[Auth] Unexpected authentication error", {
                'error': str(e),
                'type': type(e).__name__
            })
            raise AuthenticationFailed({
                'code': 'authentication_error',
                'message': 'Authentication failed',
                'detail': str(e)
            })

    def get_or_create_user(self, cognito_user):
        """Create or update local user from Cognito data"""
        # Extract user data
        attributes = cognito_user.get('UserAttributes', []) 
        if not attributes and 'Attributes' in cognito_user:
            attributes = cognito_user.get('Attributes', [])
            
        attr_dict = {attr['Name']: attr['Value'] for attr in attributes}
        
        # Get email and sub
        email = attr_dict.get('email')
        cognito_sub = cognito_user.get('Username')
        
        # ENHANCED ERROR HANDLING: Try to extract email from token if not in attributes
        if not email and hasattr(self, 'request') and self.request:
            logger.warning("[Auth] No email in Cognito user attributes, trying fallback methods")
            
            # Try to get from decoded token if available
            if hasattr(self, 'decoded_token') and self.decoded_token:
                token_email = self.decoded_token.get('email')
                if token_email:
                    logger.info(f"[Auth] Found email in decoded token: {token_email}")
                    email = token_email
            
            # Try to get from ID token if available
            if not email and hasattr(self, 'request') and self.request.headers.get('X-Id-Token'):
                try:
                    id_token = self.request.headers.get('X-Id-Token')
                    id_token_payload = jwt.decode(id_token, options={"verify_signature": False})
                    token_email = id_token_payload.get('email')
                    if token_email:
                        logger.info(f"[Auth] Found email in ID token: {token_email}")
                        email = token_email
                except Exception as e:
                    logger.warning(f"[Auth] Error extracting email from ID token: {str(e)}")
        
        if not email:
            logger.error("[Auth] No email found in Cognito user data or tokens")
            # INSTEAD OF FAILING, set a placeholder email if we have cognito_sub
            if cognito_sub:
                logger.warning(f"[Auth] Using placeholder email for cognito_sub: {cognito_sub}")
                email = f"{cognito_sub}@placeholder.auth"
            else:
                raise AuthenticationFailed('Invalid Cognito user data: no email or user ID')
        
        # Always include cognito_sub - remove the column check that was causing issues
        user = None
        created = False
        
        try:
            # Try to find user by email
            try:
                user = User.objects.get(email=email)
                # Always update the cognito_sub regardless of whether it was None before
                if user.cognito_sub != cognito_sub:
                    user.cognito_sub = cognito_sub
                    user.save(update_fields=['cognito_sub'])
                    logger.info(f"[Auth] Updated cognito_sub for user {email} to {cognito_sub}")
            except User.DoesNotExist:
                # Create new user
                logger.debug(f"[Auth] Creating new user with email: {email}")
                
                user = User.objects.create(
                    email=email,
                    cognito_sub=cognito_sub,
                    first_name=attr_dict.get('given_name', ''),
                    last_name=attr_dict.get('family_name', ''),
                    is_active=True
                )
                created = True

            if created:
                logger.info("[Auth] Created new user", {
                    'email': email,
                    'cognito_sub': cognito_sub
                })
            else:
                logger.info("[Auth] Updated existing user", {
                    'email': email,
                    'cognito_sub': cognito_sub
                })

            return user
            
        except Exception as e:
            logger.error(f"[Auth] Error creating/updating user: {str(e)}")
            raise AuthenticationFailed(f'Failed to create/update user: {str(e)}')

    def authenticate_header(self, request):
        return 'Bearer'