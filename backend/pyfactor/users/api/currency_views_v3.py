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
from django.db import transaction
from django.conf import settings
from users.models import Business, BusinessDetails, UserProfile
from currency.currency_data import get_currency_info, get_currency_list

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

def get_user_business(user):
    """Get business for user with multiple fallback methods"""
    logger.info(f"🔍 [Currency V3] Getting business for user: {user.email}")
    
    business_id = None
    method_used = None
    
    # Method 1: Direct business_id attribute
    if hasattr(user, 'business_id') and user.business_id:
        business_id = user.business_id
        method_used = 'direct_business_id'
        logger.info(f"🔍 [Currency V3] Found business_id on user object: {business_id}")
    
    # Method 2: Tenant ID (often same as business_id)
    elif hasattr(user, 'tenant_id') and user.tenant_id:
        business_id = user.tenant_id
        method_used = 'tenant_id'
        logger.info(f"🔍 [Currency V3] Using tenant_id as business_id: {business_id}")
    
    # Method 3: UserProfile lookup
    else:
        try:
            profile = UserProfile.objects.filter(user=user).first()
            if profile and hasattr(profile, 'business_id') and profile.business_id:
                business_id = profile.business_id
                method_used = 'user_profile'
                logger.info(f"🔍 [Currency V3] Found business_id via UserProfile: {business_id}")
            else:
                logger.warning(f"🔍 [Currency V3] No UserProfile or business_id for user: {user.email}")
        except Exception as e:
            logger.error(f"🔍 [Currency V3] Error querying UserProfile: {str(e)}")
    
    if not business_id:
        logger.error(f"🔍 [Currency V3] No business_id found for user {user.email}")
        return None, None
    
    # Get the Business object
    try:
        business = Business.objects.get(id=business_id)
        logger.info(f"✅ [Currency V3] Business found: {business.name} (ID: {business.id}) via {method_used}")
        return business, method_used
    except Business.DoesNotExist:
        logger.error(f"❌ [Currency V3] Business not found with ID: {business_id}")
        return None, None
    except Exception as e:
        logger.error(f"❌ [Currency V3] Error fetching business: {str(e)}")
        return None, None

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def currency_preferences_v3(request):
    """
    Get or update currency preferences with comprehensive logging
    """
    log_request_details(request, request.method)
    
    try:
        # Get user's business
        business, method_used = get_user_business(request.user)
        
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
        
        # Get or create BusinessDetails
        business_details, created = BusinessDetails.objects.get_or_create(
            business=business,
            defaults={
                'preferred_currency_code': 'USD',
                'preferred_currency_name': 'US Dollar',
                'preferred_currency_symbol': '$',
                'show_usd_on_invoices': True,
                'show_usd_on_quotes': True,
                'show_usd_on_reports': False,
                'accounting_standard': 'GAAP' if business.country == 'US' else 'IFRS'
            }
        )
        
        if created:
            logger.info(f"✨ [Currency V3] Created new BusinessDetails for: {business.name}")
        else:
            logger.info(f"📋 [Currency V3] Found existing BusinessDetails for: {business.name}")
        
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
            
            response_data = {
                'success': True,
                'preferences': {
                    'currency_code': current_currency,
                    'currency_name': business_details.preferred_currency_name or 'US Dollar',
                    'currency_symbol': currency_symbol,
                    'show_usd_on_invoices': business_details.show_usd_on_invoices,
                    'show_usd_on_quotes': business_details.show_usd_on_quotes,
                    'show_usd_on_reports': business_details.show_usd_on_reports,
                    'accounting_standard': getattr(business_details, 'accounting_standard', 'GAAP'),
                    'last_updated': business_details.currency_updated_at.isoformat() if business_details.currency_updated_at else None
                },
                'business': {
                    'id': str(business.id),
                    'name': business.name,
                    'country': business.country
                }
            }
            
            logger.info(f"✅ [Currency V3] GET Response: {json.dumps(response_data, indent=2)}")
            return Response(response_data)
        
        # Handle PUT request
        elif request.method == 'PUT':
            logger.info(f"✏️ [Currency V3] Processing PUT request")
            logger.info(f"✏️ [Currency V3] Request data: {json.dumps(dict(request.data), indent=2)}")
            
            with transaction.atomic():
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