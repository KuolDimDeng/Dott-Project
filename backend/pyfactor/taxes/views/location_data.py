"""
Location data API views for countries, states, and counties.
Uses GlobalSalesTaxRate data to ensure consistency with tax calculations.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, F
from taxes.models import GlobalSalesTaxRate
from pyfactor.logging_config import get_logger

logger = get_logger()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_countries(request):
    """
    Get list of all countries available in the tax system.
    Returns country code and name pairs.
    """
    try:
        # Get unique countries from GlobalSalesTaxRate
        countries = (GlobalSalesTaxRate.objects
                    .filter(is_current=True)
                    .exclude(country__isnull=True)
                    .exclude(country='')
                    .values('country', 'country_name')
                    .distinct()
                    .order_by('country_name'))
        
        # Format for frontend dropdowns
        country_list = [
            {
                'code': country['country'],
                'name': country['country_name'] or country['country']
            }
            for country in countries
        ]
        
        logger.info(f"[LocationData] Returning {len(country_list)} countries")
        return Response({'countries': country_list})
        
    except Exception as e:
        logger.error(f"[LocationData] Error fetching countries: {str(e)}")
        return Response(
            {'error': 'Failed to fetch countries'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_states(request):
    """
    Get list of states/regions for a given country.
    Query params: country (required)
    """
    try:
        country = request.GET.get('country')
        if not country:
            return Response(
                {'error': 'Country parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get unique states/regions for the country
        states = (GlobalSalesTaxRate.objects
                 .filter(
                     country=country,
                     is_current=True
                 )
                 .exclude(Q(region_code__isnull=True) | Q(region_code=''))
                 .values('region_code', 'region_name')
                 .distinct()
                 .order_by('region_name'))
        
        # Format for frontend dropdowns
        state_list = [
            {
                'code': state['region_code'],
                'name': state['region_name'] or state['region_code']
            }
            for state in states
        ]
        
        logger.info(f"[LocationData] Returning {len(state_list)} states for country {country}")
        return Response({'states': state_list})
        
    except Exception as e:
        logger.error(f"[LocationData] Error fetching states: {str(e)}")
        return Response(
            {'error': 'Failed to fetch states'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_counties(request):
    """
    Get list of counties/localities for a given country and state.
    Query params: country (required), state (required)
    """
    try:
        country = request.GET.get('country')
        state = request.GET.get('state')
        
        if not country or not state:
            return Response(
                {'error': 'Country and state parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get unique counties/localities for the country and state
        counties = (GlobalSalesTaxRate.objects
                   .filter(
                       country=country,
                       region_code=state,
                       is_current=True
                   )
                   .exclude(Q(locality__isnull=True) | Q(locality=''))
                   .values('locality')
                   .distinct()
                   .order_by('locality'))
        
        # Format for frontend dropdowns
        # Clean up county names (remove any prefixes/suffixes if needed)
        county_list = []
        for county in counties:
            locality = county['locality']
            # Format county names properly (title case)
            formatted_name = locality.title() if locality else ''
            county_list.append({
                'code': locality,
                'name': formatted_name
            })
        
        logger.info(f"[LocationData] Returning {len(county_list)} counties for {country}/{state}")
        return Response({'counties': county_list})
        
    except Exception as e:
        logger.error(f"[LocationData] Error fetching counties: {str(e)}")
        return Response(
            {'error': 'Failed to fetch counties'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def validate_location(request):
    """
    Validate if a location combination exists in the tax system.
    Query params: country (required), state (optional), county (optional)
    Returns: exists (boolean) and tax_rate if found
    """
    try:
        country = request.GET.get('country')
        state = request.GET.get('state', '')
        county = request.GET.get('county', '')
        
        if not country:
            return Response(
                {'error': 'Country parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Build query based on provided parameters
        query = Q(country=country, is_current=True)
        
        if county and state:
            # Try county-level first
            query &= Q(region_code=state, locality=county)
        elif state:
            # Try state-level
            query &= Q(region_code=state) & (Q(locality__isnull=True) | Q(locality=''))
        else:
            # Country-level only
            query &= Q(region_code__isnull=True) | Q(region_code='')
        
        # Check if location exists
        location = GlobalSalesTaxRate.objects.filter(query).first()
        
        if location:
            return Response({
                'exists': True,
                'tax_rate': float(location.rate),
                'tax_type': location.tax_type,
                'tax_authority': location.tax_authority_name
            })
        else:
            return Response({
                'exists': False,
                'message': 'Location not found in tax system'
            })
        
    except Exception as e:
        logger.error(f"[LocationData] Error validating location: {str(e)}")
        return Response(
            {'error': 'Failed to validate location'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )