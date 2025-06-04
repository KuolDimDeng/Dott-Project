# custom_auth/auth0_authentication.py
import logging
import json
import jwt
from jwt import PyJWTError
from jwt.algorithms import RSAAlgorithm
import requests
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple, Any
import base64
import hashlib

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

# Add JWE support with fallback
try:
    from jwcrypto import jwe, jwk
    JWE_AVAILABLE = True
    logger = logging.getLogger(__name__)
    logger.info("✅ JWE support available for encrypted Auth0 tokens")
    logger.info("✅ jwcrypto library imported successfully")
except ImportError as e:
    JWE_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning(f"❌ JWE support not available - ImportError: {str(e)}")
    logger.warning("💡 To enable JWE decryption: pip install jwcrypto")
    logger.warning("📋 Current available packages:")
    try:
        import pkg_resources
        installed_packages = [d.project_name for d in pkg_resources.working_set]
        jwe_related = [p for p in installed_packages if 'jw' in p.lower() or 'crypto' in p.lower()]
        if jwe_related:
            logger.warning(f"   JWE/Crypto related packages: {jwe_related}")
        else:
            logger.warning("   No JWE/Crypto related packages found")
    except Exception:
        pass
except Exception as e:
    JWE_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.error(f"❌ JWE import error: {str(e)}")
    logger.error(f"❌ Error type: {type(e).__name__}")
    logger.error("💡 Will use Auth0 API fallback authentication")

User = get_user_model()

