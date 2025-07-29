"""
API views for currency preferences management
"""
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from users.models import BusinessDetails
from currency.currency_data import get_currency_list, get_currency_info
from currency.exchange_rate_service import exchange_rate_service
from decimal import Decimal

logger = logging.getLogger(__name__)


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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_currency_preferences(request):
    """Get current business currency preferences"""
    try:
        user = request.user
        business = user.profile.business
        
        if not business:
            return Response({
                'success': False,
                'error': 'No business associated with user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create business details
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
        
        # Get currency info
        currency_info = get_currency_info(business_details.preferred_currency_code)
        
        return Response({
            'success': True,
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
        logger.error(f"Error fetching currency preferences: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': 'Failed to fetch currency preferences'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_currency_preferences(request):
    """Update business currency preferences"""
    try:
        user = request.user
        business = user.profile.business
        
        if not business:
            return Response({
                'success': False,
                'error': 'No business associated with user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user is owner or admin
        if user.role not in ['OWNER', 'ADMIN']:
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
    try:
        from_currency = request.data.get('from_currency', 'USD')
        to_currency = request.data.get('to_currency', 'USD')
        amount = request.data.get('amount', 1)
        
        # Convert amount to Decimal
        try:
            amount = Decimal(str(amount))
        except:
            return Response({
                'success': False,
                'error': 'Invalid amount'
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