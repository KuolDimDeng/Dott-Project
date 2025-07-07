"""
API endpoint for getting available payment methods based on country
"""
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from users.mobile_money_models import MobileMoneyCountry
from users.models import Business, UserProfile

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_methods(request):
    """
    Get available payment methods for the user's business country
    
    Returns:
    {
        "country_code": "KE",
        "payment_methods": [
            {
                "id": "card",
                "name": "Credit/Debit Card",
                "provider": "stripe",
                "icon": "credit-card",
                "description": "Pay with Visa, Mastercard, or other cards"
            },
            {
                "id": "mobile_money",
                "name": "Mobile Money (M-Pesa)",
                "provider": "paystack",
                "icon": "phone",
                "description": "Pay with M-Pesa",
                "currency": "KES",
                "providers": ["M-Pesa"]
            }
        ]
    }
    """
    try:
        # Get user's business country
        country_code = 'US'  # Default
        
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            if user_profile.business:
                business = user_profile.business
                # Try to get country from business details
                if hasattr(business, 'details') and business.details:
                    country_code = business.details.country
        except (UserProfile.DoesNotExist, AttributeError):
            logger.warning(f"No business found for user {request.user.id}")
        
        # Get available payment methods for the country
        payment_methods = MobileMoneyCountry.get_payment_methods(country_code)
        
        return Response({
            'country_code': country_code,
            'payment_methods': payment_methods
        })
        
    except Exception as e:
        logger.error(f"Error getting payment methods: {str(e)}")
        return Response({
            'error': 'Failed to get payment methods'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([])  # Public endpoint
def check_mobile_money_support(request):
    """
    Check if a country supports mobile money payments
    
    Query params:
    - country: 2-letter country code
    
    Returns:
    {
        "country_code": "KE",
        "supports_mobile_money": true,
        "providers": ["M-Pesa"],
        "currency": "KES"
    }
    """
    country_code = request.GET.get('country', '').upper()
    
    if not country_code:
        return Response({
            'error': 'Country code is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        mm_country = MobileMoneyCountry.objects.get(
            country_code=country_code,
            is_active=True,
            paystack_enabled=True
        )
        
        return Response({
            'country_code': country_code,
            'supports_mobile_money': True,
            'providers': mm_country.providers,
            'currency': mm_country.currency_code,
            'display_name': mm_country.display_name,
            'is_beta': mm_country.is_beta
        })
    except MobileMoneyCountry.DoesNotExist:
        return Response({
            'country_code': country_code,
            'supports_mobile_money': False,
            'providers': [],
            'currency': None
        })