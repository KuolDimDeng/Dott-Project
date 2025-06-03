# custom_auth/auth0_authentication.py
import logging
import json
import jwt
from jwt import PyJWTError
from jwt.algorithms import RSAAlgorithm
import requests
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple, Any

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import authentication, exceptions
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import IsAuthenticated
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt import PyJWKClient
from urllib.parse import urljoin

logger = logging.getLogger(__name__)
User = get_user_model()

class Auth0JWTAuthentication(authentication.BaseAuthentication):
    """
    Auth0 JWT Authentication for Django REST Framework
    Validates Auth0 tokens and creates/updates local users
    """
    
    def __init__(self):
        self.domain = getattr(settings, 'AUTH0_DOMAIN', None)
        self.audience = getattr(settings, 'AUTH0_AUDIENCE', None)
        self.client_id = getattr(settings, 'AUTH0_CLIENT_ID', None)
        
        if not self.domain:
            raise exceptions.AuthenticationFailed('Auth0 domain not configured')
            
        self.jwks_url = f"https://{self.domain}/.well-known/jwks.json"
        self.jwks_client = PyJWKClient(self.jwks_url)
    
    def authenticate(self, request):
        """
        Authenticate the request and return a two-tuple of (user, token).
        """
        token = self.get_token_from_request(request)
        if not token:
            return None
            
        try:
            # Decode and validate the JWT token
            user_info = self.validate_token(token)
            
            # Get or create user based on Auth0 info
            user = self.get_or_create_user(user_info)
            
            return (user, token)
            
        except Exception as e:
            logger.error(f"Auth0 authentication failed: {str(e)}")
            raise exceptions.AuthenticationFailed(f"Invalid token: {str(e)}")
    
    def get_token_from_request(self, request):
        """
        Extract JWT token from Authorization header.
        """
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        if not auth_header:
            return None
            
        try:
            auth_type, token = auth_header.split(' ', 1)
            if auth_type.lower() != 'bearer':
                return None
            return token
        except ValueError:
            return None
    
    def validate_token(self, token):
        """
        Validate JWT token against Auth0's public keys.
        """
        try:
            # Get the signing key from Auth0
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)
            
            # Decode and validate the token
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=self.audience,
                issuer=f"https://{self.domain}/"
            )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError as e:
            raise exceptions.AuthenticationFailed(f'Invalid token: {str(e)}')
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Token validation error: {str(e)}')
    
    def get_or_create_user(self, user_info):
        """
        Get or create a Django user based on Auth0 user information.
        """
        auth0_id = user_info.get('sub')
        email = user_info.get('email')
        
        if not auth0_id:
            raise exceptions.AuthenticationFailed('No user ID in token')
            
        if not email:
            raise exceptions.AuthenticationFailed('No email in token')
        
        try:
            # Try to find user by Auth0 ID first
            user = User.objects.get(auth0_sub=auth0_id)
            
            # Update email if it changed
            current_email = getattr(user, 'email', None)
            if current_email != email:
                setattr(user, 'email', email)
                user.save(update_fields=['email'])
                
            return user
            
        except User.DoesNotExist:
            # Try to find by email (for migration from Cognito)
            try:
                user = User.objects.get(email=email)
                # Link this user to Auth0
                setattr(user, 'auth0_sub', auth0_id)
                user.save(update_fields=['auth0_sub'])
                return user
                
            except User.DoesNotExist:
                # Create new user
                user_data = {
                    'email': email,
                    'auth0_sub': auth0_id,
                    'first_name': user_info.get('given_name', ''),
                    'last_name': user_info.get('family_name', ''),
                    'is_active': True,
                }
                
                # Use email as username if no username field
                if hasattr(User, 'username'):
                    user_data['username'] = email
                
                user = User.objects.create(**user_data)
                logger.info(f"Created new user from Auth0: {email} ({auth0_id})")
                return user


class Auth0Client:
    """
    Auth0 Management API client for additional operations.
    """
    
    def __init__(self):
        self.domain = getattr(settings, 'AUTH0_DOMAIN', None)
        self.client_id = getattr(settings, 'AUTH0_CLIENT_ID', None)
        self.client_secret = getattr(settings, 'AUTH0_CLIENT_SECRET', None)
        
        if not all([self.domain, self.client_id, self.client_secret]):
            logger.warning("Auth0 Management API not fully configured")
            self._token = None
        else:
            self._token = None
    
    def get_management_token(self):
        """
        Get Auth0 Management API token.
        """
        if not all([self.domain, self.client_id, self.client_secret]):
            return None
            
        try:
            response = requests.post(f"https://{self.domain}/oauth/token", {
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'audience': f"https://{self.domain}/api/v2/",
                'grant_type': 'client_credentials'
            })
            
            if response.status_code == 200:
                self._token = response.json().get('access_token')
                return self._token
            else:
                logger.error(f"Failed to get Auth0 management token: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting Auth0 management token: {str(e)}")
            return None
    
    def get_user_info(self, auth0_id):
        """
        Get additional user information from Auth0 Management API.
        """
        token = self.get_management_token()
        if not token:
            return None
            
        try:
            headers = {'Authorization': f'Bearer {token}'}
            response = requests.get(
                f"https://{self.domain}/api/v2/users/{auth0_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get user info from Auth0: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting user info from Auth0: {str(e)}")
            return None


# Global Auth0 client instance
auth0_client = Auth0Client() 