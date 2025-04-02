from typing import Dict, Optional, Tuple
import jwt
from jwt.algorithms import RSAAlgorithm
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError, connections
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
import logging
import json
from datetime import datetime, timedelta

# Ensure default database connection is initialized
connections['default']

logger = logging.getLogger(__name__)
User = get_user_model()

class CognitoJWTAuthentication(JWTAuthentication):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.jwks_url = f"https://cognito-idp.{settings.AWS_REGION}.amazonaws.com/{settings.COGNITO_USER_POOL_ID}/.well-known/jwks.json"
        self._jwks = None
        self._jwks_last_updated = None
        self._jwks_cache_ttl = timedelta(hours=1)
        self.request = None  # Initialize request attribute

    def get_jwks(self) -> Dict:
        """
        Fetches the JWKS from Cognito with in-memory caching
        """
        now = datetime.now()
        
        # Return cached JWKS if still valid
        if (self._jwks is not None and 
            self._jwks_last_updated is not None and 
            now - self._jwks_last_updated < self._jwks_cache_ttl):
            logger.debug("Using cached JWKS")
            return self._jwks
        
        try:
            logger.debug(f"Fetching JWKS from {self.jwks_url}")
            response = requests.get(self.jwks_url)
            response.raise_for_status()
            self._jwks = response.json()
            self._jwks_last_updated = now
            logger.debug(f"JWKS fetched and cached: {json.dumps(self._jwks)}")
            return self._jwks
        except Exception as e:
            logger.error(f"Failed to fetch JWKS: {str(e)}")
            raise InvalidToken('Unable to fetch JWKS')

    def get_signing_key(self, kid: str):
        """
        Gets the signing key from JWKS that matches the key ID
        """
        jwks = self.get_jwks()
        logger.debug(f"Looking for key ID: {kid}")
        for key in jwks.get('keys', []):
            if key.get('kid') == kid:
                try:
                    logger.debug(f"Found matching key: {json.dumps(key)}")
                    return RSAAlgorithm.from_jwk(json.dumps(key))  # Convert key to JSON string
                except Exception as e:
                    logger.error(f"Failed to parse JWK: {str(e)}")
                    raise InvalidToken('Invalid signing key')
        logger.error(f"No key found with ID: {kid}")
        raise InvalidToken('No matching key found')

    def get_validated_token(self, raw_token):
        """
        Validates the JWT token using Cognito's public keys
        """
        if not raw_token:
            raise InvalidToken('No token provided')

        try:
            # First decode without verification to get the header
            unverified_header = jwt.get_unverified_header(raw_token)
            logger.debug(f"Token header: {json.dumps(unverified_header)}")
            kid = unverified_header.get('kid')
            if not kid:
                raise InvalidToken('No key ID found in token header')

            # Get the signing key
            public_key = self.get_signing_key(kid)

            try:
                # First decode without verification to check claims
                unverified_payload = jwt.decode(raw_token, options={'verify_signature': False})
                logger.debug(f"Unverified payload: {json.dumps(unverified_payload)}")

                # Check if we're in development mode
                is_development = getattr(settings, 'DEBUG', False)
                enforce_aws_auth = getattr(settings, 'USE_AWS_AUTH', True)
                
                # In development mode, be more lenient with token expiration
                if is_development and not enforce_aws_auth:
                    # Check if token is expired
                    now = datetime.now().timestamp()
                    if 'exp' in unverified_payload and unverified_payload['exp'] < now:
                        logger.warning(
                            "Token has expired but continuing in development mode",
                            extra={
                                'exp': unverified_payload['exp'],
                                'now': now,
                                'diff_minutes': (unverified_payload['exp'] - now) / 60,
                                'exp_time': datetime.fromtimestamp(unverified_payload['exp']).isoformat(),
                                'current_time': datetime.fromtimestamp(now).isoformat()
                            }
                        )
                
                # Verify and decode the token with modified options
                payload = jwt.decode(
                    raw_token,
                    key=public_key,  # type: ignore # RSA key object is acceptable for PyJWT                                                                                                                                                                                                                                                                                                                        
                    algorithms=['RS256'],
                    issuer=f"https://cognito-idp.{settings.AWS_REGION}.amazonaws.com/{settings.COGNITO_USER_POOL_ID}",
                    options={
                        'verify_exp': True if enforce_aws_auth else not is_development,
                        'verify_iss': True,
                        'verify_aud': False,  # Skip audience verification
                    }
                )
            except jwt.ExpiredSignatureError:
                # Check if we're in development mode
                is_development = getattr(settings, 'DEBUG', False)
                enforce_aws_auth = getattr(settings, 'USE_AWS_AUTH', True)
                
                if is_development and not enforce_aws_auth:
                    # In development mode, log a warning but continue
                    logger.warning("Token has expired but continuing in development mode")
                    # Extract payload without verification for development mode
                    try:
                        payload = jwt.decode(raw_token, options={'verify_signature': False, 'verify_exp': False})
                        # Still verify basic structure
                        if not payload.get('sub'):
                            raise InvalidToken('Missing sub claim')
                        logger.debug(f"Using unverified token in development mode: {json.dumps(payload)}")
                        return payload
                    except Exception as e:
                        logger.error(f"Failed to use expired token in development mode: {str(e)}")
                        raise InvalidToken('Token validation failed')
                else:
                    # In production, strictly enforce token expiration
                    logger.error("Token has expired")
                    # Create a special error for token expiration with proper response format
                    token_error = InvalidToken('Token has expired')
                    # Add custom attributes as context for response middleware
                    token_error.detail = {
                        'code': 'token_expired',
                        'message': 'Your session has expired. Please sign in again.',
                        'action': 'refresh_token'
                    }
                    raise token_error
            except jwt.InvalidIssuerError:
                logger.error("Invalid token issuer", extra={'token_claims': unverified_payload})
                raise InvalidToken('Invalid token issuer')
            except jwt.InvalidTokenError as e:
                logger.error(f"Invalid token: {str(e)}", extra={'token_claims': unverified_payload})
                raise InvalidToken(f'Invalid token: {str(e)}')

            # Verify required claims
            if not payload.get('sub'):
                raise InvalidToken('Missing sub claim')
            if not payload.get('client_id'):
                raise InvalidToken('Missing client_id claim')
            if payload.get('client_id') != settings.COGNITO_APP_CLIENT_ID:
                raise InvalidToken('Invalid client_id')
            if not payload.get('token_use') == 'access':
                raise InvalidToken('Invalid token_use')

            logger.debug(f"Token payload: {json.dumps(payload)}")
            return payload
        except jwt.ExpiredSignatureError:
            # This is a duplicate of the ExpiredSignatureError handler above - replacing with improved handling
            is_development = getattr(settings, 'DEBUG', False) 
            enforce_aws_auth = getattr(settings, 'USE_AWS_AUTH', True)
            
            if is_development and not enforce_aws_auth:
                # In development mode, log a warning but continue
                logger.warning("Token has expired but continuing in development mode (main handler)")
                # Extract payload without verification for development mode
                try:
                    payload = jwt.decode(raw_token, options={'verify_signature': False, 'verify_exp': False})
                    # Still verify basic structure
                    if not payload.get('sub'):
                        raise InvalidToken('Missing sub claim')
                    logger.debug(f"Using unverified token in development mode: {json.dumps(payload)}")
                    return payload
                except Exception as e:
                    logger.error(f"Failed to use expired token in development mode: {str(e)}")
                    raise InvalidToken('Token validation failed')
            else:
                # In production, strictly enforce token expiration
                logger.error("Token has expired")
                # Create a special error for token expiration with proper response format
                token_error = InvalidToken('Token has expired')
                # Add custom attributes as context for response middleware
                token_error.detail = {
                    'code': 'token_expired',
                    'message': 'Your session has expired. Please sign in again.',
                    'action': 'refresh_token'
                }
                raise token_error
        except jwt.InvalidTokenError as e:
            logger.error(f"Token validation failed: {str(e)}")
            raise InvalidToken(str(e))
        except Exception as e:
            logger.error(f"Unexpected error during token validation: {str(e)}")
            raise InvalidToken('Token validation failed')

    def get_user(self, validated_token):
        """
        Gets or creates a user from the validated token
        """
        try:
            user_id = validated_token.get('sub')
            if not user_id:
                logger.error("No user ID (sub) found in token")
                raise InvalidToken('No user ID found in token')
            
            # Check if we should enforce Cognito verification
            enforce_aws_auth = getattr(settings, 'USE_AWS_AUTH', True)
            is_development = getattr(settings, 'DEBUG', False)
            
            # If enforcing AWS auth, verify user still exists in Cognito
            if enforce_aws_auth:
                try:
                    # Import boto3 here to avoid circular imports
                    import boto3
                    
                    # Create Cognito client
                    cognito_client = boto3.client(
                        'cognito-idp',
                        region_name=settings.AWS_REGION,
                        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
                    )
                    
                    # Try to get user info from Cognito
                    try:
                        # Use admin API to look up user by sub
                        user_info = cognito_client.admin_get_user(
                            UserPoolId=settings.COGNITO_USER_POOL_ID,
                            Username=user_id
                        )
                        logger.info(f"Verified user exists in Cognito: {user_id}")
                    except Exception as e:
                        logger.error(f"User not found in Cognito or access denied: {str(e)}")
                        raise InvalidToken('User not found in Cognito identity provider')
                except Exception as e:
                    logger.error(f"Error verifying user in Cognito: {str(e)}")
                    if not is_development:
                        raise InvalidToken('Failed to verify user with identity provider')

            logger.info(f"Looking up user with Cognito sub: {user_id}")
            # Get user by Cognito sub with detailed error handling
            try:
                # First try to find by cognito_sub
                logger.debug(f"Attempting to find user by cognito_sub: {user_id}")
                try:
                    # For RLS approach, we don't need to set tenant context yet
                    # because we're querying the user table which isn't tenant-specific
                    user = User.objects.using('default').get(cognito_sub=user_id)
                    logger.info(f"Found user by cognito_sub: {user_id}, Email: {user.email}")  # type: ignore
                    
                    # Verify user is active
                    if not user.is_active:
                        logger.error(f"User {user_id} is inactive")
                        raise InvalidToken('User is inactive')
                    
                    # Set tenant context for RLS if user has a tenant
                    if user.tenant_id:  # type: ignore
                        # Import here to avoid circular import
                        from custom_auth.rls import set_tenant_in_db
                        logger.debug(f"Setting RLS tenant context to {user.tenant_id}")  # type: ignore
                        # Pass is_superuser flag to bypass RLS for admin users
                        set_tenant_in_db(user.tenant_id)  # type: ignore
                        
                    return user
                except User.DoesNotExist:
                    logger.warning(f"User not found with cognito_sub: {user_id}")
                    raise
            except User.DoesNotExist:
                # Log detailed information for debugging
                logger.warning(f"User not found for Cognito sub: {user_id}")
                logger.debug(f"Token payload: {json.dumps(validated_token)}")
                
                # Get email from ID token header
                id_token = self.request.headers.get('X-Id-Token') if self.request else None  # Check if request exists
                logger.debug(f"ID Token present in headers: {bool(id_token)}")
                if self.request:
                    logger.debug(f"All headers: {dict(self.request.headers)}")
                
                if id_token:
                    try:
                        # Decode ID token without verification since we already verified access token
                        id_token_payload = jwt.decode(id_token, options={'verify_signature': False})
                        logger.debug(f"ID Token payload: {json.dumps(id_token_payload)}")
                        email = id_token_payload.get('email')
                        
                        if email:
                            logger.info(f"Found email in ID token: {email}")
                            try:
                                user = User.objects.using('default').get(email=email)
                                # Update user with cognito_sub
                                logger.info(f"Found user by email: {email}, updating cognito_sub to: {user_id}")
                                user.cognito_sub = user_id  # type: ignore
                                user.save(using='default', update_fields=['cognito_sub'])
                                logger.info(f"Successfully updated user with cognito_sub. Email: {email}, Cognito sub: {user_id}")
                                return user
                            except User.DoesNotExist:
                                logger.error(f"No user found with email: {email}")
                                # Try to get user info from Cognito
                                try:
                                    logger.info("Attempting to create user from Cognito attributes")
                                    try:
                                        # Try to get user one more time to handle race conditions
                                        try:
                                            user = User.objects.using('default').get(email=email)
                                            # Update cognito_sub if needed
                                            if not user.cognito_sub:  # type: ignore
                                                user.cognito_sub = user_id  # type: ignore
                                                user.save(using='default', update_fields=['cognito_sub'])
                                            return user
                                        except User.DoesNotExist:
                                            # Create user with only valid fields
                                            user = User.objects.using('default').create(
                                                email=email,
                                                cognito_sub=user_id,
                                                is_active=True,
                                                first_name=id_token_payload.get('given_name', ''),
                                                last_name=id_token_payload.get('family_name', '')
                                            )
                                            logger.info(f"Successfully created user with email: {email} and cognito_sub: {user_id}")
                                            return user
                                    except IntegrityError as e:
                                        # Handle race condition where user was created between our checks
                                        logger.warning(f"Race condition creating user: {str(e)}")
                                        user = User.objects.using('default').get(email=email)
                                        if not user.cognito_sub:  # type: ignore
                                            user.cognito_sub = user_id  # type: ignore
                                            user.save(using='default', update_fields=['cognito_sub'])
                                        return user
                                    except Exception as e:
                                        logger.error(f"Failed to create user with error: {str(e)}", exc_info=True)
                                        logger.error(f"Attempted to create user with data: email={email}, cognito_sub={user_id}, "
                                                   f"first_name={id_token_payload.get('given_name')}, "
                                                   f"last_name={id_token_payload.get('family_name')}")
                                        raise
                                    logger.info(f"Created new user from ID token. Email: {email}, Cognito sub: {user_id}")
                                    return user
                                except Exception as e:
                                    logger.error(f"Failed to create user: {str(e)}", exc_info=True)
                                    logger.error(f"ID token payload: {json.dumps(id_token_payload)}")
                                    logger.error(f"Attempted to create user with email: {email}, cognito_sub: {user_id}")
                    except jwt.InvalidTokenError as e:
                        logger.error(f"Invalid ID token: {str(e)}")
                        logger.debug(f"Raw ID token (first 50 chars): {id_token[:50]}...")
                    except Exception as e:
                        logger.error(f"Error decoding ID token: {str(e)}", exc_info=True)
                        logger.debug(f"Raw ID token (first 50 chars): {id_token[:50]}...")
                else:
                    logger.error("No ID token provided in request headers")
                    if self.request:  # Check if request exists
                        logger.debug("Available headers: " + ", ".join(self.request.headers.keys()))
                
                logger.error(f"No user found with cognito_sub and no valid ID token provided. Sub: {user_id}")
                raise InvalidToken('User not found')

            if not user.is_active:
                logger.error(f"User {user_id} is inactive")
                raise InvalidToken('User is inactive')

            logger.debug(f"User found and active: {user.email}")
            return user
        except User.DoesNotExist:
            logger.error(f"User not found for Cognito sub: {user_id}")
            raise InvalidToken('User not found')
        except Exception as e:
            logger.error(f"Error getting user: {str(e)}")
            raise InvalidToken('Error retrieving user')

    def authenticate(self, request) -> Optional[Tuple]:
        """
        Authenticates the request using the JWT token
        """
        self.request = request  # Store request object for use in get_user
        
        header = self.get_header(request)
        if header is None:
            logger.debug("No auth header found")
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            logger.debug("No token found in auth header")
            return None

        try:
            logger.debug("Starting token validation")
            validated_token = self.get_validated_token(raw_token)
            logger.debug("Token validated, getting user")
            user = self.get_user(validated_token)
            logger.debug(f"Authentication successful for user: {user.email}")
            return (user, validated_token)
        except TokenError as e:
            logger.error(f"Authentication failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected authentication error: {str(e)}")
            return None