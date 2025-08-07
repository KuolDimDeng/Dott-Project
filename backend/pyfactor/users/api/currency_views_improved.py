"""
Improved currency preferences API using consolidated business model.
Maintains RLS/multi-tenant architecture.
"""

import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction

# Use the new business utilities
from users.business_utils import get_user_business, get_business_currency
from currency.currency_data import get_currency_info
from currency.currency_detection import detect_currency_for_country

logger = logging.getLogger(__name__)


@api_view(['GET', 'PUT', 'POST'])
@permission_classes([IsAuthenticated])
def currency_preferences(request):
    """
    Get or update currency preferences (improved version).
    Uses consolidated business model with proper relationships.
    """
    logger.info(f"🌟 [Currency API] {request.method} request from {request.user.email}")
    
    try:
        # Get user's business using improved utility
        business = get_user_business(request.user)
        
        if not business:
            logger.error(f"❌ [Currency API] No business found for user: {request.user.email}")
            return Response({
                'success': False,
                'error': 'No business associated with user',
                'preferences': None
            }, status=status.HTTP_404_NOT_FOUND)
        
        logger.info(f"✅ [Currency API] Found business: {business.name} (ID: {business.id})")
        
        if request.method == 'GET':
            # Return current currency preferences
            currency_data = get_business_currency(business)
            
            response_data = {
                'success': True,
                'preferences': {
                    'currency_code': currency_data['code'],
                    'currency_name': currency_data['name'],
                    'currency_symbol': currency_data['symbol'],
                    'last_updated': business.currency_updated_at.isoformat() if business.currency_updated_at else None
                },
                'business': {
                    'id': str(business.id),
                    'name': business.name,
                    'country': str(business.country) if business.country else None,
                    'type': business.business_type,
                    'is_tenant': business.tenant_id == business.id  # Verify RLS setup
                }
            }
            
            logger.info(f"✅ [Currency API] Returning preferences: {currency_data['code']}")
            return Response(response_data)
        
        elif request.method in ['PUT', 'POST']:
            # Update currency preferences
            with transaction.atomic():
                currency_code = request.data.get('currency_code')
                
                if not currency_code:
                    return Response({
                        'success': False,
                        'error': 'currency_code is required'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                currency_code = currency_code.upper().strip()
                
                # Get currency info
                currency_info = get_currency_info(currency_code)
                if not currency_info:
                    # Try to use provided values as fallback
                    currency_info = {
                        'code': currency_code,
                        'name': request.data.get('currency_name', f'{currency_code} Currency'),
                        'symbol': request.data.get('currency_symbol', currency_code)
                    }
                
                # Update business currency
                old_currency = business.preferred_currency_code
                business.preferred_currency_code = currency_info['code']
                business.preferred_currency_name = currency_info['name']
                business.preferred_currency_symbol = currency_info['symbol']
                business.currency_updated_at = timezone.now()
                
                # Save changes
                business.save(update_fields=[
                    'preferred_currency_code',
                    'preferred_currency_name', 
                    'preferred_currency_symbol',
                    'currency_updated_at'
                ])
                
                logger.info(f"💱 [Currency API] Updated currency: {old_currency} → {currency_info['code']}")
                
                # Clear cache to ensure fresh data
                from users.business_utils import invalidate_business_cache
                invalidate_business_cache(business)
                
                return Response({
                    'success': True,
                    'message': 'Currency preferences updated successfully',
                    'preferences': {
                        'currency_code': currency_info['code'],
                        'currency_name': currency_info['name'],
                        'currency_symbol': currency_info['symbol'],
                        'last_updated': business.currency_updated_at.isoformat()
                    },
                    'change_summary': {
                        'previous': old_currency,
                        'new': currency_info['code'],
                        'updated_by': request.user.email,
                        'updated_at': timezone.now().isoformat()
                    }
                })
    
    except Exception as e:
        logger.error(f"💥 [Currency API] Error: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': 'An error occurred while processing your request',
            'preferences': None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auto_detect_currency(request):
    """
    Auto-detect and set currency based on business country.
    """
    try:
        business = get_user_business(request.user)
        
        if not business:
            return Response({
                'success': False,
                'error': 'No business found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if not business.country:
            return Response({
                'success': False,
                'error': 'Business country not set'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Detect currency for country
        currency_info = detect_currency_for_country(str(business.country))
        
        if currency_info:
            # Update business currency
            business.preferred_currency_code = currency_info['code']
            business.preferred_currency_name = currency_info['name']
            business.preferred_currency_symbol = currency_info['symbol']
            # Don't set currency_updated_at for auto-detection
            business.save(update_fields=[
                'preferred_currency_code',
                'preferred_currency_name',
                'preferred_currency_symbol'
            ])
            
            logger.info(f"🌍 [Currency API] Auto-detected {currency_info['code']} for {business.country}")
            
            return Response({
                'success': True,
                'message': f"Currency auto-detected for {business.country}",
                'currency': currency_info
            })
        
        return Response({
            'success': False,
            'error': f'Could not detect currency for {business.country}'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"Error in auto_detect_currency: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': 'Failed to auto-detect currency'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)