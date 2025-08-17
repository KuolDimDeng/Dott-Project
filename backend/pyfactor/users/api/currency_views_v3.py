"""
Currency preferences API v3 - Complete overhaul with comprehensive logging
"""
import logging
import json
import traceback
from datetime import datetime
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction as db_transaction
from django.conf import settings
from users.models import Business, BusinessDetails, UserProfile
from currency.currency_data import get_currency_info, get_currency_list
from currency.currency_detection import auto_set_currency_for_business, detect_currency_for_country

# Configure logging with more detail
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Add console handler if not present
if not logger.handlers:
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter('[%(asctime)s] [%(name)s] [%(levelname)s] %(message)s')
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

def log_request_details(request, method):
    """Log comprehensive request details"""
    logger.info(f"🌟 [Currency V3] ========== {method} REQUEST START ==========")
    logger.info(f"🌟 [Currency V3] Timestamp: {datetime.now().isoformat()}")
    logger.info(f"🌟 [Currency V3] Path: {request.path}")
    logger.info(f"🌟 [Currency V3] Method: {request.method}")
    logger.info(f"🌟 [Currency V3] User: {getattr(request.user, 'email', 'Unknown')}")
    logger.info(f"🌟 [Currency V3] User ID: {getattr(request.user, 'id', 'None')}")
    logger.info(f"🌟 [Currency V3] Authenticated: {request.user.is_authenticated}")
    
    # Log headers (excluding sensitive ones)
    safe_headers = {}
    for header, value in request.headers.items():
        if header.lower() not in ['cookie', 'authorization', 'x-api-key']:
            safe_headers[header] = value
    logger.info(f"🌟 [Currency V3] Headers: {json.dumps(safe_headers, indent=2)}")
    
    # Log body for PUT requests
    if method == 'PUT' and hasattr(request, 'data'):
        logger.info(f"🌟 [Currency V3] Body: {json.dumps(dict(request.data), indent=2)}")

def get_user_business_enhanced(user, request=None):
    """
    Get business for user with enhanced security and reliability
    Uses the improved business_utils module with fallback support
    """
    logger.info(f"🔍 [Currency V3] Getting business for user: {user.email}")
    
    # Always use the improved business utils with request context
    try:
        from users.business_utils import get_user_business as get_business_improved
        business = get_business_improved(user, use_cache=True, request=request)
        if business:
            logger.info(f"✅ [Currency V3] Business found via improved utils: {business.name} (ID: {business.id})")
            return business, 'business_utils'
        else:
            logger.warning(f"⚠️ [Currency V3] Business utils returned None for user: {user.email}")
    except ImportError as e:
        logger.error(f"❌ [Currency V3] Failed to import business_utils: {e}")
    except Exception as e:
        logger.error(f"❌ [Currency V3] Error using business utils: {e}", exc_info=True)
    
    # If business_utils fails or returns None, return None
    # This ensures we don't duplicate logic and maintain single source of truth
    logger.error(f"❌ [Currency V3] No business found for user {user.email}")
    return None, None

@api_view(['GET', 'PUT', 'POST'])
@permission_classes([IsAuthenticated])
def currency_preferences_v3(request):
    """
    Get or update currency preferences with comprehensive logging
    """
    log_request_details(request, request.method)
    
    try:
        # Get user's business with request context for session fallback
        business, method_used = get_user_business_enhanced(request.user, request)
        
        if not business:
            logger.error(f"❌ [Currency V3] No business found for user: {request.user.email}")
            return Response({
                'success': False,
                'error': 'No business associated with user',
                'debug': {
                    'user_email': request.user.email,
                    'user_id': str(request.user.id),
                    'has_business_id': hasattr(request.user, 'business_id'),
                    'has_tenant_id': hasattr(request.user, 'tenant_id')
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get country code for auto-detection
        country_code = None
        profile = UserProfile.objects.filter(user=request.user).first()
        logger.info(f"🔍 [Currency V3] Profile found: {bool(profile)}")
        if profile:
            logger.info(f"🔍 [Currency V3] Profile country: {profile.country}")
            logger.info(f"🔍 [Currency V3] Profile country type: {type(profile.country)}")
        
        if profile and profile.country:
            country_code = str(profile.country)
            logger.info(f"🌍 [Currency V3] Using profile country: {country_code}")
        else:
            # Check BusinessDetails for country
            try:
                business_details_temp = BusinessDetails.objects.filter(business=business).first()
                if business_details_temp and business_details_temp.country:
                    country_code = str(business_details_temp.country)
                    logger.info(f"🌍 [Currency V3] Using BusinessDetails country: {country_code}")
                else:
                    logger.info(f"🌍 [Currency V3] No country found in BusinessDetails")
            except Exception as e:
                logger.warning(f"⚠️ [Currency V3] Error checking BusinessDetails country: {str(e)}")
        
        # Auto-detect currency based on country
        if country_code:
            currency_info = detect_currency_for_country(country_code)
            logger.info(f"🌍 [Currency V3] Detected currency for {country_code}: {currency_info['code']}")
        else:
            currency_info = {'code': 'USD', 'name': 'US Dollar', 'symbol': '$'}
            logger.info(f"🌍 [Currency V3] No country found, defaulting to USD")
        
        # Get or create BusinessDetails with auto-detected currency
        # Build defaults dict, handling optional fields gracefully
        defaults = {
            'preferred_currency_code': currency_info['code'],
            'preferred_currency_name': currency_info['name'],
            'show_usd_on_invoices': currency_info['code'] != 'USD',
            'show_usd_on_quotes': currency_info['code'] != 'USD',
            'show_usd_on_reports': False,
            'accounting_standard': 'GAAP' if country_code == 'US' else 'IFRS'
        }
        
        # Only add preferred_currency_symbol if the field exists
        if hasattr(BusinessDetails, 'preferred_currency_symbol'):
            defaults['preferred_currency_symbol'] = currency_info['symbol']
        
        business_details, created = BusinessDetails.objects.get_or_create(
            business=business,
            defaults=defaults
        )
        
        if created:
            logger.info(f"✨ [Currency V3] Created new BusinessDetails with {currency_info['code']} for: {business.name}")
        else:
            logger.info(f"📋 [Currency V3] Found existing BusinessDetails for: {business.name}")
            # Auto-update currency for existing users if not manually changed
            if not business_details.currency_updated_at and country_code:
                updated = auto_set_currency_for_business(business_details, country_code)
                if updated:
                    logger.info(f"🔄 [Currency V3] Auto-updated currency for existing user based on country")
        
        # Handle GET request
        if request.method == 'GET':
            logger.info(f"📖 [Currency V3] Processing GET request")
            
            # Get current preferences
            current_currency = business_details.preferred_currency_code or 'USD'
            currency_info = None
            
            try:
                currency_info = get_currency_info(current_currency)
                currency_symbol = currency_info.get('symbol', '$') if currency_info else '$'
            except Exception as e:
                logger.warning(f"⚠️ [Currency V3] Could not get currency info for {current_currency}: {str(e)}")
                currency_symbol = '$'
            
            # Get currency symbol safely - use field if exists, otherwise from currency_info
            if hasattr(business_details, 'preferred_currency_symbol') and business_details.preferred_currency_symbol:
                currency_symbol = business_details.preferred_currency_symbol
            elif currency_info:
                currency_symbol = currency_info.get('symbol', '$')
            else:
                currency_symbol = '$'
                
            response_data = {
                'success': True,
                'preferences': {
                    'currency_code': current_currency,
                    'currency_name': business_details.preferred_currency_name or 'US Dollar',
                    'currency_symbol': currency_symbol,
                    'show_usd_on_invoices': getattr(business_details, 'show_usd_on_invoices', True),
                    'show_usd_on_quotes': getattr(business_details, 'show_usd_on_quotes', True),
                    'show_usd_on_reports': getattr(business_details, 'show_usd_on_reports', False),
                    'accounting_standard': getattr(business_details, 'accounting_standard', 'GAAP'),
                    'last_updated': business_details.currency_updated_at.isoformat() if hasattr(business_details, 'currency_updated_at') and business_details.currency_updated_at else None
                },
                'business': {
                    'id': str(business.id),
                    'name': business.name,
                    'country': str(business_details.country) if hasattr(business_details, 'country') and business_details.country else None
                }
            }
            
            logger.info(f"✅ [Currency V3] GET Response: {json.dumps(response_data, indent=2)}")
            return Response(response_data)
        
        # Handle PUT/POST request (POST is used by some frontend components)
        elif request.method in ['PUT', 'POST']:
            logger.info(f"✏️ [Currency V3] Processing PUT request")
            logger.info(f"✏️ [Currency V3] Request data: {json.dumps(dict(request.data), indent=2)}")
            
            with db_transaction.atomic():
                # Update currency if provided
                currency_code = request.data.get('currency_code')
                if currency_code:
                    old_currency = business_details.preferred_currency_code
                    currency_code = str(currency_code).upper().strip()
                    
                    logger.info(f"💱 [Currency V3] Currency change requested: {old_currency} → {currency_code}")
                    
                    # Get currency info
                    try:
                        currency_info = get_currency_info(currency_code)
                        if currency_info:
                            business_details.preferred_currency_code = currency_code
                            business_details.preferred_currency_name = currency_info.get('name', currency_code)
                            business_details.preferred_currency_symbol = currency_info.get('symbol', currency_code)
                            # Mark as manually updated so auto-detection won't override
                            business_details.currency_updated_at = timezone.now()
                            logger.info(f"✅ [Currency V3] Currency validated: {currency_info}")
                        else:
                            # Fallback for unknown currencies
                            business_details.preferred_currency_code = currency_code
                            business_details.preferred_currency_name = request.data.get('currency_name', f"{currency_code} Currency")
                            business_details.preferred_currency_symbol = request.data.get('currency_symbol', currency_code)
                            logger.warning(f"⚠️ [Currency V3] Unknown currency, using fallback: {currency_code}")
                    except Exception as e:
                        logger.error(f"❌ [Currency V3] Error getting currency info: {str(e)}")
                        # Use provided values as fallback
                        business_details.preferred_currency_code = currency_code
                        business_details.preferred_currency_name = request.data.get('currency_name', f"{currency_code} Currency")
                        business_details.preferred_currency_symbol = request.data.get('currency_symbol', currency_code)
                    
                    business_details.currency_updated_at = timezone.now()
                    logger.info(f"📝 [Currency V3] Currency fields updated in memory")
                
                # Update toggle preferences
                for field in ['show_usd_on_invoices', 'show_usd_on_quotes', 'show_usd_on_reports']:
                    if field in request.data:
                        old_value = getattr(business_details, field)
                        new_value = bool(request.data[field])
                        setattr(business_details, field, new_value)
                        if old_value != new_value:
                            logger.info(f"🔄 [Currency V3] Updated {field}: {old_value} → {new_value}")
                
                # Save changes
                try:
                    business_details.save()
                    logger.info(f"💾 [Currency V3] BusinessDetails saved successfully")
                    logger.info(f"💾 [Currency V3] Final state: currency={business_details.preferred_currency_code}, "
                              f"name={business_details.preferred_currency_name}, "
                              f"symbol={business_details.preferred_currency_symbol}")
                except Exception as save_error:
                    logger.error(f"❌ [Currency V3] Failed to save BusinessDetails: {str(save_error)}")
                    logger.error(traceback.format_exc())
                    raise
            
            # Build response
            response_data = {
                'success': True,
                'message': 'Currency preferences updated successfully',
                'preferences': {
                    'currency_code': business_details.preferred_currency_code,
                    'currency_name': business_details.preferred_currency_name,
                    'currency_symbol': business_details.preferred_currency_symbol or '$',
                    'show_usd_on_invoices': business_details.show_usd_on_invoices,
                    'show_usd_on_quotes': business_details.show_usd_on_quotes,
                    'show_usd_on_reports': business_details.show_usd_on_reports,
                    'accounting_standard': getattr(business_details, 'accounting_standard', 'GAAP'),
                    'last_updated': business_details.currency_updated_at.isoformat() if business_details.currency_updated_at else None
                },
                'change_summary': {
                    'previous_currency': request.data.get('previous_currency'),
                    'new_currency': business_details.preferred_currency_code,
                    'updated_by': request.user.email,
                    'updated_at': timezone.now().isoformat()
                }
            }
            
            logger.info(f"✅ [Currency V3] PUT Response: {json.dumps(response_data, indent=2)}")
            logger.info(f"🌟 [Currency V3] ========== {request.method} REQUEST SUCCESS ==========")
            return Response(response_data)
    
    except Exception as e:
        logger.error(f"💥 [Currency V3] ========== UNEXPECTED ERROR ==========")
        logger.error(f"💥 [Currency V3] Error type: {type(e).__name__}")
        logger.error(f"💥 [Currency V3] Error message: {str(e)}")
        logger.error(f"💥 [Currency V3] Traceback:\n{traceback.format_exc()}")
        
        return Response({
            'success': False,
            'error': 'An unexpected error occurred',
            'error_type': type(e).__name__,
            'error_details': str(e) if settings.DEBUG else None,
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def currency_health_check(request):
    """Health check endpoint for currency API"""
    logger.info("🏥 [Currency V3] Health check requested")
    
    try:
        # Test database connection
        business_count = Business.objects.count()
        
        # Test currency data
        currencies = get_currency_list()
        ssp_info = get_currency_info('SSP')
        
        health_data = {
            'success': True,
            'status': 'healthy',
            'timestamp': timezone.now().isoformat(),
            'checks': {
                'database': 'connected',
                'business_count': business_count,
                'currency_data': 'available',
                'total_currencies': len(currencies),
                'ssp_currency': bool(ssp_info)
            },
            'api_version': 'v3',
            'debug_mode': settings.DEBUG
        }
        
        logger.info(f"🏥 [Currency V3] Health check passed: {json.dumps(health_data, indent=2)}")
        return Response(health_data)
        
    except Exception as e:
        logger.error(f"🏥 [Currency V3] Health check failed: {str(e)}")
        return Response({
            'success': False,
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)