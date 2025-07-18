"""
Consolidated authentication view that handles the complete auth flow atomically.
This ensures data consistency and follows security best practices.
"""
import logging
import json
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.db import transaction
from django.core.cache import cache

from custom_auth.models import User
from onboarding.models import OnboardingProgress
from .models import UserSession
from .services import session_service

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class ConsolidatedAuthView(View):
    """
    Handles complete authentication flow in a single atomic operation.
    Combines authentication, user sync, and session creation.
    """
    
    @transaction.atomic
    def post(self, request):
        """Handle authentication and session creation atomically."""
        try:
            # Get real IP from headers
            real_ip = request.META.get('HTTP_CF_CONNECTING_IP') or \
                     request.META.get('HTTP_X_REAL_IP') or \
                     request.META.get('REMOTE_ADDR', 'unknown')
            
            # Get Cloudflare Ray ID for tracking
            cf_ray = request.META.get('HTTP_CF_RAY', 'no-ray-id')
            
            logger.info(f"[ConsolidatedAuth] Auth request from IP: {real_ip}, Ray: {cf_ray}")
            
            # Parse request body
            try:
                data = json.loads(request.body.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError):
                return JsonResponse({
                    'error': 'Invalid request body'
                }, status=400)
            
            # Extract authentication data
            auth0_sub = data.get('auth0_sub')
            email = data.get('email')
            access_token = data.get('access_token')
            
            if not auth0_sub or not email or not access_token:
                return JsonResponse({
                    'error': 'Missing required fields'
                }, status=400)
            
            # Rate limiting check
            cache_key = f"auth_attempts_{real_ip}_{email}"
            attempts = cache.get(cache_key, 0)
            if attempts >= 10:  # Max 10 attempts per hour
                logger.warning(f"[ConsolidatedAuth] Rate limit exceeded for IP: {real_ip}, email: {email}")
                return JsonResponse({
                    'error': 'Too many authentication attempts. Please try again later.'
                }, status=429)
            
            # Find or update user
            user = None
            try:
                # Try to find by auth0_sub first
                user = User.objects.select_for_update().get(auth0_sub=auth0_sub)
                logger.info(f"[ConsolidatedAuth] Found user by Auth0 sub: {user.email}")
            except User.DoesNotExist:
                # Try to find by email and update auth0_sub
                try:
                    user = User.objects.select_for_update().get(email=email)
                    logger.info(f"[ConsolidatedAuth] Found user by email: {email}, updating auth0_sub")
                    user.auth0_sub = auth0_sub
                    user.save(update_fields=['auth0_sub'])
                except User.DoesNotExist:
                    logger.error(f"[ConsolidatedAuth] User not found: {email}")
                    cache.set(cache_key, attempts + 1, 3600)  # 1 hour
                    return JsonResponse({
                        'error': 'User not found'
                    }, status=404)
            
            # Clear rate limit on successful auth
            cache.delete(cache_key)
            
            # Check if account is active
            if hasattr(user, 'is_active') and not user.is_active:
                logger.warning(f"[ConsolidatedAuth] Inactive account: {email}")
                return JsonResponse({
                    'error': 'Account is inactive'
                }, status=403)
            
            # Get tenant information
            tenant = None
            if hasattr(user, 'tenant'):
                tenant = user.tenant
                logger.info(f"[ConsolidatedAuth] User has tenant: {tenant.name if tenant else 'None'}")
            
            # Determine onboarding status (single source of truth)
            needs_onboarding = not user.onboarding_completed
            
            # Get current onboarding step if needed
            onboarding_step = 'complete'
            if needs_onboarding:
                try:
                    progress = OnboardingProgress.objects.filter(user=user).first()
                    if progress:
                        onboarding_step = progress.current_step or 'business_info'
                except Exception as e:
                    logger.warning(f"[ConsolidatedAuth] Error getting onboarding progress: {e}")
                    onboarding_step = 'business_info'
            
            # Create session with all data
            request_meta = {
                'ip_address': real_ip,
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'cf_ray': cf_ray,
                'cf_country': request.META.get('HTTP_CF_IPCOUNTRY', 'unknown')
            }
            
            session = session_service.create_session(
                user=user,
                access_token=access_token,
                request_meta=request_meta,
                tenant=tenant,
                needs_onboarding=needs_onboarding,
                onboarding_completed=user.onboarding_completed,
                onboarding_step=onboarding_step
            )
            
            logger.info(f"[ConsolidatedAuth] Session created: {session.session_id}")
            
            # Build comprehensive response
            response_data = {
                'success': True,
                'authenticated': True,
                'session_token': str(session.session_id),
                'needs_onboarding': needs_onboarding,
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'name': getattr(user, 'name', '') or f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip(),
                    'auth0_sub': user.auth0_sub,
                    'subscription_plan': getattr(user, 'subscription_plan', 'free'),
                    'role': getattr(user, 'role', 'USER'),
                    'onboarding_completed': user.onboarding_completed,
                    'needs_onboarding': needs_onboarding,
                    'needsOnboarding': needs_onboarding  # camelCase for compatibility
                }
            }
            
            # Include WhatsApp commerce preference from UserProfile
            try:
                from users.models import UserProfile
                profile = UserProfile.objects.get(user=user)
                response_data['user']['show_whatsapp_commerce'] = profile.get_whatsapp_commerce_preference()
                response_data['user']['whatsapp_commerce_explicit'] = profile.show_whatsapp_commerce
                response_data['user']['country'] = str(profile.country) if profile.country else 'US'
            except Exception as e:
                logger.debug(f"[ConsolidatedAuth] Could not fetch UserProfile data: {e}")
                response_data['user']['show_whatsapp_commerce'] = False
                response_data['user']['country'] = 'US'
            
            # Add tenant info if available
            if tenant:
                response_data['tenant'] = {
                    'id': str(tenant.id),
                    'name': tenant.name,
                    'business_name': getattr(tenant, 'business_name', tenant.name),
                    'subscription_plan': getattr(tenant, 'subscription_plan', 'free')
                }
                response_data['user']['tenant_id'] = str(tenant.id)
                response_data['user']['tenantId'] = str(tenant.id)  # camelCase
                response_data['tenant_id'] = str(tenant.id)  # Top level for compatibility
            
            # Add user sync compatibility fields
            response_data['is_new_user'] = False  # Since we're finding existing users
            response_data['is_existing_user'] = True
            response_data['current_step'] = onboarding_step
            
            # Create response
            response = JsonResponse(response_data)
            
            # Set secure session cookies
            max_age = getattr(settings, 'SESSION_TTL', 86400)  # 24 hours
            samesite_policy = 'Lax'  # Changed back to Lax for better compatibility
            
            response.set_cookie(
                'sid',
                str(session.session_id),
                max_age=max_age,
                httponly=True,
                secure=not settings.DEBUG,
                samesite=samesite_policy,
                domain=None,
                path='/'
            )
            
            response.set_cookie(
                'session_token',
                str(session.session_id),
                max_age=max_age,
                httponly=True,
                secure=not settings.DEBUG,
                samesite=samesite_policy,
                domain=None,
                path='/'
            )
            
            # Add CORS headers
            origin = request.META.get('HTTP_ORIGIN')
            if origin:
                response['Access-Control-Allow-Origin'] = origin
                response['Access-Control-Allow-Credentials'] = 'true'
            
            return response
            
        except Exception as e:
            logger.error(f"[ConsolidatedAuth] Unexpected error: {e}", exc_info=True)
            return JsonResponse({
                'error': 'Authentication failed',
                'details': str(e) if settings.DEBUG else None
            }, status=500)
    
    def options(self, request):
        """Handle CORS preflight requests."""
        response = JsonResponse({'status': 'ok'})
        
        origin = request.META.get('HTTP_ORIGIN')
        if origin:
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Max-Age'] = '86400'
        
        return response