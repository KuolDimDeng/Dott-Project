"""
Debug view for Kenya pricing issues
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from users.discount_models import DevelopingCountry

logger = logging.getLogger(__name__)


class DebugKenyaPricingView(APIView):
    """
    Debug endpoint to check Kenya pricing configuration
    """
    permission_classes = []  # Public endpoint for debugging
    
    def get(self, request):
        """
        Debug Kenya pricing issues
        """
        logger.info("=== DEBUG KENYA PRICING ===")
        
        # Check if Kenya is in database
        kenya = DevelopingCountry.objects.filter(country_code='KE').first()
        
        # Get discount
        discount = DevelopingCountry.get_discount('KE')
        
        # Get all African countries
        african_countries = DevelopingCountry.objects.filter(
            country_code__in=['KE', 'NG', 'GH', 'ZA', 'TZ', 'UG', 'ET', 'RW']
        ).values('country_code', 'country_name', 'discount_percentage', 'is_active')
        
        # Test query param
        test_country = request.GET.get('country', 'NONE')
        
        debug_data = {
            'query_param_test': {
                'raw_query_string': request.META.get('QUERY_STRING'),
                'country_param': test_country,
                'all_params': dict(request.GET)
            },
            'kenya_in_db': kenya is not None,
            'kenya_details': {
                'code': kenya.country_code if kenya else None,
                'name': kenya.country_name if kenya else None,
                'discount': kenya.discount_percentage if kenya else None,
                'active': kenya.is_active if kenya else None,
            } if kenya else None,
            'discount_lookup': discount,
            'is_eligible': DevelopingCountry.is_eligible('KE'),
            'total_countries': DevelopingCountry.objects.count(),
            'active_countries': DevelopingCountry.objects.filter(is_active=True).count(),
            'african_countries': list(african_countries),
            'test_pricing': {
                'monthly': 7.50 if discount == 50 else 15.00,
                'six_month': 39.00 if discount == 50 else 78.00,
                'yearly': 72.00 if discount == 50 else 144.00
            }
        }
        
        logger.info(f"Debug data: {debug_data}")
        
        return Response(debug_data, status=status.HTTP_200_OK)