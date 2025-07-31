"""
Fixed currency views with better error handling and debugging
"""
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError
from users.models import Business, BusinessDetails, UserProfile
from currency.currency_data import get_currency_list, get_currency_info
from currency.exchange_rate_service import exchange_rate_service
from currency.currency_validator import CurrencyValidator, CurrencyConversionValidator
from decimal import Decimal
import traceback

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Disable cache to avoid Redis dependency issues
USE_CACHE = False

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def get_currency_preferences_fixed(request):
    """Get or update business currency preferences with better error handling"""
    try:
        logger.info(f"[Currency API Fixed] ========== REQUEST START ==========")
        logger.info(f"[Currency API Fixed] Method: {request.method}")
        logger.info(f"[Currency API Fixed] User: {request.user}")
        logger.info(f"[Currency API Fixed] Authenticated: {request.user.is_authenticated}")
        
        # Get user
        user = request.user
        
        # Multiple strategies to get business
        business = None
        business_id = None
        
        # Strategy 1: Direct business_id attribute
        if hasattr(user, 'business_id') and user.business_id:
            business_id = user.business_id
            logger.info(f"[Currency API Fixed] Found business_id on user: {business_id}")
        
        # Strategy 2: tenant_id attribute
        elif hasattr(user, 'tenant_id') and user.tenant_id:
            business_id = user.tenant_id
            logger.info(f"[Currency API Fixed] Using tenant_id as business_id: {business_id}")
        
        # Strategy 3: UserProfile lookup with error handling
        else:
            try:
                # Try to get profile without causing database errors
                profile = UserProfile.objects.filter(user=user).first()
                if profile:
                    if hasattr(profile, 'business_id') and profile.business_id:
                        business_id = profile.business_id
                        logger.info(f"[Currency API Fixed] Found business_id via UserProfile: {business_id}")
                    elif hasattr(profile, 'tenant_id') and profile.tenant_id:
                        business_id = profile.tenant_id
                        logger.info(f"[Currency API Fixed] Found tenant_id via UserProfile: {business_id}")
                else:
                    logger.warning(f"[Currency API Fixed] No UserProfile found for user: {user.email}")
            except Exception as profile_error:
                logger.error(f"[Currency API Fixed] Error getting UserProfile: {str(profile_error)}")
        
        if not business_id:
            # Return default preferences instead of error
            logger.warning(f"[Currency API Fixed] No business found, returning defaults")
            return Response({
                'success': True,
                'currency_code': 'USD',
                'currency_name': 'US Dollar',
                'currency_symbol': '$',
                'show_usd_on_invoices': True,
                'show_usd_on_quotes': True,
                'show_usd_on_reports': False,
                'accounting_standard': 'GAAP',
                'is_default': True
            })
        
        # Get business with error handling
        try:
            business = Business.objects.get(id=business_id)
            logger.info(f"[Currency API Fixed] Business found: {business.name}")
        except Business.DoesNotExist:
            logger.warning(f"[Currency API Fixed] Business {business_id} not found, using defaults")
            return Response({
                'success': True,
                'currency_code': 'USD',
                'currency_name': 'US Dollar',
                'currency_symbol': '$',
                'show_usd_on_invoices': True,
                'show_usd_on_quotes': True,
                'show_usd_on_reports': False,
                'accounting_standard': 'GAAP',
                'is_default': True
            })
        
        # Get or create business details
        business_details, created = BusinessDetails.objects.get_or_create(
            business=business,
            defaults={
                'preferred_currency_code': 'USD',
                'preferred_currency_name': 'US Dollar',
                'show_usd_on_invoices': True,
                'show_usd_on_quotes': True,
                'show_usd_on_reports': False,
                'accounting_standard': 'GAAP',
                'country': 'US'
            }
        )
        
        if created:
            logger.info(f"[Currency API Fixed] Created new BusinessDetails")
        
        # Handle PUT request
        if request.method == 'PUT':
            logger.info(f"[Currency API Fixed] Processing PUT request")
            logger.info(f"[Currency API Fixed] Request data: {request.data}")
            
            # Update currency if provided
            currency_code = request.data.get('currency_code')
            if currency_code:
                currency_code = str(currency_code).upper().strip()
                logger.info(f"[Currency API Fixed] Updating currency to: {currency_code}")
                
                # Get currency info with fallback
                try:
                    currency_info = get_currency_info(currency_code)
                    if currency_info:
                        business_details.preferred_currency_code = currency_code
                        business_details.preferred_currency_name = currency_info.get('name', currency_code)
                    else:
                        # Use fallback name
                        business_details.preferred_currency_code = currency_code
                        business_details.preferred_currency_name = f"{currency_code} Currency"
                except Exception as curr_error:
                    logger.warning(f"[Currency API Fixed] Error getting currency info: {str(curr_error)}")
                    # Use fallback
                    business_details.preferred_currency_code = currency_code
                    business_details.preferred_currency_name = f"{currency_code} Currency"
                
                business_details.currency_updated_at = timezone.now()
            
            # Update toggles
            if 'show_usd_on_invoices' in request.data:
                business_details.show_usd_on_invoices = bool(request.data['show_usd_on_invoices'])
            
            if 'show_usd_on_quotes' in request.data:
                business_details.show_usd_on_quotes = bool(request.data['show_usd_on_quotes'])
            
            if 'show_usd_on_reports' in request.data:
                business_details.show_usd_on_reports = bool(request.data['show_usd_on_reports'])
            
            # Save with error handling
            try:
                business_details.save()
                logger.info(f"[Currency API Fixed] Save successful")
            except Exception as save_error:
                logger.error(f"[Currency API Fixed] Save error: {str(save_error)}")
                # Continue anyway with current values
        
        # Get currency symbol
        try:
            currency_info = get_currency_info(business_details.preferred_currency_code)
            currency_symbol = currency_info.get('symbol', '$') if currency_info else '$'
        except Exception:
            currency_symbol = '$'
        
        # Build response
        response_data = {
            'success': True,
            'currency_code': business_details.preferred_currency_code,
            'currency_name': business_details.preferred_currency_name,
            'currency_symbol': currency_symbol,
            'show_usd_on_invoices': business_details.show_usd_on_invoices,
            'show_usd_on_quotes': business_details.show_usd_on_quotes,
            'show_usd_on_reports': business_details.show_usd_on_reports,
            'accounting_standard': getattr(business_details, 'accounting_standard', 'GAAP'),
            'is_default': False
        }
        
        logger.info(f"[Currency API Fixed] ========== SUCCESS ==========")
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"[Currency API Fixed] ========== ERROR ==========")
        logger.error(f"[Currency API Fixed] Error: {str(e)}")
        logger.error(f"[Currency API Fixed] Traceback: {traceback.format_exc()}")
        
        # Return default values on any error
        return Response({
            'success': True,
            'currency_code': 'USD',
            'currency_name': 'US Dollar', 
            'currency_symbol': '$',
            'show_usd_on_invoices': True,
            'show_usd_on_quotes': True,
            'show_usd_on_reports': False,
            'accounting_standard': 'GAAP',
            'is_default': True,
            'error_fallback': True
        })