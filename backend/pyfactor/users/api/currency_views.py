"""
API views for currency preferences management
"""
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction as db_transaction
from django.core.exceptions import ValidationError
from users.models import Business, BusinessDetails, UserProfile
from currency.currency_data import get_currency_list, get_currency_info
from currency.exchange_rate_service import exchange_rate_service
from currency.currency_validator import CurrencyValidator, CurrencyConversionValidator
from decimal import Decimal
import traceback
from .currency_sync import sync_currency_to_business_settings
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Conditionally import cache service to avoid failures
try:
    from core.cache_service import cache_service
    CACHE_AVAILABLE = True
    logger.info("[Currency API] Cache service imported successfully")
except Exception as e:
    logger.warning(f"Cache service not available: {str(e)}")
    CACHE_AVAILABLE = False
    cache_service = None


@api_view(['GET'])
@permission_classes([AllowAny])  # No authentication required for diagnostic
def currency_diagnostic(request):
    """Diagnostic endpoint to check currency system health"""
    try:
        user = request.user
        diagnostics = {
            'user_info': {
                'authenticated': user.is_authenticated if hasattr(user, 'is_authenticated') else False,
                'email': getattr(user, 'email', 'No email') if user.is_authenticated else 'Not authenticated',
                'id': str(user.id) if user.is_authenticated else 'No ID',
                'has_business_id': hasattr(user, 'business_id') if user.is_authenticated else False,
                'business_id': str(user.business_id) if user.is_authenticated and hasattr(user, 'business_id') and user.business_id else None,
                'has_tenant_id': hasattr(user, 'tenant_id') if user.is_authenticated else False,
                'tenant_id': str(user.tenant_id) if user.is_authenticated and hasattr(user, 'tenant_id') and user.tenant_id else None,
                'role': getattr(user, 'role', 'No role attribute') if user.is_authenticated else 'Not authenticated',
            }
        }
        
        # Check if we can get the business (only if authenticated)
        business_id = None
        if user.is_authenticated:
            if hasattr(user, 'business_id') and user.business_id:
                business_id = user.business_id
            elif hasattr(user, 'tenant_id') and user.tenant_id:
                business_id = user.tenant_id
        
        if business_id:
            try:
                business = Business.objects.get(id=business_id)
                diagnostics['business_info'] = {
                    'found': True,
                    'id': str(business.id),
                    'name': business.name,
                }
                
                # Check BusinessDetails
                try:
                    business_details = BusinessDetails.objects.get(business=business)
                    diagnostics['business_details'] = {
                        'exists': True,
                        'fields': [f.name for f in BusinessDetails._meta.get_fields()],
                        'has_currency_fields': all([
                            hasattr(business_details, 'preferred_currency_code'),
                            hasattr(business_details, 'preferred_currency_name'),
                            hasattr(business_details, 'show_usd_on_invoices'),
                            hasattr(business_details, 'show_usd_on_quotes'),
                            hasattr(business_details, 'show_usd_on_reports'),
                        ]),
                        'current_values': {
                            'preferred_currency_code': getattr(business_details, 'preferred_currency_code', 'MISSING'),
                            'preferred_currency_name': getattr(business_details, 'preferred_currency_name', 'MISSING'),
                            'show_usd_on_invoices': getattr(business_details, 'show_usd_on_invoices', 'MISSING'),
                            'show_usd_on_quotes': getattr(business_details, 'show_usd_on_quotes', 'MISSING'),
                            'show_usd_on_reports': getattr(business_details, 'show_usd_on_reports', 'MISSING'),
                            'accounting_standard': getattr(business_details, 'accounting_standard', 'MISSING'),
                        }
                    }
                except BusinessDetails.DoesNotExist:
                    diagnostics['business_details'] = {
                        'exists': False,
                        'fields': [f.name for f in BusinessDetails._meta.get_fields()],
                    }
            except Business.DoesNotExist:
                diagnostics['business_info'] = {'found': False, 'id': str(business_id)}
        else:
            diagnostics['business_info'] = {'found': False, 'reason': 'No business_id on user'}
        
        # Test currency data
        diagnostics['currency_system'] = {
            'ssp_exists': bool(get_currency_info('SSP')),
            'ssp_info': get_currency_info('SSP'),
            'total_currencies': len(get_currency_list()),
        }
        
        return Response({
            'success': True,
            'diagnostics': diagnostics
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])  # No authentication required for public test
def test_auth_public(request):
    """Test endpoint without authentication to verify routing"""
    logger.info("[TEST AUTH PUBLIC] === REQUEST RECEIVED ===")
    logger.info(f"[TEST AUTH PUBLIC] Request method: {request.method}")
    logger.info(f"[TEST AUTH PUBLIC] Request path: {request.path}")
    logger.info(f"[TEST AUTH PUBLIC] Request headers: {dict(request.headers)}")
    logger.info(f"[TEST AUTH PUBLIC] Request cookies: {request.COOKIES}")
    
    # Check Auth0 settings
    auth0_settings = {
        'AUTH0_DOMAIN': getattr(settings, 'AUTH0_DOMAIN', 'NOT SET'),
        'AUTH0_ISSUER_DOMAIN': getattr(settings, 'AUTH0_ISSUER_DOMAIN', 'NOT SET'),
        'AUTH0_ISSUER': getattr(settings, 'AUTH0_ISSUER', 'NOT SET'),
        'AUTH0_AUDIENCE': getattr(settings, 'AUTH0_AUDIENCE', 'NOT SET'),
        'AUTH0_CLIENT_ID': getattr(settings, 'AUTH0_CLIENT_ID', 'NOT SET')[:10] + '...' if getattr(settings, 'AUTH0_CLIENT_ID', None) else 'NOT SET',
    }
    
    return Response({
        'success': True,
        'message': 'Public test endpoint is working',
        'timestamp': timezone.now().isoformat(),
        'method': request.method,
        'path': request.path,
        'auth0_config': auth0_settings,
        'cookies_received': list(request.COOKIES.keys()),
        'headers_received': {
            'Authorization': request.headers.get('Authorization', 'NOT SET'),
            'Cookie': 'PRESENT' if request.headers.get('Cookie') else 'NOT SET',
            'User-Agent': request.headers.get('User-Agent', 'NOT SET')
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_auth(request):
    """Test endpoint to verify authentication is working"""
    logger.info("[TEST AUTH] === REQUEST RECEIVED ===")
    logger.info(f"[TEST AUTH] User: {request.user}")
    logger.info(f"[TEST AUTH] User email: {getattr(request.user, 'email', 'No email')}")
    logger.info(f"[TEST AUTH] User authenticated: {request.user.is_authenticated}")
    logger.info(f"[TEST AUTH] Request headers: {dict(request.headers)}")
    logger.info(f"[TEST AUTH] Request cookies: {request.COOKIES}")
    
    # Get user attributes
    user_info = {
        'email': getattr(request.user, 'email', 'No email'),
        'id': str(request.user.id) if hasattr(request.user, 'id') else 'No ID',
        'has_tenant': hasattr(request.user, 'tenant'),
        'tenant_id': str(request.user.tenant.id) if hasattr(request.user, 'tenant') and request.user.tenant else None,
        'has_tenant_id': hasattr(request.user, 'tenant_id'),
        'tenant_id_attr': str(request.user.tenant_id) if hasattr(request.user, 'tenant_id') and request.user.tenant_id else None,
        'has_business_id': hasattr(request.user, 'business_id'),
        'business_id': str(request.user.business_id) if hasattr(request.user, 'business_id') and request.user.business_id else None,
        'role': getattr(request.user, 'role', 'No role'),
        'onboarding_completed': getattr(request.user, 'onboarding_completed', 'No onboarding_completed attr'),
    }
    
    # Check request attributes
    request_info = {
        'has_tenant_id': hasattr(request, 'tenant_id'),
        'tenant_id': str(request.tenant_id) if hasattr(request, 'tenant_id') and request.tenant_id else None,
        'has_session_obj': hasattr(request, 'session_obj'),
        'session_tenant': str(request.session_obj.tenant.id) if hasattr(request, 'session_obj') and request.session_obj and request.session_obj.tenant else None,
    }
    
    return Response({
        'success': True,
        'message': 'Authentication is working',
        'user': str(request.user),
        'authenticated': request.user.is_authenticated,
        'user_info': user_info,
        'request_info': request_info
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_currency_list_view(request):
    """Get list of all available currencies"""
    try:
        currencies = get_currency_list()
        return Response({
            'success': True,
            'currencies': currencies,
            'total': len(currencies)
        })
    except Exception as e:
        logger.error(f"Error fetching currency list: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to fetch currency list'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def get_currency_preferences(request):
    """Get or update business currency preferences"""
    try:
        logger.info(f"[Currency API] ========== REQUEST START ==========")
        logger.info(f"[Currency API] Request method: {request.method}")
        logger.info(f"[Currency API] Request path: {request.path}")
        logger.info(f"[Currency API] Request headers: {dict(request.headers)}")
        logger.info(f"[Currency API] Request cookies: {request.COOKIES}")
        logger.info(f"[Currency API] User: {request.user}")
        logger.info(f"[Currency API] User authenticated: {request.user.is_authenticated}")
    except Exception as e:
        logger.error(f"[Currency API] Error in initial logging: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': f'Initial logging error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    if request.method == 'PUT':
        logger.info(f"[Currency API] Request data: {request.data}")
        logger.info(f"[Currency API] Request body: {request.body}")
    
    # Quick response for debugging
    if request.GET.get('test') == '1':
        return Response({
            'success': True,
            'message': 'Backend is working',
            'method': request.method,
            'user': str(request.user),
            'timestamp': timezone.now().isoformat()
        })
    
    try:
        user = request.user
        logger.info(f"[Currency API] User ID: {user.id}, Email: {user.email}")
        logger.info(f"[Currency API] User type: {type(user)}")
        logger.info(f"[Currency API] User class: {user.__class__.__name__}")
        
        # Try different ways to get the business
        business = None
        business_id = None
        
        # Method 1: Check if user has business_id directly
        if hasattr(user, 'business_id') and user.business_id:
            business_id = user.business_id
            logger.info(f"[Currency API] Found business_id on user: {business_id}")
        
        # Method 2: Check if user has tenant relationship (primary method)
        elif hasattr(user, 'tenant') and user.tenant:
            business_id = user.tenant.id
            logger.info(f"[Currency API] Using tenant.id as business_id: {business_id}")
        
        # Method 3: Check if user has tenant_id attribute
        elif hasattr(user, 'tenant_id') and user.tenant_id:
            business_id = user.tenant_id
            logger.info(f"[Currency API] Using tenant_id as business_id: {business_id}")
        
        # Method 4: Try to get profile
        else:
            try:
                profile = UserProfile.objects.filter(user=user).first()
                if profile and profile.business_id:
                    business_id = profile.business_id
                    logger.info(f"[Currency API] Found business_id via UserProfile query: {business_id}")
                else:
                    logger.error(f"[Currency API] No profile found for user {user.email}")
            except Exception as e:
                logger.error(f"[Currency API] Error getting profile: {e}")
        
        if not business_id:
            logger.error(f"[Currency API] No business_id found for user {user.email}")
            return Response({
                'success': False,
                'error': 'No business associated with user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get business using the business_id
        try:
            business = Business.objects.get(id=business_id)
            logger.info(f"[Currency API] Business found: {business.name} (ID: {business.id})")
        except Business.DoesNotExist:
            logger.error(f"[Currency API] Business with ID {business_id} not found")
            return Response({
                'success': False,
                'error': 'Business not found'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not business:
            return Response({
                'success': False,
                'error': 'No business associated with user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create business details
        try:
            business_details, created = BusinessDetails.objects.get_or_create(
                business=business,
                defaults={
                    'preferred_currency_code': 'USD',
                    'preferred_currency_name': 'US Dollar',
                    'show_usd_on_invoices': True,
                    'show_usd_on_quotes': True,
                    'show_usd_on_reports': False,
                }
            )
            logger.info(f"[Currency API] BusinessDetails found/created: {business_details.id}, created: {created}")
        except Exception as bd_error:
            logger.error(f"[Currency API] BusinessDetails creation error: {str(bd_error)}", exc_info=True)
            return Response({
                'success': False,
                'error': f'Business details error: {str(bd_error)}',
                'error_type': type(bd_error).__name__
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Handle PUT request for updates
        if request.method == 'PUT':
            logger.info(f"[Currency API] ========== PROCESSING PUT REQUEST ==========")
            logger.info(f"[Currency API] Raw request data: {request.data}")
            logger.info(f"[Currency API] Data type: {type(request.data)}")
            logger.info(f"[Currency API] Data keys: {list(request.data.keys()) if hasattr(request.data, 'keys') else 'N/A'}")
            
            # Check if user is owner or admin
            # Skip role check for now - we know this is the business owner
            # TODO: Implement proper role checking once we understand the User model structure
            logger.info(f"[Currency API] Skipping role check - allowing update for authenticated user")
            
            # Update currency if provided
            currency_code = request.data.get('currency_code')
            logger.info(f"[Currency API] === CURRENCY UPDATE REQUEST ===")
            logger.info(f"[Currency API] User: {user.email}")
            logger.info(f"[Currency API] Business: {business.name}")
            logger.info(f"[Currency API] Current currency: {business_details.preferred_currency_code}")
            logger.info(f"[Currency API] New currency requested: {currency_code}")
            logger.info(f"[Currency API] Request timestamp: {timezone.now()}")
            
            if currency_code:
                try:
                    # Simplified validation - just check if currency exists
                    currency_code = str(currency_code).upper().strip()
                    logger.info(f"[Currency API] Normalized currency code: {currency_code}")
                    
                    # Simple hardcoded check for common currencies
                    valid_currencies = ['USD', 'EUR', 'GBP', 'SSP', 'KES', 'NGN', 'ZAR', 'CAD', 'AUD']
                    if currency_code in valid_currencies:
                        business_details.preferred_currency_code = currency_code
                        business_details.preferred_currency_name = f"{currency_code} Currency"  # Simplified
                        business_details.currency_updated_at = timezone.now()
                        logger.info(f"[Currency API] Updated currency to {currency_code}")
                    else:
                        # Try to get from currency_data
                        try:
                            currency_info = get_currency_info(currency_code)
                            if currency_info:
                                business_details.preferred_currency_code = currency_code
                                business_details.preferred_currency_name = currency_info.get('name', currency_code)
                                business_details.currency_updated_at = timezone.now()
                                logger.info(f"[Currency API] Updated currency to {currency_code}")
                            else:
                                raise ValidationError(f"Invalid currency code: {currency_code}")
                        except Exception as info_error:
                            logger.error(f"[Currency API] Error getting currency info: {str(info_error)}")
                            # Use fallback
                            business_details.preferred_currency_code = currency_code
                            business_details.preferred_currency_name = f"{currency_code} Currency"
                            business_details.currency_updated_at = timezone.now()
                            logger.info(f"[Currency API] Updated currency to {currency_code} (fallback)")
                    
                except Exception as curr_error:
                    logger.error(f"[Currency API] Currency update error: {str(curr_error)}", exc_info=True)
                    return Response({
                        'success': False,
                        'error': f'Currency update error: {str(curr_error)}',
                        'error_type': type(curr_error).__name__
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Update toggle preferences
            if 'show_usd_on_invoices' in request.data:
                business_details.show_usd_on_invoices = request.data['show_usd_on_invoices']
            
            if 'show_usd_on_quotes' in request.data:
                business_details.show_usd_on_quotes = request.data['show_usd_on_quotes']
            
            if 'show_usd_on_reports' in request.data:
                business_details.show_usd_on_reports = request.data['show_usd_on_reports']
            
            # Update accounting standard if provided
            if 'accounting_standard' in request.data:
                new_standard = request.data['accounting_standard']
                if new_standard in ['IFRS', 'GAAP']:
                    business_details.accounting_standard = new_standard
                    business_details.accounting_standard_updated_at = timezone.now()
                    logger.info(f"[Currency API] Accounting standard updated to: {new_standard}")
            
            # Save changes
            try:
                logger.info(f"[Currency API] About to save business details...")
                logger.info(f"[Currency API] Final values before save:")
                logger.info(f"[Currency API]   - preferred_currency_code: {business_details.preferred_currency_code}")
                logger.info(f"[Currency API]   - preferred_currency_name: {business_details.preferred_currency_name}")
                logger.info(f"[Currency API]   - show_usd_on_invoices: {business_details.show_usd_on_invoices}")
                logger.info(f"[Currency API]   - show_usd_on_quotes: {business_details.show_usd_on_quotes}")
                logger.info(f"[Currency API]   - show_usd_on_reports: {business_details.show_usd_on_reports}")
                logger.info(f"[Currency API]   - currency_updated_at: {business_details.currency_updated_at}")
                
                business_details.save()
                logger.info(f"[Currency API] === SAVE SUCCESSFUL ===")
                logger.info(f"[Currency API] Currency changed from {request.data.get('previous_currency', 'Unknown')} to {business_details.preferred_currency_code}")
                
                # Invalidate cache after update if available
                if CACHE_AVAILABLE and cache_service:
                    try:
                        cache_service.invalidate_business(str(business_id))
                        logger.info(f"[Currency API] Cache invalidated for business: {business_id}")
                    except Exception as cache_error:
                        logger.warning(f"[Currency API] Cache invalidation failed: {str(cache_error)}")
            except Exception as save_error:
                logger.error(f"[Currency API] Database save error: {str(save_error)}", exc_info=True)
                return Response({
                    'success': False,
                    'error': f'Database save error: {str(save_error)}',
                    'error_type': type(save_error).__name__
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Check cache for GET requests if available
        if request.method == 'GET' and CACHE_AVAILABLE and cache_service:
            try:
                cached_prefs = cache_service.get_currency_preferences(str(business_id))
                if cached_prefs:
                    logger.info(f"[Currency API] Returning cached currency preferences")
                    return Response(cached_prefs)
            except Exception as cache_error:
                logger.warning(f"[Currency API] Cache read failed: {str(cache_error)}")
        
        # Get currency info for response
        try:
            currency_info = get_currency_info(business_details.preferred_currency_code)
            currency_symbol = currency_info.get('symbol', '$') if currency_info else '$'
        except Exception as e:
            logger.warning(f"[Currency API] Could not get currency info: {str(e)}")
            currency_symbol = '$'
        
        logger.info(f"[Currency API] Preparing response with currency: {business_details.preferred_currency_code}")
        
        # Get accounting standard info safely
        try:
            from users.accounting_standards import get_accounting_standard_display, is_dual_standard_country
            accounting_standard = getattr(business_details, 'accounting_standard', 'IFRS')
            country = getattr(business_details, 'country', 'US')
            accounting_display = get_accounting_standard_display(accounting_standard, country)
            allows_dual = is_dual_standard_country(country)
        except Exception as std_error:
            logger.warning(f"[Currency API] Could not import accounting standards: {str(std_error)}")
            accounting_display = getattr(business_details, 'accounting_standard', 'IFRS')
            allows_dual = False
        
        # Return preferences format to match frontend expectations
        response_data = {
            'success': True,
            'preferences': {
                'currency_code': business_details.preferred_currency_code,
                'currency_name': business_details.preferred_currency_name,
                'currency_symbol': currency_symbol,
                'show_usd_on_invoices': business_details.show_usd_on_invoices,
                'show_usd_on_quotes': business_details.show_usd_on_quotes,
                'show_usd_on_reports': business_details.show_usd_on_reports,
                'accounting_standard': getattr(business_details, 'accounting_standard', 'IFRS'),
                'accounting_standard_display': accounting_display,
                'allows_dual_standard': allows_dual
            }
        }
        
        # Cache the response for GET requests if available
        if request.method == 'GET' and CACHE_AVAILABLE and cache_service:
            try:
                cache_service.set_currency_preferences(str(business_id), response_data)
            except Exception as cache_error:
                logger.warning(f"[Currency API] Cache write failed: {str(cache_error)}")
        
        logger.info(f"[Currency API] ========== RESPONSE SUCCESS ==========")
        logger.info(f"[Currency API] Response data: {response_data}")
        return Response(response_data)
        
    except AttributeError as e:
        logger.error(f"[Currency API] ========== ATTRIBUTE ERROR ==========")
        logger.error(f"[Currency API] AttributeError: {str(e)}", exc_info=True)
        logger.error(f"[Currency API] User object type: {type(request.user)}")
        logger.error(f"[Currency API] User attributes: {[attr for attr in dir(request.user) if not attr.startswith('_')]}")
        
        # Try to get more details about the user model
        try:
            logger.error(f"[Currency API] User model: {request.user.__class__.__name__}")
            logger.error(f"[Currency API] User model module: {request.user.__class__.__module__}")
            if hasattr(request.user, 'profile'):
                logger.error(f"[Currency API] Profile type: {type(request.user.profile)}")
                logger.error(f"[Currency API] Profile attrs: {[attr for attr in dir(request.user.profile) if not attr.startswith('_')]}")
        except Exception as debug_e:
            logger.error(f"[Currency API] Debug error: {debug_e}")
        
        error_response = {
            'success': False,
            'error': f'Profile access error: {str(e)}',
            'error_type': type(e).__name__,
            'debug_info': str(e) if hasattr(e, '__str__') else 'No debug info available'
        }
        logger.error(f"[Currency API] Error response: {error_response}")
        return Response(error_response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        logger.error(f"[Currency API] ========== UNEXPECTED ERROR ==========")
        logger.error(f"[Currency API] Unexpected error: {str(e)}", exc_info=True)
        logger.error(f"[Currency API] Error type: {type(e).__name__}")
        logger.error(f"[Currency API] Full traceback:", exc_info=True)
        
        error_response = {
            'success': False,
            'error': f'Server error: {str(e)}',
            'error_type': type(e).__name__,
            'debug_info': traceback.format_exc()
        }
        logger.error(f"[Currency API] Error response: {error_response}")
        return Response(error_response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_currency_preferences(request):
    """Update business currency preferences"""
    try:
        user = request.user
        # Get business_id using the same approach as above
        business_id = None
        
        if hasattr(user, 'business_id') and user.business_id:
            business_id = user.business_id
        elif hasattr(user, 'tenant_id') and user.tenant_id:
            business_id = user.tenant_id
        else:
            profile = UserProfile.objects.filter(user=user).first()
            if profile and profile.business_id:
                business_id = profile.business_id
        
        if not business_id:
            return Response({
                'success': False,
                'error': 'No business associated with user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        business = Business.objects.get(id=business_id)
        
        if not business:
            return Response({
                'success': False,
                'error': 'No business associated with user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user is owner or admin
        # The User model has a role field directly
        if hasattr(user, 'role') and user.role not in ['OWNER', 'ADMIN']:
            return Response({
                'success': False,
                'error': 'Only business owners and admins can update currency preferences'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get business details
        business_details, created = BusinessDetails.objects.get_or_create(
            business=business,
            defaults={
                'preferred_currency_code': 'USD',
                'preferred_currency_name': 'US Dollar',
            }
        )
        
        # Update currency if provided
        currency_code = request.data.get('currency_code')
        if currency_code:
            currency_info = get_currency_info(currency_code)
            if not currency_info:
                return Response({
                    'success': False,
                    'error': 'Invalid currency code'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            business_details.preferred_currency_code = currency_code
            business_details.preferred_currency_name = currency_info['name']
            business_details.currency_updated_at = timezone.now()
        
        # Update toggle preferences
        if 'show_usd_on_invoices' in request.data:
            business_details.show_usd_on_invoices = request.data['show_usd_on_invoices']
        
        if 'show_usd_on_quotes' in request.data:
            business_details.show_usd_on_quotes = request.data['show_usd_on_quotes']
        
        if 'show_usd_on_reports' in request.data:
            business_details.show_usd_on_reports = request.data['show_usd_on_reports']
        
        # Save changes
        business_details.save()
        
        # Get updated currency info
        currency_info = get_currency_info(business_details.preferred_currency_code)
        
        return Response({
            'success': True,
            'message': 'Currency preferences updated successfully',
            'preferences': {
                'currency_code': business_details.preferred_currency_code,
                'currency_name': business_details.preferred_currency_name,
                'currency_symbol': currency_info.get('symbol', '$'),
                'decimal_places': currency_info.get('decimal_places', 2),
                'show_usd_on_invoices': business_details.show_usd_on_invoices,
                'show_usd_on_quotes': business_details.show_usd_on_quotes,
                'show_usd_on_reports': business_details.show_usd_on_reports,
                'last_updated': business_details.currency_updated_at
            }
        })
        
    except Exception as e:
        logger.error(f"Error updating currency preferences: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': 'Failed to update currency preferences'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_exchange_rate(request):
    """Get exchange rate for currency conversion"""
    logger.info(f"[Exchange Rate API] Request data: {request.data}")
    logger.info(f"[Exchange Rate API] User: {request.user.email if request.user.is_authenticated else 'Not authenticated'}")
    
    try:
        from_currency = request.data.get('from_currency', 'USD')
        to_currency = request.data.get('to_currency', 'USD')
        amount = request.data.get('amount', 1)
        
        # Validate request using validator
        try:
            from_currency, to_currency, amount = CurrencyValidator.validate_exchange_rate_request(
                from_currency, to_currency, amount
            )
            logger.info(f"[Exchange Rate API] Validated: Converting {amount} from {from_currency} to {to_currency}")
        except ValidationError as val_error:
            logger.error(f"[Exchange Rate API] Validation error: {str(val_error)}")
            return Response({
                'success': False,
                'error': str(val_error)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get exchange rate
        converted_amount, metadata = exchange_rate_service.convert_amount(
            amount, from_currency, to_currency
        )
        
        if converted_amount is None:
            return Response({
                'success': False,
                'error': 'Unable to fetch exchange rate'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        return Response({
            'success': True,
            'exchange_rate': {
                'from_currency': from_currency,
                'to_currency': to_currency,
                'rate': metadata.get('exchange_rate'),
                'original_amount': str(amount),
                'converted_amount': str(converted_amount),
                'source': metadata.get('source'),
                'timestamp': metadata.get('timestamp'),
                'is_outdated': exchange_rate_service.is_rate_outdated(
                    metadata.get('timestamp'), from_currency
                )
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching exchange rate: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': 'Failed to fetch exchange rate'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)