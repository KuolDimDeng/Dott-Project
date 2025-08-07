"""Simple tenant tax settings endpoint for POS"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.decorators import login_required
import logging

from taxes.models import GlobalSalesTaxRate
from users.models import UserProfile, Business, BusinessDetails

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tenant_tax_settings(request):
    """
    Get tax settings for the current user's business location.
    Used by POS to determine default tax rate.
    """
    try:
        logger.info(f"[TenantTaxSettings] Getting settings for user: {request.user.email}")
        
        # Get user profile
        try:
            profile = UserProfile.objects.get(user=request.user)
            country = str(profile.country) if profile.country else None
            state = profile.state
            county = profile.county
        except UserProfile.DoesNotExist:
            logger.warning(f"[TenantTaxSettings] No UserProfile for user {request.user.email}")
            country = None
            state = None
            county = None
        
        # Try to get country from business details if not in profile
        if not country:
            try:
                business = Business.objects.filter(tenant_id=request.user.id).first()
                if business:
                    business_details = BusinessDetails.objects.filter(business=business).first()
                    if business_details and business_details.country:
                        country = str(business_details.country.code)
                        logger.info(f"[TenantTaxSettings] Got country from business: {country}")
            except Exception as e:
                logger.warning(f"[TenantTaxSettings] Error getting business country: {e}")
        
        # If we have a country, look up the tax rate
        tax_rate = 0
        country_name = country or ''
        state_name = state or ''
        county_name = county or ''
        source = 'none'
        
        if country:
            # Try country-level rate first
            country_rate = GlobalSalesTaxRate.objects.filter(
                country=country,
                region_code='',
                locality='',
                is_current=True
            ).first()
            
            if country_rate:
                tax_rate = float(country_rate.rate)
                country_name = country_rate.country_name
                source = 'country'
                logger.info(f"[TenantTaxSettings] Found country rate: {tax_rate}")
            
            # If US, try state and county rates
            if country == 'US' and state:
                state_rate = GlobalSalesTaxRate.objects.filter(
                    country='US',
                    region_code=state,
                    locality='',
                    is_current=True
                ).first()
                
                if state_rate:
                    tax_rate = float(state_rate.rate)
                    state_name = state_rate.region_name
                    source = 'state'
                    logger.info(f"[TenantTaxSettings] Found state rate: {tax_rate}")
                
                if county:
                    county_rate = GlobalSalesTaxRate.objects.filter(
                        country='US',
                        region_code=state,
                        locality__iexact=county,
                        is_current=True
                    ).first()
                    
                    if county_rate:
                        tax_rate = float(county_rate.rate)
                        county_name = county_rate.locality
                        source = 'county'
                        logger.info(f"[TenantTaxSettings] Found county rate: {tax_rate}")
        
        return Response({
            'settings': {
                'sales_tax_rate': tax_rate,
                'country': country or '',
                'country_name': country_name,
                'region_code': state or '',
                'region_name': state_name,
                'county': county or '',
                'county_name': county_name
            },
            'source': source,
            'tax_authority': None
        })
        
    except Exception as e:
        logger.error(f"[TenantTaxSettings] Error: {e}")
        return Response({
            'settings': {
                'sales_tax_rate': 0,
                'country': '',
                'country_name': '',
                'region_code': '',
                'region_name': '',
                'county': '',
                'county_name': ''
            },
            'source': 'error',
            'tax_authority': None
        }, status=500)