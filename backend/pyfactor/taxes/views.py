# taxes/views.py
from rest_framework import viewsets, status
from custom_auth.tenant_base_viewset import TenantIsolatedViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from decimal import Decimal
import logging

from .models import GlobalSalesTaxRate
from .tasks import populate_tax_rates_for_country

logger = logging.getLogger(__name__)


class GlobalTaxRateViewSet(TenantIsolatedViewSet):
    """
    ViewSet for accessing global tax rates
    """
    permission_classes = [IsAuthenticated]
    queryset = GlobalSalesTaxRate.objects.filter(is_current=True)
    
    @action(detail=False, methods=['post'])
    def lookup(self, request):
        """
        Lookup tax rate for a specific location
        If not found and fetch_if_missing=True, triggers AI lookup
        """
        logger.info(f"[Tax Rate Lookup] === START === User: {request.user.email}")
        
        country = request.data.get('country', '').upper()
        region_code = request.data.get('region_code', '').upper()
        locality = request.data.get('locality', '')
        fetch_if_missing = request.data.get('fetch_if_missing', False)
        
        logger.info(f"[Tax Rate Lookup] Request: country={country}, region={region_code}, "
                   f"locality={locality}, fetch_if_missing={fetch_if_missing}")
        
        if not country:
            logger.warning("[Tax Rate Lookup] No country provided")
            return Response({
                'error': 'Country code is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Try to find existing rate
        tax_rate = None
        
        # Try most specific first (country + region + locality)
        if region_code and locality:
            tax_rate = GlobalSalesTaxRate.objects.filter(
                country=country,
                region_code=region_code,
                locality__iexact=locality,
                is_current=True
            ).first()
            if tax_rate:
                logger.info(f"[Tax Rate Lookup] Found locality-specific rate: {tax_rate}")
        
        # Try country + region
        if not tax_rate and region_code:
            tax_rate = GlobalSalesTaxRate.objects.filter(
                country=country,
                region_code=region_code,
                locality='',
                is_current=True
            ).first()
            if tax_rate:
                logger.info(f"[Tax Rate Lookup] Found region-specific rate: {tax_rate}")
        
        # Try country only
        if not tax_rate:
            tax_rate = GlobalSalesTaxRate.objects.filter(
                country=country,
                region_code='',
                locality='',
                is_current=True
            ).first()
            if tax_rate:
                logger.info(f"[Tax Rate Lookup] Found country-level rate: {tax_rate}")
        
        # If not found and fetch_if_missing is True, trigger AI lookup
        if not tax_rate and fetch_if_missing:
            logger.info(f"[Tax Rate Lookup] No rate found, triggering AI lookup for {country}")
            
            # Get country name
            from django_countries import countries
            country_name = dict(countries).get(country, country)
            
            # Trigger background task (but also try to get a quick response)
            try:
                # For now, create a placeholder with 0% and trigger background update
                tax_rate = GlobalSalesTaxRate.objects.create(
                    country=country,
                    country_name=country_name,
                    region_code=region_code,
                    region_name='',
                    locality=locality,
                    tax_type='sales_tax',
                    rate=Decimal('0'),
                    ai_populated=True,
                    ai_confidence_score=Decimal('0'),
                    ai_source_notes='Pending AI lookup - please verify and update manually',
                    ai_last_verified=timezone.now(),
                    effective_date=timezone.now().date(),
                    is_current=True,
                )
                
                # Trigger background task to update with real data
                populate_tax_rates_for_country.delay(country, country_name)
                
                logger.info(f"[Tax Rate Lookup] Created placeholder rate and triggered AI lookup")
                
            except Exception as e:
                logger.error(f"[Tax Rate Lookup] Error creating placeholder: {str(e)}")
        
        if tax_rate:
            response_data = {
                'country': tax_rate.country.code,
                'country_name': tax_rate.country_name,
                'region_code': tax_rate.region_code,
                'region_name': tax_rate.region_name,
                'locality': tax_rate.locality,
                'tax_type': tax_rate.tax_type,
                'rate': float(tax_rate.rate),
                'rate_percentage': tax_rate.rate_percentage,
                'ai_populated': tax_rate.ai_populated,
                'ai_confidence_score': float(tax_rate.ai_confidence_score) if tax_rate.ai_confidence_score else None,
                'ai_source_notes': tax_rate.ai_source_notes,
                'ai_last_verified': tax_rate.ai_last_verified.isoformat(),
                'manually_verified': tax_rate.manually_verified,
                'effective_date': tax_rate.effective_date.isoformat(),
            }
            logger.info(f"[Tax Rate Lookup] === END === Returning rate: {tax_rate.rate_percentage}")
            return Response(response_data)
        else:
            logger.warning(f"[Tax Rate Lookup] === END === No rate found for {country}")
            return Response({
                'error': 'No tax rate found for this location',
                'country': country,
                'region_code': region_code,
                'locality': locality
            }, status=status.HTTP_404_NOT_FOUND)