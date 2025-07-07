"""
View for checking discount eligibility during onboarding
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from users.models import Business, BusinessDetails
from users.discount_service import DiscountVerificationService
from users.discount_models import DevelopingCountry


logger = logging.getLogger(__name__)


class CheckDiscountEligibilityView(APIView):
    """
    Check if business is eligible for regional discount based on country
    Called after business details are saved during onboarding
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Check discount eligibility based on business country
        
        Expected data:
        {
            "business_id": "uuid",
            "country": "KE"  # 2-letter country code
        }
        """
        try:
            business_id = request.data.get('business_id')
            country_code = request.data.get('country')
            
            if not business_id or not country_code:
                return Response({
                    'error': 'Business ID and country are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get business
            try:
                business = Business.objects.get(
                    id=business_id,
                    owner_id=request.user.id
                )
            except Business.DoesNotExist:
                return Response({
                    'error': 'Business not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check discount eligibility
            eligible, discount_percentage, needs_verification = (
                DiscountVerificationService.check_discount_eligibility(
                    country_code, 
                    request
                )
            )
            
            # Apply discount if eligible
            if eligible:
                with transaction.atomic():
                    # Apply discount to business
                    success, discount = DiscountVerificationService.apply_discount_to_business(
                        business, 
                        country_code, 
                        request
                    )
                    
                    # Get country name for display
                    try:
                        country = DevelopingCountry.objects.get(
                            country_code=country_code.upper(),
                            is_active=True
                        )
                        country_name = country.country_name
                    except DevelopingCountry.DoesNotExist:
                        country_name = country_code
                    
                    response_data = {
                        'eligible': True,
                        'discount_percentage': discount,
                        'country_name': country_name,
                        'needs_verification': needs_verification,
                        'message': f'Congratulations! You qualify for a {discount}% regional discount.'
                    }
                    
                    if needs_verification:
                        response_data['verification_message'] = (
                            'Your discount has been applied provisionally. '
                            'We may ask for verification within 30 days.'
                        )
                    
                    logger.info(
                        f"Applied {discount}% discount to business {business.name} "
                        f"(country: {country_code})"
                    )
                    
                    return Response(response_data, status=status.HTTP_200_OK)
            else:
                return Response({
                    'eligible': False,
                    'discount_percentage': 0,
                    'message': 'Your country is not eligible for regional pricing.'
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error checking discount eligibility: {str(e)}")
            return Response({
                'error': 'An error occurred checking discount eligibility'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GetPricingForCountryView(APIView):
    """
    Get pricing information for a specific country
    Used on landing page and pricing pages
    """
    permission_classes = []  # Public endpoint
    
    def get(self, request):
        """
        Get pricing based on IP geolocation or provided country
        
        Query params:
        - country: 2-letter country code (optional)
        """
        try:
            # First try to get country from query param
            country_code = request.GET.get('country')
            
            # If not provided, get from IP
            if not country_code:
                ip_address = DiscountVerificationService.get_client_ip(request)
                country_code = DiscountVerificationService.get_country_from_ip(ip_address)
            
            if not country_code:
                # Default to US pricing
                country_code = 'US'
            
            # Check if eligible for discount
            discount = DevelopingCountry.get_discount(country_code)
            
            # Calculate prices
            if discount > 0:
                professional_monthly = 7.50  # $15 * 0.5
                professional_six_month = 39.00  # $78 * 0.5
                professional_yearly = 72.00  # $144 * 0.5
                enterprise_monthly = 22.50   # $45 * 0.5
                enterprise_six_month = 117.00  # $234 * 0.5
                enterprise_yearly = 216.00   # $432 * 0.5
            else:
                professional_monthly = 15.00
                professional_six_month = 78.00
                professional_yearly = 144.00
                enterprise_monthly = 45.00
                enterprise_six_month = 234.00
                enterprise_yearly = 432.00
            
            return Response({
                'country_code': country_code.upper(),
                'discount_percentage': discount,
                'pricing': {
                    'professional': {
                        'monthly': professional_monthly,
                        'six_month': professional_six_month,
                        'yearly': professional_yearly,
                        'monthly_display': f'${professional_monthly:.2f}',
                        'six_month_display': f'${professional_six_month:.2f}',
                        'yearly_display': f'${professional_yearly:.2f}'
                    },
                    'enterprise': {
                        'monthly': enterprise_monthly,
                        'six_month': enterprise_six_month,
                        'yearly': enterprise_yearly,
                        'monthly_display': f'${enterprise_monthly:.2f}',
                        'six_month_display': f'${enterprise_six_month:.2f}',
                        'yearly_display': f'${enterprise_yearly:.2f}'
                    }
                },
                'original_pricing': {
                    'professional': {
                        'monthly': 15.00,
                        'six_month': 78.00,
                        'yearly': 144.00
                    },
                    'enterprise': {
                        'monthly': 45.00,
                        'six_month': 234.00,
                        'yearly': 432.00
                    }
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting pricing for country: {str(e)}")
            # Return default US pricing on error
            return Response({
                'country_code': 'US',
                'discount_percentage': 0,
                'pricing': {
                    'professional': {
                        'monthly': 15.00,
                        'six_month': 78.00,
                        'yearly': 144.00,
                        'monthly_display': '$15.00',
                        'six_month_display': '$78.00',
                        'yearly_display': '$144.00'
                    },
                    'enterprise': {
                        'monthly': 45.00,
                        'six_month': 234.00,
                        'yearly': 432.00,
                        'monthly_display': '$45.00',
                        'six_month_display': '$234.00',
                        'yearly_display': '$432.00'
                    }
                }
            }, status=status.HTTP_200_OK)