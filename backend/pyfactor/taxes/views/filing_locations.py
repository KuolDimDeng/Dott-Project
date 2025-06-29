from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from ..models import TaxFilingLocation
from ..serializers import TaxFilingLocationSerializer
from taxes.services.claude_service import ClaudeComplianceService
import logging

logger = logging.getLogger(__name__)


class TaxFilingLocationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tax filing locations.
    Caches filing location information to reduce API calls.
    """
    queryset = TaxFilingLocation.objects.all()
    serializer_class = TaxFilingLocationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by location parameters"""
        queryset = super().get_queryset()
        
        # Filter by country
        country = self.request.query_params.get('country')
        if country:
            queryset = queryset.filter(country__iexact=country)
        
        # Filter by state/province
        state_province = self.request.query_params.get('state_province')
        if state_province:
            queryset = queryset.filter(state_province__iexact=state_province)
        
        # Filter by city
        city = self.request.query_params.get('city')
        if city:
            queryset = queryset.filter(city__iexact=city)
        
        # Filter by postal code
        postal_code = self.request.query_params.get('postal_code')
        if postal_code:
            queryset = queryset.filter(postal_code=postal_code)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def lookup(self, request):
        """
        Look up filing location information.
        If not cached or stale, fetch from Claude API.
        """
        country = request.query_params.get('country')
        state_province = request.query_params.get('state_province', '')
        city = request.query_params.get('city', '')
        postal_code = request.query_params.get('postal_code', '')
        
        if not country:
            return Response(
                {"error": "Country parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Try to get from cache first
            location = TaxFilingLocation.objects.filter(
                country__iexact=country,
                state_province__iexact=state_province or '',
                city__iexact=city or '',
                postal_code=postal_code or ''
            ).first()
            
            # If not found or stale, fetch from Claude
            if not location or location.is_stale:
                logger.info(f"Fetching filing location for {country} {state_province} {city}")
                
                # Get filing location data from Claude
                filing_data = ClaudeComplianceService.get_filing_locations(
                    country, state_province, city, postal_code
                )
                
                if not filing_data:
                    return Response(
                        {"error": f"Could not retrieve filing location for {country}"},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Create or update the location
                location_data = {
                    'country': country,
                    'state_province': state_province or '',
                    'city': city or '',
                    'postal_code': postal_code or '',
                    **filing_data
                }
                
                if location:
                    # Update existing
                    for key, value in location_data.items():
                        setattr(location, key, value)
                    location.save()
                else:
                    # Create new
                    location = TaxFilingLocation.objects.create(**location_data)
                
                logger.info(f"Updated filing location cache for {country} {state_province}")
            
            serializer = self.get_serializer(location)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error looking up filing location: {str(e)}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def refresh_cache(self, request):
        """Force refresh of filing location cache"""
        country = request.data.get('country')
        state_province = request.data.get('state_province', '')
        
        if not country:
            return Response(
                {"error": "Country is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Find and delete existing cache
            TaxFilingLocation.objects.filter(
                country__iexact=country,
                state_province__iexact=state_province or ''
            ).delete()
            
            # Fetch fresh data
            return self.lookup(request)
            
        except Exception as e:
            logger.error(f"Error refreshing cache: {str(e)}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )