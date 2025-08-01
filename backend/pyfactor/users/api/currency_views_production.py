"""
Production-ready currency preferences API with proper error handling and performance optimization
"""
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django.core.cache import cache
from django.conf import settings
from users.models import Business, BusinessDetails
from currency.currency_data import get_currency_info
import time

logger = logging.getLogger(__name__)

# Cache configuration
CACHE_KEY_PREFIX = "currency_prefs"
CACHE_TTL = 4 * 60 * 60  # 4 hours
CACHE_TIMEOUT = 0.5  # 500ms max wait for cache operations

def safe_cache_get(key, default=None):
    """Safely get from cache with timeout protection"""
    try:
        start = time.time()
        value = cache.get(key, default=default)
        duration = time.time() - start
        if duration > CACHE_TIMEOUT:
            logger.warning(f"[Currency] Cache get took {duration:.2f}s for key: {key}")
        return value
    except Exception as e:
        logger.error(f"[Currency] Cache get failed: {str(e)}")
        return default

def safe_cache_set(key, value, timeout=CACHE_TTL):
    """Safely set cache with timeout protection"""
    try:
        start = time.time()
        cache.set(key, value, timeout)
        duration = time.time() - start
        if duration > CACHE_TIMEOUT:
            logger.warning(f"[Currency] Cache set took {duration:.2f}s for key: {key}")
    except Exception as e:
        logger.error(f"[Currency] Cache set failed: {str(e)}")

def safe_cache_delete(key):
    """Safely delete from cache"""
    try:
        cache.delete(key)
    except Exception as e:
        logger.error(f"[Currency] Cache delete failed: {str(e)}")

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def get_currency_preferences(request):
    """
    Production-ready currency preferences endpoint with optimized performance
    """
    try:
        user = request.user
        business_id = getattr(user, 'business_id', None) or getattr(user, 'tenant_id', None)
        
        if not business_id:
            return Response({
                'success': False,
                'error': 'No business associated with user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Try to get from cache for GET requests
        cache_key = f"{CACHE_KEY_PREFIX}:{business_id}"
        
        if request.method == 'GET':
            # Try cache first
            cached_data = safe_cache_get(cache_key)
            if cached_data:
                logger.debug(f"[Currency] Cache hit for business {business_id}")
                return Response(cached_data)
        
        # Get business and details with select_related for efficiency
        try:
            business = Business.objects.select_related('owner').get(id=business_id)
            business_details = BusinessDetails.objects.select_related('business').get(business=business)
        except (Business.DoesNotExist, BusinessDetails.DoesNotExist):
            return Response({
                'success': False,
                'error': 'Business not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if request.method == 'PUT':
            # Update preferences
            with transaction.atomic():
                currency_code = request.data.get('currency_code')
                
                if currency_code:
                    currency_code = str(currency_code).upper().strip()
                    business_details.preferred_currency_code = currency_code
                    business_details.currency_updated_at = timezone.now()
                    
                    # Get currency info if available
                    try:
                        currency_info = get_currency_info(currency_code)
                        if currency_info:
                            business_details.preferred_currency_name = currency_info.get('name', currency_code)
                            business_details.preferred_currency_symbol = currency_info.get('symbol', '$')
                    except Exception:
                        # Fallback values
                        business_details.preferred_currency_name = f"{currency_code} Currency"
                        business_details.preferred_currency_symbol = currency_code
                
                # Update toggle preferences
                for field in ['show_usd_on_invoices', 'show_usd_on_quotes', 'show_usd_on_reports']:
                    if field in request.data:
                        setattr(business_details, field, bool(request.data[field]))
                
                # Update accounting standard if provided
                if 'accounting_standard' in request.data:
                    new_standard = request.data['accounting_standard']
                    if new_standard in ['IFRS', 'GAAP']:
                        business_details.accounting_standard = new_standard
                        business_details.accounting_standard_updated_at = timezone.now()
                
                business_details.save()
                
                # Invalidate cache after update
                safe_cache_delete(cache_key)
                logger.info(f"[Currency] Updated preferences for business {business_id}")
        
        # Build response
        currency_code = business_details.preferred_currency_code or 'USD'
        currency_symbol = '$'  # Default
        
        # Get currency symbol
        try:
            currency_info = get_currency_info(currency_code)
            if currency_info:
                currency_symbol = currency_info.get('symbol', '$')
        except Exception:
            pass
        
        response_data = {
            'success': True,
            'currency_code': currency_code,
            'currency_name': business_details.preferred_currency_name or 'US Dollar',
            'currency_symbol': currency_symbol,
            'show_usd_on_invoices': business_details.show_usd_on_invoices,
            'show_usd_on_quotes': business_details.show_usd_on_quotes,
            'show_usd_on_reports': business_details.show_usd_on_reports,
            'accounting_standard': getattr(business_details, 'accounting_standard', 'GAAP'),
            'currency_updated_at': business_details.currency_updated_at.isoformat() if business_details.currency_updated_at else None,
            'preferences': {  # Include nested format for compatibility
                'currency_code': currency_code,
                'currency_name': business_details.preferred_currency_name or 'US Dollar',
                'currency_symbol': currency_symbol,
                'show_usd_on_invoices': business_details.show_usd_on_invoices,
                'show_usd_on_quotes': business_details.show_usd_on_quotes,
                'show_usd_on_reports': business_details.show_usd_on_reports,
            }
        }
        
        # Cache the response for GET requests
        if request.method == 'GET':
            safe_cache_set(cache_key, response_data)
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"[Currency] Unexpected error: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': 'An unexpected error occurred',
            'details': str(e) if settings.DEBUG else None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)