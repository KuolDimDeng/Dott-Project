"""
Cloudflare-compatible session creation view.
Handles session creation with proper Cloudflare proxy support.
"""
import logging
import json
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from rest_framework import status
from custom_auth.models import User
from .models import UserSession
from .services import session_service

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class CloudflareSessionCreateView(View):
    """
    Session creation endpoint that works with Cloudflare proxy.
    Accepts both JWT tokens and email/password authentication.
    """
    
    def post(self, request):
        """Create session with Cloudflare compatibility."""
        try:
            # Get real IP from Cloudflare headers
            real_ip = request.META.get('HTTP_CF_CONNECTING_IP') or \
                     request.META.get('HTTP_X_REAL_IP') or \
                     request.META.get('REMOTE_ADDR', 'unknown')
            
            # Get Cloudflare Ray ID for tracking
            cf_ray = request.META.get('HTTP_CF_RAY', 'no-ray-id')
            
            logger.info(f"[CloudflareSession] Session creation request from IP: {real_ip}, Ray: {cf_ray}")
            
            # Parse request body
            try:
                data = json.loads(request.body.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError):
                return JsonResponse({
                    'error': 'Invalid request body'
                }, status=400)
            
            # Extract authentication data
            email = data.get('email')
            password = data.get('password')
            auth0_token = data.get('auth0_token')
            auth0_sub = data.get('auth0_sub')
            
            user = None
            
            # Try Auth0 authentication first
            if auth0_sub:
                try:
                    user = User.objects.get(auth0_sub=auth0_sub)
                    logger.info(f"[CloudflareSession] Found user by Auth0 sub: {user.email}")
                except User.DoesNotExist:
                    logger.warning(f"[CloudflareSession] User not found for Auth0 sub: {auth0_sub}")
            
            # Try email authentication
            if not user and email:
                try:
                    user = User.objects.get(email=email)
                    logger.info(f"[CloudflareSession] Found user by email: {email}")
                    
                    # If password provided, verify it
                    if password and hasattr(user, 'check_password'):
                        if not user.check_password(password):
                            logger.warning(f"[CloudflareSession] Invalid password for user: {email}")
                            return JsonResponse({
                                'error': 'Invalid credentials'
                            }, status=401)
                except User.DoesNotExist:
                    logger.warning(f"[CloudflareSession] User not found for email: {email}")
                    return JsonResponse({
                        'error': 'User not found'
                    }, status=404)
            
            if not user:
                return JsonResponse({
                    'error': 'Authentication required'
                }, status=401)
            
            # Create session
            request_meta = {
                'ip_address': real_ip,
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'cf_ray': cf_ray,
                'cf_country': request.META.get('HTTP_CF_IPCOUNTRY', 'unknown')
            }
            
            # Use session service to create session
            session_data = session_service.create_session(
                user=user,
                access_token=auth0_token or '',
                request_meta=request_meta
            )
            
            logger.info(f"[CloudflareSession] Session created successfully for user: {user.email}")
            
            # Prepare response with session data
            response_data = {
                'authenticated': True,
                'session_token': session_data['session_token'],
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'name': getattr(user, 'name', '') or f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip(),
                    'auth0_sub': user.auth0_sub,
                    'subscription_plan': getattr(user, 'subscription_plan', 'free'),
                    'role': getattr(user, 'role', 'user'),
                    'onboarding_completed': getattr(user, 'onboarding_completed', False)
                }
            }
            
            # Add tenant info if available
            if hasattr(user, 'tenant') and user.tenant:
                response_data['tenant'] = {
                    'id': str(user.tenant.id),
                    'name': user.tenant.name,
                    'business_name': getattr(user.tenant, 'business_name', user.tenant.name)
                }
                response_data['user']['tenant_id'] = str(user.tenant.id)
            
            # Create response with proper CORS headers for Cloudflare
            response = JsonResponse(response_data)
            
            # Set session cookie with Cloudflare-compatible settings
            max_age = getattr(settings, 'SESSION_TTL', 86400)  # 24 hours
            
            response.set_cookie(
                'sid',
                session_data['session_token'],
                max_age=max_age,
                httponly=True,
                secure=True,  # Always use secure with Cloudflare
                samesite='None',  # Allow cross-site for Cloudflare
                domain='.dottapps.com' if not settings.DEBUG else None,
                path='/'
            )
            
            response.set_cookie(
                'session_token',
                session_data['session_token'],
                max_age=max_age,
                httponly=True,
                secure=True,
                samesite='None',
                domain='.dottapps.com' if not settings.DEBUG else None,
                path='/'
            )
            
            # Add CORS headers for Cloudflare
            origin = request.META.get('HTTP_ORIGIN', 'https://dottapps.com')
            if origin in ['https://dottapps.com', 'https://www.dottapps.com', 'https://api.dottapps.com']:
                response['Access-Control-Allow-Origin'] = origin
                response['Access-Control-Allow-Credentials'] = 'true'
            
            return response
            
        except Exception as e:
            logger.error(f"[CloudflareSession] Error creating session: {e}", exc_info=True)
            return JsonResponse({
                'error': 'Session creation failed',
                'details': str(e) if settings.DEBUG else None
            }, status=500)
    
    def options(self, request):
        """Handle CORS preflight requests."""
        response = JsonResponse({'status': 'ok'})
        
        # Set CORS headers
        origin = request.META.get('HTTP_ORIGIN', 'https://dottapps.com')
        if origin in ['https://dottapps.com', 'https://www.dottapps.com', 'https://api.dottapps.com']:
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-CSRFToken'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Max-Age'] = '86400'
        
        return response