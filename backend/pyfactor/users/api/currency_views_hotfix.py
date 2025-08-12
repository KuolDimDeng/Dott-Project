"""
DEPRECATED - Hotfix for currency preferences API
This was a temporary fix. The permanent solution is now in place:
- business_utils.py has been fixed to not use select_related on owner
- Business model has get_owner() method to handle schema mismatch
- Using currency_views_v3.py is now safe

This file is kept for reference only. DO NOT USE.
"""

import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from users.models import Business, BusinessDetails
from currency.currency_data import get_currency_info

logger = logging.getLogger(__name__)


@api_view(['GET', 'PUT', 'POST'])
@permission_classes([IsAuthenticated])
def currency_preferences_hotfix(request):
    """
    Hotfix version that directly queries business without problematic utilities
    """
    logger.info(f"[Currency Hotfix] {request.method} request from {request.user.email}")
    
    try:
        # Direct query for business
        business = None
        
        # Method 1: User.business_id
        if hasattr(request.user, 'business_id') and request.user.business_id:
            try:
                business = Business.objects.get(
                    id=request.user.business_id,
                    is_active=True
                )
                logger.info(f"[Currency Hotfix] Found business via business_id: {business.name}")
            except Business.DoesNotExist:
                pass
        
        # Method 2: User.tenant_id
        if not business and hasattr(request.user, 'tenant_id') and request.user.tenant_id:
            try:
                business = Business.objects.get(
                    id=request.user.tenant_id,
                    is_active=True
                )
                logger.info(f"[Currency Hotfix] Found business via tenant_id: {business.name}")
            except Business.DoesNotExist:
                pass
        
        if not business:
            logger.error(f"[Currency Hotfix] No business found for {request.user.email}")
            return Response({
                'success': False,
                'error': 'No business associated with user',
                'preferences': None
            }, status=status.HTTP_404_NOT_FOUND)
        
        if request.method == 'GET':
            # Return currency preferences
            response_data = {
                'success': True,
                'preferences': {
                    'currency_code': business.preferred_currency_code or 'USD',
                    'currency_name': business.preferred_currency_name or 'US Dollar',
                    'currency_symbol': business.preferred_currency_symbol or '$',
                    'last_updated': business.currency_updated_at.isoformat() if business.currency_updated_at else None
                },
                'business': {
                    'id': str(business.id),
                    'name': business.name,
                    'country': str(business.country) if business.country else None
                }
            }
            
            logger.info(f"[Currency Hotfix] Returning {business.preferred_currency_code} for {business.name}")
            return Response(response_data)
        
        elif request.method in ['PUT', 'POST']:
            # Update currency
            currency_code = request.data.get('currency_code')
            if currency_code:
                currency_code = currency_code.upper().strip()
                currency_info = get_currency_info(currency_code)
                
                if currency_info:
                    business.preferred_currency_code = currency_info['code']
                    business.preferred_currency_name = currency_info['name']
                    business.preferred_currency_symbol = currency_info['symbol']
                else:
                    business.preferred_currency_code = currency_code
                    business.preferred_currency_name = request.data.get('currency_name', currency_code)
                    business.preferred_currency_symbol = request.data.get('currency_symbol', currency_code)
                
                business.currency_updated_at = timezone.now()
                business.save()
                
                # Also update BusinessDetails for backward compatibility
                try:
                    details = BusinessDetails.objects.filter(business=business).first()
                    if details:
                        details.preferred_currency_code = business.preferred_currency_code
                        details.preferred_currency_name = business.preferred_currency_name
                        details.preferred_currency_symbol = business.preferred_currency_symbol
                        details.currency_updated_at = business.currency_updated_at
                        details.save()
                except Exception as e:
                    logger.debug(f"Could not update BusinessDetails: {e}")
                
                logger.info(f"[Currency Hotfix] Updated currency to {business.preferred_currency_code}")
                
                return Response({
                    'success': True,
                    'message': 'Currency preferences updated',
                    'preferences': {
                        'currency_code': business.preferred_currency_code,
                        'currency_name': business.preferred_currency_name,
                        'currency_symbol': business.preferred_currency_symbol,
                        'last_updated': business.currency_updated_at.isoformat()
                    }
                })
            
            return Response({
                'success': False,
                'error': 'currency_code is required'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        logger.error(f"[Currency Hotfix] Error: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': 'An error occurred',
            'preferences': None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)