class Auth0JWTAuthentication(authentication.BaseAuthentication):
    """
    Auth0 JWT Authentication for Django REST Framework
    Validates Auth0 tokens (both JWT and JWE) and creates/updates local users
    """
    
    def __init__(self):
        self.domain = getattr(settings, 'AUTH0_DOMAIN', None)  # Actual tenant domain for JWKS
        self.custom_domain = getattr(settings, 'AUTH0_CUSTOM_DOMAIN', None)  # Custom domain if configured
        self.issuer_domain = getattr(settings, 'AUTH0_ISSUER_DOMAIN', self.domain)  # Domain for issuer validation
        self.audience = getattr(settings, 'AUTH0_AUDIENCE', None)
        self.client_id = getattr(settings, 'AUTH0_CLIENT_ID', None)
        self.client_secret = getattr(settings, 'AUTH0_CLIENT_SECRET', None)
        
        logger.info(f"🔧 Auth0JWTAuthentication initializing with config:")
        logger.info(f"   🔹 AUTH0_DOMAIN: {self.domain}")
        logger.info(f"   🔹 AUTH0_ISSUER_DOMAIN: {self.issuer_domain}")
        logger.info(f"   🔹 AUTH0_CUSTOM_DOMAIN: {self.custom_domain}")
        logger.info(f"   🔹 AUTH0_AUDIENCE: {self.audience}")
        logger.info(f"   🔹 AUTH0_CLIENT_ID: {self.client_id}")
        logger.info(f"   🔹 AUTH0_CLIENT_SECRET: {'✅ Set' if self.client_secret else '❌ Missing'}")
        logger.info(f"   🔹 JWE_AVAILABLE: {JWE_AVAILABLE}")
        
        # JWE capability assessment
        if JWE_AVAILABLE and self.client_secret:
            logger.info("🔐 JWE decryption fully enabled - will decrypt Auth0 encrypted tokens")
        elif JWE_AVAILABLE and not self.client_secret:
            logger.warning("⚠️ JWE library available but client secret missing - will use API fallback")
            logger.warning("💡 Set AUTH0_CLIENT_SECRET environment variable to enable JWE decryption")
        elif not JWE_AVAILABLE:
            logger.warning("⚠️ JWE library not available - will use Auth0 API fallback only")
        
        if not self.domain:
            logger.error("❌ AUTH0_DOMAIN not configured")
            raise exceptions.AuthenticationFailed('Auth0 domain not configured')
            
        # Always use the actual tenant domain for JWKS, even with custom domains
        self.jwks_url = f"https://{self.domain}/.well-known/jwks.json"
        self.jwks_client = PyJWKClient(self.jwks_url)
        
        logger.info(f"✅ Auth0 configured - JWKS: {self.domain}, Issuer: {self.issuer_domain}")
        logger.info(f"   🔗 JWKS URL: {self.jwks_url}")
    
    def get_cache_key_for_token(self, token):
        """
        Generate a cache key for token validation results.
        """
        token_hash = hashlib.md5(token.encode()).hexdigest()[:12]
        return f"auth0_userinfo_{token_hash}"
    
    def get_user_info_from_auth0_api(self, token):
        """
        Fallback: Get user info from Auth0 userinfo endpoint when JWE decryption fails.
        SECURITY NOTE: This validates the token server-side at Auth0.
        """
        # Check cache first to prevent rate limiting (with fallback if Redis unavailable)
        cache_key = self.get_cache_key_for_token(token)
        cached_result = None
        
        # Try to get from cache, but continue if Redis is unavailable
        try:
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.debug("🔄 Using cached Auth0 userinfo result")
                return cached_result
        except Exception as cache_error:
            logger.warning(f"⚠️ Cache unavailable (continuing without caching): {str(cache_error)}")
            
        try:
            logger.debug("🔄 Attempting fallback: Auth0 userinfo API")
            
            # First validate token format and basic structure
            if not token or len(token) < 50:
                logger.error("❌ Invalid token format for API fallback")
                return None
            
            response = requests.get(
                f"https://{self.domain}/userinfo",
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                },
                timeout=10,
                verify=True  # Ensure SSL verification
            )
            
            if response.status_code == 200:
                user_info = response.json()
                
                # Validate required fields are present
                required_fields = ['sub', 'email']
                if not all(field in user_info for field in required_fields):
                    logger.error("❌ Missing required fields in Auth0 response")
                    return None
                
                logger.info("✅ Successfully retrieved user info from Auth0 API")
                logger.debug(f"🔍 Auth0 API returned user: {user_info.get('email', 'unknown')}")
                
                # Try to cache the result for 5 minutes to prevent rate limiting (but continue if caching fails)
                try:
                    cache.set(cache_key, user_info, 300)
                    logger.debug("✅ Cached Auth0 userinfo result")
                except Exception as cache_error:
                    logger.warning(f"⚠️ Could not cache result (continuing anyway): {str(cache_error)}")
                
                return user_info
            elif response.status_code == 429:
                logger.warning("⚠️ Auth0 API rate limit hit, trying cached result if available")
                # Try to return any cached result, even if expired (but handle cache failures)
                try:
                    cached_result = cache.get(cache_key + "_backup")
                    if cached_result:
                        logger.info("✅ Using backup cached result due to rate limiting")
                        return cached_result
                except Exception as cache_error:
                    logger.warning(f"⚠️ Could not access backup cache: {str(cache_error)}")
                
                logger.error("❌ No cached result available during rate limiting")
                return None
            else:
                logger.error(f"❌ Auth0 userinfo API failed: {response.status_code} - {response.text}")
                return None
                
        except requests.Timeout:
            logger.error("❌ Auth0 userinfo API timeout")
            return None
        except requests.RequestException as e:
            logger.error(f"❌ Auth0 userinfo API network error: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"❌ Auth0 userinfo API error: {str(e)}")
            return None
    
    def authenticate(self, request):
        """
        Authenticate the request and return a two-tuple of (user, token).
        """
        logger.debug(f"🔍 Auth0 authentication attempt for: {request.path}")
        
        token = self.get_token_from_request(request)
        if not token:
            logger.debug("❌ No token found in request")
            return None
            
        logger.debug(f"🎫 Token received (length: {len(token)})")
        logger.debug(f"🎫 Token preview: {token[:50]}...")
        
        try:
            # Decode and validate the JWT/JWE token
            user_info = self.validate_token(token)
            logger.info(f"✅ Token validation successful for user: {user_info.get('sub', 'unknown')}")
            
            # Get or create user based on Auth0 info
            user = self.get_or_create_user(user_info)
            logger.info(f"✅ User authentication successful: {user.email}")
            
            return (user, token)
            
        except Exception as e:
            logger.error(f"❌ Auth0 authentication failed for {request.path}: {str(e)}")
            logger.error(f"❌ Error type: {type(e).__name__}")
            raise exceptions.AuthenticationFailed(f"Invalid token: {str(e)}")
    
    def get_token_from_request(self, request):
        """
        Extract JWT token from Authorization header.
        """
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        logger.debug(f"🔍 Authorization header present: {bool(auth_header)}")
        
        if not auth_header:
            logger.debug("❌ No Authorization header found")
            return None
            
        try:
            auth_type, token = auth_header.split(' ', 1)
            logger.debug(f"🔍 Auth type: {auth_type}")
            logger.debug(f"🔍 Token length: {len(token) if token else 0}")
            
            if auth_type.lower() != 'bearer':
                logger.debug(f"❌ Invalid auth type: {auth_type} (expected: Bearer)")
                return None
            return token
        except ValueError as e:
            logger.error(f"❌ Error parsing Authorization header: {e}")
            return None
    
    def is_jwe_token(self, token):
        """
        Check if the token is a JWE (encrypted) token by examining its structure.
        """
        try:
            # JWE tokens have 5 parts separated by dots (header.encrypted_key.iv.ciphertext.tag)
            # JWT tokens have 3 parts (header.payload.signature)
            parts = token.split('.')
            if len(parts) == 5:
                # Check if the header indicates JWE
                header = jwt.get_unverified_header(token)
                return 'enc' in header and 'alg' in header
            return False
        except Exception:
            return False
    
    def decrypt_jwe_token(self, jwe_token):
        """
        Decrypt a JWE token using the client secret.
        For Auth0 JWE with alg='dir', the client secret is used directly as the encryption key.
        """
        if not JWE_AVAILABLE:
            logger.warning("⚠️ JWE library not available, attempting Auth0 API fallback")
            return None
        
        if not self.client_secret:
            logger.warning("⚠️ Auth0 client secret required for JWE decryption, attempting fallback")
            logger.warning("⚠️ Set AUTH0_CLIENT_SECRET environment variable to enable JWE decryption")
            return None
        
        try:
            logger.debug("🔓 Attempting JWE token decryption...")
            logger.debug(f"🔍 Client secret available: {bool(self.client_secret)}")
            logger.debug(f"🔍 Client secret length: {len(self.client_secret) if self.client_secret else 0}")
            
            # For Auth0 JWE with alg='dir', use the client secret directly
            # The client secret should be base64url encoded for the JWK
            try:
                # Auth0 uses the client secret directly as bytes for AES-GCM
                secret_bytes = self.client_secret.encode('utf-8')
                
                # Create JWK for direct encryption (kty='oct' for symmetric key)
                key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(secret_bytes).decode().rstrip('='))
                logger.debug("✅ JWK created successfully")
                
            except Exception as key_error:
                logger.error(f"❌ Failed to create JWK from client secret: {str(key_error)}")
                return None
            
            try:
                # Create JWE object and deserialize the token
                jwe_token_obj = jwe.JWE()
                jwe_token_obj.deserialize(jwe_token)
                logger.debug("✅ JWE token deserialized successfully")
                
                # Decrypt using the key
                decrypted_payload = jwe_token_obj.decrypt(key)
                logger.debug("✅ JWE token decrypted successfully")
                
                if decrypted_payload is None:
                    logger.error("❌ JWE decryption returned None")
                    return None
                
                # Handle both bytes and string returns
                if isinstance(decrypted_payload, bytes):
                    decrypted_str = decrypted_payload.decode('utf-8')
                    logger.debug(f"✅ Decrypted payload (from bytes): {decrypted_str[:100]}...")
                    return decrypted_str
                elif isinstance(decrypted_payload, str):
                    logger.debug(f"✅ Decrypted payload (string): {decrypted_payload[:100]}...")
                    return decrypted_payload
                else:
                    logger.error(f"❌ Unexpected decryption result type: {type(decrypted_payload)}")
                    return None
                    
            except Exception as decrypt_error:
                logger.error(f"❌ JWE decryption failed: {str(decrypt_error)}")
                logger.error(f"❌ Decryption error type: {type(decrypt_error).__name__}")
                # Log more details about the token structure for debugging
                try:
                    header = jwt.get_unverified_header(jwe_token)
                    logger.debug(f"🔍 JWE Header for debugging: {header}")
                except Exception:
                    pass
                return None
            
        except Exception as e:
            logger.error(f"❌ JWE decryption failed: {str(e)}")
            logger.error(f"❌ Exception type: {type(e).__name__}")
            return None
    
    def validate_token(self, token):
        """
        Validate JWT/JWE token against Auth0's public keys.
        """
        logger.debug("🔍 Starting JWT/JWE token validation...")
        
        try:
            # First, let's decode the header without verification to see what we're working with
            unverified_header = jwt.get_unverified_header(token)
            logger.debug(f"🔍 Token Header: {unverified_header}")
            
            # Check if this is a JWE token
            if self.is_jwe_token(token):
                logger.debug("🔍 Detected JWE (encrypted) token")
                
                # Try to decrypt the JWE token
                decrypted_jwt = self.decrypt_jwe_token(token)
                
                if decrypted_jwt:
                    logger.debug("✅ JWE token decrypted, now validating inner JWT")
                    return self.validate_jwt(decrypted_jwt)
                else:
                    logger.warning("⚠️ JWE decryption failed, trying Auth0 API fallback")
                    user_info = self.get_user_info_from_auth0_api(token)
                    if user_info:
                        return user_info
                    else:
                        raise exceptions.AuthenticationFailed('JWE decryption and API fallback both failed')
            else:
                logger.debug("🔍 Detected standard JWT token")
                return self.validate_jwt(token)
                
        except Exception as e:
            logger.error(f"❌ Token validation error: {str(e)}")
            logger.error(f"❌ Error type: {type(e).__name__}")
            raise exceptions.AuthenticationFailed(f'Token validation error: {str(e)}')
    
    def validate_jwt(self, token):
        """
        Validate a standard JWT token.
        """
        try:
            # Try to decode payload without verification for debugging
            try:
                unverified_payload = jwt.decode(token, options={"verify_signature": False})
                logger.debug(f"🔍 JWT Payload (unverified): {json.dumps(unverified_payload, indent=2)}")
                logger.debug(f"🔍 Token issuer: {unverified_payload.get('iss', 'NOT_SET')}")
                logger.debug(f"🔍 Token audience: {unverified_payload.get('aud', 'NOT_SET')}")
                logger.debug(f"🔍 Token subject: {unverified_payload.get('sub', 'NOT_SET')}")
            except Exception as decode_error:
                logger.error(f"❌ Error decoding unverified payload: {decode_error}")
                
            # Get the signing key from Auth0 (always use actual tenant domain)
            logger.debug(f"🔍 Fetching signing key from: {self.jwks_url}")
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)
            logger.debug(f"✅ Successfully retrieved signing key")
            
            # Build expected issuer
            expected_issuer = f"https://{self.issuer_domain}/"
            logger.debug(f"🔍 Expected issuer: {expected_issuer}")
            logger.debug(f"🔍 Expected audience: {self.audience}")
            
            # Decode and validate the token (use issuer domain for validation)
            logger.debug("🔍 Performing full JWT validation...")
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=self.audience,
                issuer=expected_issuer
            )
            
            logger.info(f"✅ JWT validation successful!")
            logger.debug(f"✅ Validated payload: {json.dumps(payload, indent=2)}")
            return payload
            
        except jwt.ExpiredSignatureError as e:
            logger.error(f"❌ Token expired: {e}")
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError as e:
            logger.error(f"❌ Invalid token error: {e}")
            logger.error(f"❌ Error details: {str(e)}")
            raise exceptions.AuthenticationFailed(f'Invalid token: {str(e)}')
        except Exception as e:
            logger.error(f"❌ Unexpected token validation error: {e}")
            logger.error(f"❌ Error type: {type(e).__name__}")
            raise exceptions.AuthenticationFailed(f'Token validation error: {str(e)}')
    
    def get_or_create_user(self, user_info):
        """
        Get or create a Django user based on Auth0 user information.
        """
        auth0_id = user_info.get('sub')
        email = user_info.get('email')
        
        logger.debug(f"🔍 Getting/creating user for Auth0 ID: {auth0_id}, Email: {email}")
        
        if not auth0_id:
            logger.error("❌ No user ID (sub) in token")
            raise exceptions.AuthenticationFailed('No user ID in token')
            
        if not email:
            logger.error("❌ No email in token")
            raise exceptions.AuthenticationFailed('No email in token')
        
        try:
            # Try to find user by Auth0 ID first
            user = User.objects.get(auth0_sub=auth0_id)
            logger.debug(f"✅ Found existing user by Auth0 ID: {user.email}")
            
            # Update email if it changed
            current_email = getattr(user, 'email', None)
            if current_email != email:
                logger.info(f"📧 Updating user email from {current_email} to {email}")
                setattr(user, 'email', email)
                user.save(update_fields=['email'])
                
            return user
            
        except User.DoesNotExist:
            logger.debug(f"🔍 User not found by Auth0 ID, trying email: {email}")
            # Try to find by email (for migration from Cognito)
            try:
                user = User.objects.get(email=email)
                logger.info(f"✅ Found user by email, linking to Auth0 ID: {auth0_id}")
                # Link this user to Auth0
                setattr(user, 'auth0_sub', auth0_id)
                user.save(update_fields=['auth0_sub'])
                return user
                
            except User.DoesNotExist:
                logger.info(f"👤 Creating new user for: {email}")
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
                logger.info(f"✅ Created new user from Auth0: {email} ({auth0_id})")
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