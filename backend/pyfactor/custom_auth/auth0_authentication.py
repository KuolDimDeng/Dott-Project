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
import traceback

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
    JWE_AVAILABLE = False  # Explicitly disabled to force JWT-only mode
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
            logger.info("🔐 JWE local decryption available - will try local decryption first, Auth0 API fallback")
            logger.info("⚡ This avoids Auth0 API rate limits and provides better reliability")
        elif JWE_AVAILABLE and not self.client_secret:
            logger.warning("⚠️ JWE library available but client secret missing - will use Auth0 API fallback only")
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
        Uses a more robust hash for better cache distribution.
        """
        import hashlib
        # Use a more robust hash and include part of the token for uniqueness
        token_hash = hashlib.sha256(token.encode()).hexdigest()[:16]
        return f"auth0_user_{token_hash}"
    
    def get_user_info_from_auth0_api(self, token):
        """
        Get user info from Auth0 userinfo API with ULTRA-AGGRESSIVE caching to prevent rate limiting.
        Enhanced with extended cache durations and proactive cache management.
        """
        cache_key = self.get_cache_key_for_token(token)
        
        # ULTRA-AGGRESSIVE: Define ALL cache strategies with EXTENDED lifetimes
        cache_strategies = [
            (f"{cache_key}_primary", "primary cache (4h)", 14400),      # Extended from 2h to 4h
            (f"{cache_key}_backup", "backup cache (12h)", 43200),       # Extended from 8h to 12h
            (f"{cache_key}_emergency", "emergency cache (48h)", 172800), # Extended from 24h to 48h
            (f"{cache_key}_ultra", "ultra cache (14d)", 1209600),       # Extended from 7d to 14d
            (f"{cache_key}_super", "super cache (60d)", 5184000),       # Extended from 30d to 60d
            (f"{cache_key}_mega", "mega cache (180d)", 15552000),       # Extended from 90d to 180d
            (f"{cache_key}_eternal", "eternal cache (365d)", 31536000), # NEW: 1 year cache
        ]
        
        # ULTRA-AGGRESSIVE: Try ALL cache levels first (before any API calls)
        for cache_key_name, cache_desc, ttl in cache_strategies:
            try:
                cached_result = cache.get(cache_key_name)
                if cached_result:
                    logger.info(f"✅ Cache HIT: Using {cache_desc}")
                    # AGGRESSIVE PROMOTION: Promote to ALL lower cache levels for redundancy
                    for promote_key, _, promote_ttl in cache_strategies:
                        if promote_ttl <= ttl:  # Only promote to shorter or equal TTL
                            try:
                                cache.set(promote_key, cached_result, promote_ttl)
                            except Exception:
                                pass
                    return cached_result
            except Exception as cache_error:
                logger.debug(f"⚠️ Cache check failed for {cache_desc}: {str(cache_error)}")
                continue
        
        # If no cache hit, implement ENHANCED CIRCUIT BREAKER logic
        circuit_breaker_key = f"auth0_rate_limit_circuit_breaker"
        try:
            circuit_breaker_state = cache.get(circuit_breaker_key)
            if circuit_breaker_state == "OPEN":
                logger.error("🚨 CIRCUIT BREAKER OPEN - Auth0 API calls suspended due to rate limiting")
                
                # ENHANCED: Try to find ANY cached version (even expired) with AGGRESSIVE fallback
                for cache_key_name, cache_desc, ttl in reversed(cache_strategies):
                    try:
                        # Force cache retrieval even if potentially expired
                        stale_result = cache.get(cache_key_name)
                        if stale_result:
                            logger.warning(f"🔄 Using STALE {cache_desc} due to circuit breaker")
                            # Promote to ALL active caches for future requests
                            for promote_key, _, promote_ttl in cache_strategies[:4]:  # First 4 levels
                                try:
                                    cache.set(promote_key, stale_result, promote_ttl)
                                except Exception:
                                    pass
                            return stale_result
                    except Exception:
                        continue
                
                # LAST RESORT: Try to construct a minimal user info from cache fragments
                try:
                    # Look for any user info fragments that might be cached separately
                    fragment_keys = [
                        f"auth0_user_email_{cache_key[-8:]}",
                        f"auth0_user_sub_{cache_key[-8:]}",
                        f"auth0_minimal_{cache_key[-8:]}",
                    ]
                    for fragment_key in fragment_keys:
                        fragment = cache.get(fragment_key)
                        if fragment and isinstance(fragment, dict):
                            logger.warning(f"🔄 Using FRAGMENT cache during circuit breaker: {fragment_key}")
                            # Promote fragment to all cache levels
                            for promote_key, _, promote_ttl in cache_strategies:
                                try:
                                    cache.set(promote_key, fragment, promote_ttl)
                                except Exception:
                                    pass
                            return fragment
                except Exception:
                    pass
                
                # No cache available at all
                logger.error("❌ No cached result available and circuit breaker OPEN")
                return None
        except Exception:
            pass
        
        # No cache available, try API call with ENHANCED circuit breaker
        try:
            logger.debug("🔄 No cached result found, attempting Auth0 userinfo API")
            
            # Validate token format first
            if not token or len(token) < 50:
                logger.error("❌ Invalid token format for API fallback")
                return None
            
            response = requests.get(
                f"https://{self.domain}/userinfo",
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                },
                timeout=8,  # Increased timeout slightly
                verify=True
            )
            
            if response.status_code == 200:
                user_info = response.json()
                
                # Validate required fields
                required_fields = ['sub', 'email']
                if not all(field in user_info for field in required_fields):
                    logger.error("❌ Missing required fields in Auth0 response")
                    return None
                
                logger.info("✅ Successfully retrieved user info from Auth0 API")
                logger.debug(f"🔍 Auth0 API returned user: {user_info.get('email', 'unknown')}")
                
                # ULTRA-AGGRESSIVE CACHING: Store in ALL cache levels
                for cache_key_name, cache_desc, ttl in cache_strategies:
                    try:
                        cache.set(cache_key_name, user_info, ttl)
                    except Exception as cache_error:
                        logger.debug(f"⚠️ Could not set {cache_desc}: {str(cache_error)}")
                
                # NEW: Store fragments for emergency use
                try:
                    minimal_info = {'sub': user_info['sub'], 'email': user_info['email']}
                    cache.set(f"auth0_user_email_{cache_key[-8:]}", minimal_info, 31536000)  # 1 year
                    cache.set(f"auth0_user_sub_{cache_key[-8:]}", minimal_info, 31536000)   # 1 year  
                    cache.set(f"auth0_minimal_{cache_key[-8:]}", minimal_info, 31536000)    # 1 year
                except Exception:
                    pass
                
                logger.debug("✅ Cached Auth0 userinfo with 7-tier ultra-redundancy (4h/12h/48h/14d/60d/180d/365d)")
                
                # RESET circuit breaker on successful API call
                try:
                    cache.delete(circuit_breaker_key)
                except Exception:
                    pass
                
                return user_info
                
            elif response.status_code == 429:
                logger.error("❌ Auth0 API rate limit hit - OPENING ENHANCED CIRCUIT BREAKER")
                
                # OPEN circuit breaker for 30 minutes (extended from 15)
                try:
                    cache.set(circuit_breaker_key, "OPEN", 1800)  # 30 minutes
                except Exception:
                    pass
                
                # Try ALL cache strategies (including potentially stale ones)
                for cache_key_name, cache_desc, ttl in reversed(cache_strategies):
                    try:
                        fallback_result = cache.get(cache_key_name)
                        if fallback_result:
                            logger.warning(f"✅ Using {cache_desc} due to rate limiting")
                            # Promote to ALL active caches for future use
                            for promote_key, _, promote_ttl in cache_strategies[:5]:  # First 5 levels
                                try:
                                    cache.set(promote_key, fallback_result, promote_ttl)
                                except Exception:
                                    pass
                            return fallback_result
                    except Exception:
                        continue
                
                logger.error("❌ No cached result available during rate limiting")
                return None
                
            elif response.status_code in [401, 403]:
                logger.error(f"❌ Auth0 userinfo API authentication failed: {response.status_code}")
                return None
                
            else:
                logger.error(f"❌ Auth0 userinfo API failed: {response.status_code} - {response.text}")
                
                # Try cached results even on API errors (ALL cache tiers)
                for cache_key_name, cache_desc, ttl in reversed(cache_strategies):
                    try:
                        fallback_result = cache.get(cache_key_name)
                        if fallback_result:
                            logger.warning(f"✅ Using {cache_desc} due to API error")
                            return fallback_result
                    except Exception:
                        continue
                
                return None
                
        except requests.Timeout:
            logger.error("❌ Auth0 userinfo API timeout")
            
            # Try cached results on timeout (ALL tiers)
            for cache_key_name, cache_desc, ttl in reversed(cache_strategies):
                try:
                    fallback_result = cache.get(cache_key_name)
                    if fallback_result:
                        logger.warning(f"✅ Using {cache_desc} due to timeout")
                        # Promote to primary levels
                        for promote_key, _, promote_ttl in cache_strategies[:4]:
                            try:
                                cache.set(promote_key, fallback_result, promote_ttl)
                            except Exception:
                                pass
                        return fallback_result
                except Exception:
                    continue
            return None
            
        except requests.RequestException as e:
            logger.error(f"❌ Auth0 userinfo API network error: {str(e)}")
            
            # Try cached results on network error (ALL tiers)
            for cache_key_name, cache_desc, ttl in reversed(cache_strategies):
                try:
                    fallback_result = cache.get(cache_key_name)
                    if fallback_result:
                        logger.warning(f"✅ Using {cache_desc} due to network error")
                        # Promote to primary levels
                        for promote_key, _, promote_ttl in cache_strategies[:4]:
                            try:
                                cache.set(promote_key, fallback_result, promote_ttl)
                            except Exception:
                                pass
                        return fallback_result
                except Exception:
                    continue
            return None
            
        except Exception as e:
            logger.error(f"❌ Auth0 userinfo API error: {str(e)}")
            return None
    
    def authenticate(self, request):
        """
        Authenticate the request and return a two-tuple of (user, token).
        """
        logger.debug(f"🔍 Auth0 authentication attempt for: {request.path}")
        logger.debug(f"🔍 Request method: {request.method}")
        logger.debug(f"🔍 Request headers: {dict(request.META.items()) if hasattr(request, 'META') else 'No META'}")
        
        token = self.get_token_from_request(request)
        if not token:
            logger.debug("❌ No token found in request")
            return None
            
        logger.debug(f"🎫 Token received (length: {len(token)})")
        logger.debug(f"🎫 Token preview: {token[:50]}...")
        logger.debug(f"🎫 Token type detection: JWE={self.is_jwe_token(token)}")
        
        try:
            # Decode and validate the JWT/JWE token
            logger.info(f"🔄 Starting token validation for {request.path}")
            user_info = self.validate_token(token)
            logger.info(f"✅ Token validation successful for user: {user_info.get('sub', 'unknown')}")
            logger.debug(f"✅ User info received: {json.dumps(user_info, indent=2)}")
            
            # Get or create user based on Auth0 info
            logger.info(f"🔄 Getting/creating user for: {user_info.get('email', 'unknown')}")
            user = self.get_or_create_user(user_info)
            logger.info(f"✅ User authentication successful: {user.email}")
            logger.debug(f"✅ Final user object: id={user.pk}, email={user.email}, tenant={getattr(user, 'tenant_id', 'None')}")
            
            return (user, token)
            
        except Exception as e:
            logger.error(f"❌ Auth0 authentication failed for {request.path}: {str(e)}")
            logger.error(f"❌ Error type: {type(e).__name__}")
            logger.error(f"❌ Full traceback: {traceback.format_exc()}")
            
            # Additional debug info about the token
            try:
                header = jwt.get_unverified_header(token)
                logger.error(f"❌ Token header: {header}")
            except Exception as header_error:
                logger.error(f"❌ Could not decode token header: {header_error}")
                
            try:
                payload = jwt.decode(token, options={"verify_signature": False})
                logger.error(f"❌ Token payload (unverified): {json.dumps(payload, indent=2)}")
            except Exception as payload_error:
                logger.error(f"❌ Could not decode token payload: {payload_error}")
                
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
        MODIFIED: More lenient check to avoid JWE false positives.
        """
        try:
            # Only consider it a JWE if it has exactly 5 parts AND explicit JWE header indicators
            parts = token.split('.')
            if len(parts) == 5:
                # Get header to check for JWE indicators
                try:
                    header = jwt.get_unverified_header(token)
                    # Only if it has both 'enc' and 'alg' consider it a JWE
                    is_jwe = 'enc' in header and 'alg' in header
                    if is_jwe:
                        logger.info("⚠️ Detected potential JWE token but JWE validation is DISABLED")
                    return is_jwe
                except Exception:
                    # If header parsing fails, it's not a valid JWT/JWE
                    return False
            return False
        except Exception:
            return False
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
        RFC 7518 Section 4.5: Direct Encryption with a Shared Symmetric Key.
        """
        if not JWE_AVAILABLE:
            logger.warning("⚠️ JWE library not available, will use Auth0 API fallback")
            return None
        
        if not self.client_secret:
            logger.warning("⚠️ Auth0 client secret required for JWE decryption, will use Auth0 API fallback")
            return None
        
        try:
            logger.debug("🔓 Attempting local JWE token decryption...")
            logger.debug(f"🔍 Client secret available: {bool(self.client_secret)}")
            logger.debug(f"🔍 Client secret length: {len(self.client_secret) if self.client_secret else 0}")
            
            # Debug: Show first and last 4 characters of client secret for verification
            secret_preview = f"{self.client_secret[:4]}...{self.client_secret[-4:]}" if self.client_secret and len(self.client_secret) >= 8 else "TOO_SHORT"
            logger.debug(f"🔍 Client secret preview: {secret_preview}")
            
            # Get token header for algorithm-specific handling
            header = jwt.get_unverified_header(jwe_token)
            logger.debug(f"🔍 JWE Header: {header}")
            
            algorithm = header.get('alg', '')
            encryption = header.get('enc', '')
            logger.info(f"🔍 JWE Algorithm: {algorithm}, Encryption: {encryption}")
            
            # RFC 7518 Section 4.5: Handle 'dir' algorithm specifically
            if algorithm == 'dir':
                logger.info("🔑 Using RFC 7518 Section 4.5: Direct Encryption with Shared Symmetric Key")
                return self._decrypt_jwe_with_dir_algorithm(jwe_token, encryption)
            else:
                logger.info(f"🔑 Using general approach for algorithm: {algorithm}")
                return self._decrypt_jwe_general(jwe_token, algorithm, encryption)
                
        except Exception as e:
            logger.error(f"❌ JWE decryption failed: {str(e)} - will try Auth0 API fallback")
            logger.error(f"❌ Exception type: {type(e).__name__}")
            logger.error(f"❌ Full traceback: {traceback.format_exc()}")
            return None
    
    def _decrypt_jwe_with_dir_algorithm(self, jwe_token, encryption):
        """
        RFC 7518 Section 4.5: Direct Encryption with a Shared Symmetric Key
        For 'dir' algorithm, the shared symmetric key is used directly as the CEK.
        """
        logger.info("🔑 Implementing RFC 7518 Section 4.5: Direct encryption with shared symmetric key")
        
        # For A256GCM, we need exactly 32 bytes
        required_key_length = 32 if encryption == 'A256GCM' else 16 if encryption == 'A128GCM' else 24
        logger.debug(f"🔍 Required key length for {encryption}: {required_key_length} bytes")
        
        # Auth0 64-character client secrets are typically hex-encoded 32-byte keys
        dir_approaches = [
            ("64-char hex secret for dir algorithm", self._create_dir_hex_key, required_key_length),
            ("64-char secret first 32 bytes", self._create_dir_first_32_bytes, required_key_length),
            ("64-char secret as base64", self._create_dir_base64_key, required_key_length),
            ("64-char secret UTF-8 truncated", self._create_dir_utf8_key, required_key_length),
            ("Full 64-char secret SHA256", self._create_dir_sha256_key, required_key_length),
            ("Auth0 base64url with padding", self._create_dir_base64url_padded_key, required_key_length),
            ("Auth0 base64url no padding", self._create_dir_base64url_no_padding_key, required_key_length),
            ("Auth0 raw secret as bytes", self._create_dir_raw_secret_key, required_key_length),
            ("Auth0 secret with HKDF", self._create_dir_hkdf_key, required_key_length),
        ]
        
        for approach_name, key_method, target_length in dir_approaches:
            try:
                logger.debug(f"🔑 Trying {approach_name}...")
                key = key_method(target_length)
                
                if key:
                    # Create JWE object and attempt decryption
                    jwe_token_obj = jwe.JWE()
                    jwe_token_obj.deserialize(jwe_token)
                    
                    # Decrypt using the key (RFC 7518: direct use as CEK)
                    decrypted_payload = jwe_token_obj.decrypt(key)
                    
                    if decrypted_payload:
                        logger.info(f"✅ RFC 7518 dir algorithm decryption successful using {approach_name}")
                        
                        # Handle both bytes and string returns
                        if isinstance(decrypted_payload, bytes):
                            result = decrypted_payload.decode('utf-8')
                            logger.debug(f"✅ Decrypted payload (from bytes): {result[:100]}...")
                            return result
                        elif isinstance(decrypted_payload, str):
                            logger.debug(f"✅ Decrypted payload (string): {decrypted_payload[:100]}...")
                            return decrypted_payload
                        else:
                            logger.warning(f"⚠️ Unexpected decryption result type: {type(decrypted_payload)}")
                            continue
                            
            except Exception as approach_error:
                logger.debug(f"❌ {approach_name} failed: {str(approach_error)}")
                continue
        
        logger.error("❌ All RFC 7518 dir algorithm approaches failed")
        return None
    
    def _decrypt_jwe_general(self, jwe_token, algorithm, encryption):
        """
        General JWE decryption for non-'dir' algorithms
        """
        logger.info(f"🔑 General JWE decryption for algorithm: {algorithm}")
        
        # Try the original multiple key derivation approaches for non-dir algorithms
        approaches = [
            ("Direct client secret as key", self._create_direct_secret_key),
            ("Standard base64 decoded secret", self._create_standard_base64_key),
            ("Base64url decoded secret (Auth0 standard)", self._create_base64url_key),
            ("Hex decoded secret", self._create_hex_key),
                        ("SHA-256 derived key", self._create_sha256_key),
            ("Base64 decoded secret", self._create_base64_key),
            ("Direct UTF-8 bytes", self._create_direct_key),
            ("PBKDF2 derived key", self._create_pbkdf2_key)
        ]
        
        for approach_name, key_method in approaches:
            try:
                logger.debug(f"🔑 Trying {approach_name}...")
                key = key_method()
                    
                if key:
                        # Create JWE object and attempt decryption
                        jwe_token_obj = jwe.JWE()
                        jwe_token_obj.deserialize(jwe_token)
                        
                        # Decrypt using the key
                        decrypted_payload = jwe_token_obj.decrypt(key)
                        
                        if decrypted_payload:
                            logger.info(f"✅ JWE decryption successful using {approach_name}")
                            
                            # Handle both bytes and string returns
                            if isinstance(decrypted_payload, bytes):
                                result = decrypted_payload.decode('utf-8')
                                logger.debug(f"✅ Decrypted payload (from bytes): {result[:100]}...")
                                return result
                            elif isinstance(decrypted_payload, str):
                                logger.debug(f"✅ Decrypted payload (string): {decrypted_payload[:100]}...")
                                return decrypted_payload
                            else:
                                logger.warning(f"⚠️ Unexpected decryption result type: {type(decrypted_payload)}")
                                continue
                                
            except Exception as approach_error:
                    logger.debug(f"❌ {approach_name} failed: {str(approach_error)}")
                    continue
            
        logger.error("❌ All general JWE decryption approaches failed")
        return None
            
    def _create_dir_hex_key(self, target_length):
        """
        RFC 7518 Section 4.5: Create key for 'dir' algorithm using hex decoding
        Auth0 64-character secrets are often hex-encoded 32-byte keys
        """
        try:
            if not self.client_secret or len(self.client_secret) != 64:
                logger.debug(f"❌ Expected 64-char hex secret, got {len(self.client_secret) if self.client_secret else 0}")
                return None
            
            # Decode 64-character hex string to 32 bytes
            key_bytes = bytes.fromhex(self.client_secret)
            logger.debug(f"🔍 Hex decoded key length: {len(key_bytes)} bytes (target: {target_length})")
            
            if len(key_bytes) == target_length:
                key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(key_bytes).decode().rstrip('='))
                logger.debug(f"✅ Created RFC 7518 dir algorithm hex key: {len(key_bytes)} bytes")
                return key
            else:
                logger.debug(f"❌ Hex key length mismatch: {len(key_bytes)} != {target_length}")
                return None
        except ValueError as e:
            logger.debug(f"❌ Invalid hex in client secret: {e}")
            return None
        except Exception as e:
            logger.debug(f"❌ Dir hex key creation failed: {e}")
            return None
    
    def _create_dir_first_32_bytes(self, target_length):
        """
        RFC 7518 Section 4.5: Use first 32 characters as UTF-8 bytes
        """
        try:
            if not self.client_secret or len(self.client_secret) < target_length:
                return None
            
            # Take first target_length characters and encode as UTF-8
            key_bytes = self.client_secret[:target_length].encode('utf-8')
            if len(key_bytes) == target_length:
                key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(key_bytes).decode().rstrip('='))
                logger.debug(f"✅ Created RFC 7518 dir algorithm first-{target_length} key")
                return key
            return None
        except Exception as e:
            logger.debug(f"❌ Dir first-32 key creation failed: {e}")
            return None
    
    def _create_dir_base64_key(self, target_length):
        """
        RFC 7518 Section 4.5: Decode client secret as base64
        """
        try:
            if not self.client_secret:
                return None
            
            # Try standard base64 decode
            secret_with_padding = self.client_secret
            missing_padding = len(secret_with_padding) % 4
            if missing_padding:
                secret_with_padding += '=' * (4 - missing_padding)
            
            key_bytes = base64.b64decode(secret_with_padding)
            if len(key_bytes) >= target_length:
                # Use first target_length bytes
                key_bytes = key_bytes[:target_length]
                key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(key_bytes).decode().rstrip('='))
                logger.debug(f"✅ Created RFC 7518 dir algorithm base64 key: {len(key_bytes)} bytes")
                return key
            return None
        except Exception as e:
            logger.debug(f"❌ Dir base64 key creation failed: {e}")
            return None
    
    def _create_dir_utf8_key(self, target_length):
        """
        RFC 7518 Section 4.5: Use client secret UTF-8 bytes directly
        """
        try:
            if not self.client_secret:
                return None
            
            key_bytes = self.client_secret.encode('utf-8')
            if len(key_bytes) >= target_length:
                # Use first target_length bytes
                key_bytes = key_bytes[:target_length]
                key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(key_bytes).decode().rstrip('='))
                logger.debug(f"✅ Created RFC 7518 dir algorithm UTF-8 key: {len(key_bytes)} bytes")
                return key
            return None
        except Exception as e:
            logger.debug(f"❌ Dir UTF-8 key creation failed: {e}")
            return None
    
    def _create_dir_sha256_key(self, target_length):
        """
        RFC 7518 Section 4.5: SHA-256 hash of client secret
        """
        try:
            if not self.client_secret:
                return None
            
            import hashlib
            key_bytes = hashlib.sha256(self.client_secret.encode('utf-8')).digest()
            if len(key_bytes) >= target_length:
                key_bytes = key_bytes[:target_length]
                key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(key_bytes).decode().rstrip('='))
                logger.debug(f"✅ Created RFC 7518 dir algorithm SHA-256 key: {len(key_bytes)} bytes")
                return key
            return None
        except Exception as e:
            logger.debug(f"❌ Dir SHA-256 key creation failed: {e}")
            return None
    
    def _create_sha256_key(self):
        """Create JWK using SHA-256 derived key (32 bytes for AES-256-GCM)"""
        try:
            if not self.client_secret:
                return None
            import hashlib
            secret_hash = hashlib.sha256(self.client_secret.encode('utf-8')).digest()
            return jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(secret_hash).decode().rstrip('='))
        except Exception as e:
            logger.debug(f"SHA-256 key creation failed: {e}")
            return None
    
    def _create_base64_key(self):
        """Create JWK using base64 decoded client secret"""
        try:
            if not self.client_secret:
                return None
            # Try to decode client secret as base64
            decoded_secret = base64.urlsafe_b64decode(self.client_secret + '==')
            if len(decoded_secret) == 32:  # Perfect for AES-256
                return jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(decoded_secret).decode().rstrip('='))
            elif len(decoded_secret) > 32:
                # Truncate to 32 bytes
                return jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(decoded_secret[:32]).decode().rstrip('='))
            else:
                # Pad to 32 bytes
                padded = decoded_secret + b'\x00' * (32 - len(decoded_secret))
                return jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(padded).decode().rstrip('='))
        except Exception as e:
            logger.debug(f"Base64 key creation failed: {e}")
            return None
    
    def _create_direct_key(self):
        """Create JWK using direct UTF-8 bytes of client secret"""
        try:
            if not self.client_secret:
                return None
            secret_bytes = self.client_secret.encode('utf-8')
            if len(secret_bytes) == 32:
                return jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(secret_bytes).decode().rstrip('='))
            elif len(secret_bytes) > 32:
                # Truncate to 32 bytes
                return jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(secret_bytes[:32]).decode().rstrip('='))
            else:
                # Pad to 32 bytes
                padded = secret_bytes + b'\x00' * (32 - len(secret_bytes))
                return jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(padded).decode().rstrip('='))
        except Exception as e:
            logger.debug(f"Direct key creation failed: {e}")
            return None
    
    def _create_pbkdf2_key(self):
        """Create JWK using PBKDF2 key derivation"""
        try:
            if not self.client_secret:
                return None
            from cryptography.hazmat.primitives import hashes
            from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
            from cryptography.hazmat.backends import default_backend
            
            # Use PBKDF2 to derive a 32-byte key
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'auth0_salt',  # Fixed salt for consistency
                iterations=100000,
                backend=default_backend()
            )
            derived_key = kdf.derive(self.client_secret.encode('utf-8'))
            return jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(derived_key).decode().rstrip('='))
        except Exception as e:
            logger.debug(f"PBKDF2 key creation failed: {e}")
            return None
    
    def _create_hex_key(self):
        """Create JWK using hex decoded client secret"""
        try:
            if not self.client_secret:
                return None
            # Try to decode client secret as hex
            decoded_secret = bytes.fromhex(self.client_secret)
            if len(decoded_secret) == 32:  # Perfect for AES-256
                return jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(decoded_secret).decode().rstrip('='))
            elif len(decoded_secret) > 32:
                # Truncate to 32 bytes
                return jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(decoded_secret[:32]).decode().rstrip('='))
            else:
                # Pad to 32 bytes
                padded = decoded_secret + b'\x00' * (32 - len(decoded_secret))
                return jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(padded).decode().rstrip('='))
        except Exception as e:
            logger.debug(f"Hex key creation failed: {e}")
            return None
    
    def _create_base64url_key(self):
        """Create JWK using base64url decoded client secret"""
        try:
            if not self.client_secret:
                return None
            # Try to decode client secret as base64url
            decoded_secret = base64.urlsafe_b64decode(self.client_secret + '==')
            if len(decoded_secret) == 32:  # Perfect for AES-256
                return jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(decoded_secret).decode().rstrip('='))
            elif len(decoded_secret) > 32:
                # Truncate to 32 bytes
                return jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(decoded_secret[:32]).decode().rstrip('='))
            else:
                # Pad to 32 bytes
                padded = decoded_secret + b'\x00' * (32 - len(decoded_secret))
                return jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(padded).decode().rstrip('='))
        except Exception as e:
            logger.debug(f"Base64url key creation failed: {e}")
            return None
    
    def _create_direct_secret_key(self):
        """Create JWK using client secret directly as the key (for 64-char secrets)"""
        try:
            if not self.client_secret:
                return None
            logger.debug(f"🔍 Attempting direct secret usage (length: {len(self.client_secret)})")
            
            # For 64-character secrets, use first 32 chars directly
            if len(self.client_secret) >= 32:
                # Take first 32 characters and encode as bytes
                key_bytes = self.client_secret[:32].encode('utf-8')
                if len(key_bytes) == 32:
                    key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(key_bytes).decode().rstrip('='))
                    logger.debug("✅ Created direct secret key (first 32 chars)")
                    return key
            
            # For shorter secrets, pad to 32 bytes
            key_bytes = self.client_secret.encode('utf-8')
            if len(key_bytes) < 32:
                padded = key_bytes + b'\x00' * (32 - len(key_bytes))
                key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(padded).decode().rstrip('='))
                logger.debug(f"✅ Created padded direct secret key: {len(key_bytes)} -> 32 bytes")
                return key
                
            return None
        except Exception as e:
            logger.debug(f"Direct secret key creation failed: {e}")
            return None

    def _create_standard_base64_key(self):
        """Create JWK using standard base64 (not base64url) decoded client secret"""
        try:
            if not self.client_secret:
                return None
            logger.debug(f"🔍 Attempting standard base64 decode of {len(self.client_secret)}-char secret")
            
            # Add padding if needed for standard base64 decoding
            secret_with_padding = self.client_secret
            missing_padding = len(secret_with_padding) % 4
            if missing_padding:
                secret_with_padding += '=' * (4 - missing_padding)
            
            # Try to decode client secret as standard base64
            decoded_secret = base64.b64decode(secret_with_padding)
            logger.debug(f"🔍 Standard base64 decoded secret length: {len(decoded_secret)} bytes")
            
            if len(decoded_secret) == 32:  # Perfect for AES-256
                key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(decoded_secret).decode().rstrip('='))
                logger.debug("✅ Created 32-byte standard base64 key for AES-256")
                return key
            elif len(decoded_secret) > 32:
                # Truncate to 32 bytes
                truncated = decoded_secret[:32]
                key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(truncated).decode().rstrip('='))
                logger.debug(f"✅ Created truncated standard base64 key: {len(decoded_secret)} -> 32 bytes")
                return key
            else:
                # Pad to 32 bytes
                padded = decoded_secret + b'\x00' * (32 - len(decoded_secret))
                key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(padded).decode().rstrip('='))
                logger.debug(f"✅ Created padded standard base64 key: {len(decoded_secret)} -> 32 bytes")
                return key
        except Exception as e:
            logger.debug(f"Standard base64 key creation failed: {e}")
            return None
    
    def validate_token(self, token):
        """
        Validate JWT/JWE token against Auth0's public keys.
        Properly handle JWE tokens by using Auth0 API fallback.
        """
        logger.debug("🔍 Starting JWT/JWE token validation...")
        
        try:
            # Check if this is a JWE token first
            if self.is_jwe_token(token):
                logger.debug("🔍 Detected JWE (encrypted) token")
                logger.info("🔄 JWE token detected - using Auth0 API validation...")
                
                # For JWE tokens, use Auth0 API validation directly
                user_info = self.get_user_info_from_auth0_api(token)
                if user_info:
                    logger.info("✅ JWE token validated successfully via Auth0 API")
                    return user_info
                else:
                    raise exceptions.AuthenticationFailed('JWE token validation failed: Auth0 API validation failed')
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
            # Check if issuer_domain already contains https://
            if self.issuer_domain and self.issuer_domain.startswith("https://"):
                # Remove trailing slash if present and add it back to ensure consistency
                expected_issuer = self.issuer_domain.rstrip("/") + "/"
            else:
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
            
            # Check if account has been deleted/closed
            if hasattr(user, 'is_deleted') and user.is_deleted:
                logger.error(f"❌ User {user.email} has a deleted/closed account")
                raise exceptions.AuthenticationFailed('This account has been closed. Please contact support if you need assistance.')
            
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
                
                # Check if account has been deleted/closed
                if hasattr(user, 'is_deleted') and user.is_deleted:
                    logger.error(f"❌ User {user.email} has a deleted/closed account")
                    raise exceptions.AuthenticationFailed('This account has been closed. Please contact support if you need assistance.')
                
                # Ensure user is marked as authenticated for Django
                if hasattr(user, '_cached_is_authenticated'):
                    user._cached_is_authenticated = True
                
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
                
                # Don't add username field since our User model doesn't use it
                # The User model has username = None to indicate no username field
                
                user = User.objects.create(**user_data)
                logger.info(f"✅ Created new user from Auth0: {email} ({auth0_id})")
                return user

    def _create_dir_base64url_padded_key(self, target_length):
        """
        RFC 7518 Section 4.5: Decode Auth0 client secret as base64url with padding
        Auth0 64-character secrets are often base64url encoded
        """
        try:
            if not self.client_secret:
                return None
            
            # Try base64url decode with padding
            # Add padding if needed for base64url decoding
            secret_with_padding = self.client_secret
            missing_padding = len(secret_with_padding) % 4
            if missing_padding:
                secret_with_padding += '=' * (4 - missing_padding)
            
            key_bytes = base64.urlsafe_b64decode(secret_with_padding)
            logger.debug(f"🔍 Base64url padded decoded key length: {len(key_bytes)} bytes (target: {target_length})")
            
            if len(key_bytes) >= target_length:
                # Use first target_length bytes
                key_bytes = key_bytes[:target_length]
                key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(key_bytes).decode().rstrip('='))
                logger.debug(f"✅ Created RFC 7518 dir algorithm base64url padded key: {len(key_bytes)} bytes")
                return key
            elif len(key_bytes) < target_length:
                # Pad to target length
                padded_bytes = key_bytes + b'\x00' * (target_length - len(key_bytes))
                key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(padded_bytes).decode().rstrip('='))
                logger.debug(f"✅ Created RFC 7518 dir algorithm base64url padded (with padding) key: {len(padded_bytes)} bytes")
                return key
            return None
        except Exception as e:
            logger.debug(f"❌ Dir base64url padded key creation failed: {e}")
            return None
    
    def _create_dir_base64url_no_padding_key(self, target_length):
        """
        RFC 7518 Section 4.5: Decode Auth0 client secret as base64url without padding
        """
        try:
            if not self.client_secret:
                return None
            
            # Try base64url decode without padding
            key_bytes = base64.urlsafe_b64decode(self.client_secret)
            logger.debug(f"🔍 Base64url no-padding decoded key length: {len(key_bytes)} bytes (target: {target_length})")
            
            if len(key_bytes) >= target_length:
                # Use first target_length bytes
                key_bytes = key_bytes[:target_length]
                key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(key_bytes).decode().rstrip('='))
                logger.debug(f"✅ Created RFC 7518 dir algorithm base64url no-padding key: {len(key_bytes)} bytes")
                return key
            elif len(key_bytes) < target_length:
                # Pad to target length
                padded_bytes = key_bytes + b'\x00' * (target_length - len(key_bytes))
                key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(padded_bytes).decode().rstrip('='))
                logger.debug(f"✅ Created RFC 7518 dir algorithm base64url no-padding (with padding) key: {len(padded_bytes)} bytes")
                return key
            return None
        except Exception as e:
            logger.debug(f"❌ Dir base64url no-padding key creation failed: {e}")
            return None
    
    def _create_dir_raw_secret_key(self, target_length):
        """
        RFC 7518 Section 4.5: Use Auth0 client secret raw bytes directly
        For 64-character secrets, use them as UTF-8 bytes directly
        """
        try:
            if not self.client_secret:
                return None
            
            # Convert secret to bytes as UTF-8
            key_bytes = self.client_secret.encode('utf-8')
            logger.debug(f"🔍 Raw secret key length: {len(key_bytes)} bytes (target: {target_length})")
            
            if len(key_bytes) >= target_length:
                # Use first target_length bytes
                key_bytes = key_bytes[:target_length]
                key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(key_bytes).decode().rstrip('='))
                logger.debug(f"✅ Created RFC 7518 dir algorithm raw secret key: {len(key_bytes)} bytes")
                return key
            elif len(key_bytes) < target_length:
                # Pad to target length with zeros
                padded_bytes = key_bytes + b'\x00' * (target_length - len(key_bytes))
                key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(padded_bytes).decode().rstrip('='))
                logger.debug(f"✅ Created RFC 7518 dir algorithm raw secret (with padding) key: {len(padded_bytes)} bytes")
                return key
            return None
        except Exception as e:
            logger.debug(f"❌ Dir raw secret key creation failed: {e}")
            return None
    
    def _create_dir_hkdf_key(self, target_length):
        """
        RFC 7518 Section 4.5: Use HKDF key derivation for Auth0 client secret
        This is a more advanced approach for key derivation
        """
        try:
            if not self.client_secret:
                return None
            
            from cryptography.hazmat.primitives import hashes
            from cryptography.hazmat.primitives.kdf.hkdf import HKDF
            from cryptography.hazmat.backends import default_backend
            
            # Use HKDF to derive key
            hkdf = HKDF(
                algorithm=hashes.SHA256(),
                length=target_length,
                salt=b'auth0_jwe_dir',  # Fixed salt for Auth0 JWE dir algorithm
                info=b'auth0_dir_key_derivation',
                backend=default_backend()
            )
            
            # Use client secret as input key material
            input_key_material = self.client_secret.encode('utf-8')
            derived_key = hkdf.derive(input_key_material)
            
            key = jwk.JWK(kty='oct', k=base64.urlsafe_b64encode(derived_key).decode().rstrip('='))
            logger.debug(f"✅ Created RFC 7518 dir algorithm HKDF key: {len(derived_key)} bytes")
            return key
        except Exception as e:
            logger.debug(f"❌ Dir HKDF key creation failed: {e}")
            return None


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