# taxes/views/global_tax_rates.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
import logging

from ..models import GlobalSalesTaxRate
from ..serializers import GlobalSalesTaxRateSerializer

logger = logging.getLogger(__name__)


class GlobalTaxRateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for accessing global tax rates
    Pre-populated tax rates for all countries
    """
    queryset = GlobalSalesTaxRate.objects.filter(
        is_current=True,
        region_code='',
        locality=''
    )
    serializer_class = GlobalSalesTaxRateSerializer
    
    @action(detail=False, methods=['get', 'post'])
    def lookup(self, request):
        """
        Lookup tax rate by country code
        GET /api/taxes/global-rates/lookup/?country=US
        POST /api/taxes/global-rates/lookup/ with JSON body
        """
        # Handle both GET and POST requests
        if request.method == 'POST':
            country_code = request.data.get('country', '').upper()
            region_code = request.data.get('region_code', '')
        else:
            country_code = request.query_params.get('country', '').upper()
            region_code = request.query_params.get('region_code', '')
        
        if not country_code:
            logger.warning("[Global Tax Rate] No country code provided")
            return Response(
                {'error': 'Country code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"[Global Tax Rate] Looking up rate for country: {country_code}")
        
        try:
            # Try to get the tax rate
            tax_rate = GlobalSalesTaxRate.objects.filter(
                country=country_code,
                region_code=region_code or '',
                locality='',
                is_current=True
            ).first()
            
            if tax_rate:
                logger.info(f"[Global Tax Rate] Found rate for {country_code}: "
                          f"{tax_rate.tax_type} @ {tax_rate.rate_percentage}%")
                
                # Return raw data that matches POS expectations
                return Response({
                    'success': True,
                    'rate': float(tax_rate.rate),
                    'rate_percentage': float(tax_rate.rate * 100),
                    'tax_type': tax_rate.tax_type,
                    'country': tax_rate.country.code,
                    'country_name': tax_rate.country_name,
                    'region_code': tax_rate.region_code,
                    'region_name': tax_rate.region_name,
                    'ai_confidence_score': float(tax_rate.ai_confidence_score) if tax_rate.ai_confidence_score else 0,
                    'ai_source_notes': tax_rate.ai_source_notes,
                    'ai_last_verified': tax_rate.ai_last_verified,
                    'manually_verified': tax_rate.manually_verified,
                    'effective_date': tax_rate.effective_date,
                })
            else:
                logger.warning(f"[Global Tax Rate] No rate found for {country_code}")
                
                # Return a default 0% rate
                return Response({
                    'success': True,
                    'rate': 0.0,
                    'rate_percentage': 0.0,
                    'tax_type': 'sales_tax',
                    'country': country_code,
                    'country_name': country_code,
                    'region_code': region_code or '',
                    'region_name': region_code or '',
                    'ai_confidence_score': 0,
                    'ai_source_notes': 'No tax rate data available - please verify locally',
                    'ai_last_verified': None,
                    'manually_verified': False,
                    'effective_date': None,
                })
                
        except Exception as e:
            logger.error(f"[Global Tax Rate] Error looking up rate: {str(e)}")
            return Response(
                {'error': 'Failed to lookup tax rate'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def by_country(self, request, country_code=None):
        """
        Get all tax rates for a specific country
        GET /api/taxes/global-rates/by_country/US/
        """
        if not country_code:
            country_code = request.query_params.get('country', '').upper()
            
        if not country_code:
            return Response(
                {'error': 'Country code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rates = self.queryset.filter(country=country_code)
        serializer = self.get_serializer(rates, many=True)
        
        return Response({
            'success': True,
            'country': country_code,
            'rates': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get statistics about the tax rate database
        GET /api/taxes/global-rates/statistics/
        """
        from django.db.models import Count, Avg, Max, Min
        
        stats = GlobalSalesTaxRate.objects.filter(
            is_current=True,
            region_code='',
            locality=''
        ).aggregate(
            total_countries=Count('country', distinct=True),
            avg_rate=Avg('rate'),
            max_rate=Max('rate'),
            min_rate=Min('rate'),
            total_rates=Count('id')
        )
        
        # Get tax type distribution
        tax_types = GlobalSalesTaxRate.objects.filter(
            is_current=True,
            region_code='',
            locality=''
        ).values('tax_type').annotate(
            count=Count('tax_type')
        ).order_by('-count')
        
        # Convert rates to percentages
        stats['avg_rate_percentage'] = float(stats['avg_rate'] * 100) if stats['avg_rate'] else 0
        stats['max_rate_percentage'] = float(stats['max_rate'] * 100) if stats['max_rate'] else 0
        stats['min_rate_percentage'] = float(stats['min_rate'] * 100) if stats['min_rate'] else 0
        
        return Response({
            'success': True,
            'statistics': stats,
            'tax_types': list(tax_types),
            'last_update': GlobalSalesTaxRate.objects.filter(
                is_current=True
            ).order_by('-ai_last_verified').first().ai_last_verified if GlobalSalesTaxRate.objects.exists() else None
        })