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
from asgiref.sync import sync_to_async
import asyncio

from .cognito import cognito_client

logger = logging.getLogger(__name__)
User = get_user_model()

class CognitoAuthentication(authentication.BaseAuthentication):
    """
    Custom authentication class for AWS Cognito.
    Validates Cognito tokens and creates or updates local users.
    """
    
    def __init__(self):
        """Initialize Cognito client"""
        logger.info("[Auth] CognitoAuthentication initialized")
        
        # Assuming boto3 is thread-safe
        try:
            if getattr(settings, 'USE_AWS_AUTH', True):
                self.cognito_client = boto3.client(
                    'cognito-idp',
                    region_name=settings.AWS_REGION,
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
                )
            else:
                logger.warning("[Auth] AWS Authentication disabled in settings")
                self.cognito_client = None
        except Exception as e:
            logger.error(f"[Auth] Error initializing Cognito client: {str(e)}")
            self.cognito_client = None
    
    def authenticate(self, request):
        """
        Synchronous authenticate method for DRF compatibility.
        This is what DRF will call directly.
        """
        # Check if we're in a Django async view
        try:
            # We need to handle this entirely synchronously for DRF
            # Never return a coroutine from this method
            return self._authenticate_sync(request)
        except Exception as e:
            logger.error(f"[Auth] Authentication error: {str(e)}")
            return None
    
    async def _authenticate_async(self, request):
        """
        Asynchronous authenticate method for ASGI context.
        """
        # Store request reference for later use in get_or_create_user
        self.request = request
        
        try:
            # Get token from Authorization header
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                # No token or invalid format
                logger.debug("[Auth] No Bearer token in request")
                return None
                
            token = auth_header.split(' ')[1]
            if not token:
                # Empty token
                logger.debug("[Auth] Empty token")
                return None
                
            try:
                # First, try to decode and verify the token without Cognito service
                # This helps catch basic issues before making API calls
                
                # Check if we're in development mode to handle expired tokens gracefully
                is_development = getattr(settings, 'DEBUG', False)
                
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
                enforce_aws_auth = getattr(settings, 'USE_AWS_AUTH', True)
                
                try:
                    # Now verify with Cognito service
                    user_data = self.cognito_client.get_user(AccessToken=token)
                    
                    logger.debug("[Auth] Token validation successful", {
                        'username': user_data.get('Username')
                    })
                    
                    # Get or create Django user
                    user = await self.get_or_create_user_async(user_data)
                    return (user, token)
                except ClientError as e:
                    # Check if this is an expired token error in development mode
                    error_code = e.response['Error']['Code']
                    error_msg = e.response['Error'].get('Message', str(e))
                    
                    # Check if we should bypass AWS auth in development (only if explicitly set)
                    if is_development and not enforce_aws_auth and (
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
                        user = await self.get_or_create_user_async(mock_user_data)
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
    
    def _authenticate_sync(self, request):
        """
        Fully synchronous implementation of authenticate
        """
        # Store request reference for later use in get_or_create_user
        self.request = request
        
        try:
            # Get token from Authorization header
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                # No token or invalid format
                logger.debug("[Auth] No Bearer token in request")
                return None
                
            token = auth_header.split(' ')[1]
            if not token:
                # Empty token
                logger.debug("[Auth] Empty token")
                return None
                
            try:
                # First, try to decode and verify the token without Cognito service
                # This helps catch basic issues before making API calls
                
                # Check if we're in development mode to handle expired tokens gracefully
                is_development = getattr(settings, 'DEBUG', False)
                
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
                enforce_aws_auth = getattr(settings, 'USE_AWS_AUTH', True)
                
                try:
                    # Now verify with Cognito service
                    user_data = self.cognito_client.get_user(AccessToken=token)
                    
                    logger.debug("[Auth] Token validation successful", {
                        'username': user_data.get('Username')
                    })
                    
                    # Get or create Django user - directly, not async
                    user = self.get_or_create_user(user_data)
                    return (user, token)
                except ClientError as e:
                    # Check if this is an expired token error in development mode
                    error_code = e.response['Error']['Code']
                    error_msg = e.response['Error'].get('Message', str(e))
                    
                    # Check if we should bypass AWS auth in development (only if explicitly set)
                    if is_development and not enforce_aws_auth and (
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
                        
                        # Get or create Django user using mock data - directly, not async
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
            
            # Try to get from token data if available
            # The decoded_token may not be available as an instance attribute,
            # so we'll check the token directly from the request if needed
            token_email = None
            auth_header = getattr(self.request, 'headers', {}).get('Authorization', '')
            if auth_header.startswith('Bearer '):
                try:
                    token = auth_header.split(' ')[1]
                    # Decode the token without verification to extract the email
                    token_payload = jwt.decode(token, options={"verify_signature": False})
                    token_email = token_payload.get('email')
                    if token_email:
                        logger.info(f"[Auth] Found email in bearer token: {token_email}")
                        email = token_email
                except Exception as e:
                    logger.warning(f"[Auth] Error extracting email from bearer token: {str(e)}")
            
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
                email = f"{cognito_sub}@placeholder.pyfactor.com"
                logger.warning(f"[Auth] Using placeholder email: {email}")
            else:
                # If we don't even have cognito_sub, we really can't proceed
                raise AuthenticationFailed('No email or cognito sub found in authentication data')
        
        # Extract other attributes
        first_name = attr_dict.get('given_name', '')
        last_name = attr_dict.get('family_name', '')
        
        # Get additional custom attributes but only use ones that exist on the User model
        user_model_fields = [f.name for f in User._meta.get_fields()]
        
        # Extract custom attributes that might be needed for the business/tenant models
        # but don't try to set them on the User model
        business_attributes = {}
        user_custom_attributes = {}
        
        for key, value in attr_dict.items():
            if key.startswith('custom:'):
                custom_name = key.replace('custom:', '')
                if custom_name in user_model_fields:
                    # Set only attributes that exist in the User model
                    user_custom_attributes[custom_name] = value
                else:
                    # Store other attributes for potential business use
                    business_attributes[custom_name] = value
        
        try:
            # Try to get existing user
            user = None
            
            # First try to find by cognito_sub if we have it
            if cognito_sub:
                try:
                    user = User.objects.get(cognito_sub=cognito_sub)
                except User.DoesNotExist:
                    logger.debug(f"[Auth] No user found with cognito_sub: {cognito_sub}")
            
            # If not found, try by email
            if not user and email:
                try:
                    user = User.objects.get(email=email)
                except User.DoesNotExist:
                    logger.debug(f"[Auth] No user found with email: {email}")
                except User.MultipleObjectsReturned:
                    # If multiple users with same email, try to find one with matching cognito_sub
                    if cognito_sub:
                        matching_users = User.objects.filter(email=email, cognito_sub=cognito_sub)
                        if matching_users.exists():
                            user = matching_users.first()
                        else:
                            # Get first user if no match
                            user = User.objects.filter(email=email).first()
                            logger.warning(f"[Auth] Multiple users with email {email}, using first one")
            
            # If still not found, create new user
            if not user:
                logger.info(f"[Auth] Creating new user with email: {email}")
                try:
                    # Create user with only the fields that match our model
                    # Do not include username as it's not in our model
                    user_fields = {
                        'email': email,
                        'first_name': first_name,
                        'last_name': last_name,
                        'cognito_sub': cognito_sub,
                        'role': attr_dict.get('custom:userrole', 'owner').lower()  # Default to 'owner' role
                    }
                    
                    # Add any custom attributes that exist in the User model
                    for attr_name, attr_value in user_custom_attributes.items():
                        if attr_name in user_model_fields and attr_name != 'username':
                            user_fields[attr_name] = attr_value
                    
                    # Create the user with proper password handling
                    user = User.objects.create_user(
                        **user_fields,
                        password=None  # No password needed as Cognito handles auth
                    )
                    logger.info(f"[Auth] Successfully created new user with email: {email}")
                except TypeError as e:
                    logger.error(f"[Auth] Type error creating user: {str(e)}")
                    # Fallback to create user with minimal fields
                    user = User.objects.create_user(
                        email=email,
                        password=None,  # No password needed as Cognito handles auth
                        first_name=first_name,
                        last_name=last_name,
                        cognito_sub=cognito_sub,
                        role=attr_dict.get('custom:userrole', 'owner').lower()  # Default to 'owner' role
                    )
                    logger.info(f"[Auth] Created user with fallback method for email: {email}")
            else:
                # Update existing user with latest data
                update_fields = []
                
                # Only update names if provided and different
                if first_name and user.first_name != first_name:
                    user.first_name = first_name
                    update_fields.append('first_name')
                
                if last_name and user.last_name != last_name:
                    user.last_name = last_name
                    update_fields.append('last_name')
                
                # Set or update cognito_sub if it's not set or different
                if cognito_sub and getattr(user, 'cognito_sub', None) != cognito_sub:
                    user.cognito_sub = cognito_sub
                    update_fields.append('cognito_sub')
                
                # Update custom attributes if they exist in the User model
                for attr_name, attr_value in user_custom_attributes.items():
                    try:
                        # Skip username field which is not in our User model
                        if attr_name == 'username':
                            logger.debug(f"[Auth] Skipping username attribute as it's not in User model")
                            continue
                            
                        if hasattr(user, attr_name):
                            setattr(user, attr_name, attr_value)
                            update_fields.append(attr_name)
                    except Exception as e:
                        logger.warning(f"[Auth] Failed to set attribute {attr_name} on user: {str(e)}")
                
                # Save user if any fields updated
                if update_fields:
                    try:
                        user.save(update_fields=update_fields)
                        logger.debug(f"[Auth] Updated user fields: {', '.join(update_fields)}")
                    except Exception as e:
                        logger.error(f"[Auth] Error updating user fields: {str(e)}")
                        # Try saving without specifying fields if that fails
                        try:
                            user.save()
                            logger.debug("[Auth] Saved user without specifying update_fields")
                        except Exception as e2:
                            logger.error(f"[Auth] Critical: Failed to save user: {str(e2)}")
            
            # Store business attributes in request for potential later use
            if hasattr(self, 'request') and self.request and business_attributes:
                self.request.business_attributes = business_attributes
            
            return user
            
        except Exception as e:
            logger.error(f"[Auth] Error creating/updating user: {str(e)}")
            raise
    
    # Create an async wrapper for the get_or_create_user method
    get_or_create_user_async = sync_to_async(get_or_create_user)

    def authenticate_header(self, request):
        """
        Return authentication header format for WWW-Authenticate response
        """
        return 'Bearer realm="api"'