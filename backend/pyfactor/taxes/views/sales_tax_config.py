"""
Sales Tax Configuration API views for tenant-specific tax rate management.
Only accessible to OWNER/ADMIN roles for security.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from decimal import Decimal
import logging

from ..models import SalesTaxJurisdictionOverride, GlobalSalesTaxRate
from custom_auth.rls import get_current_tenant_id
from custom_auth.permissions import TenantAccessPermission
from pyfactor.logging_config import get_logger

logger = get_logger()


class OwnerAdminOnlyPermission(permissions.BasePermission):
    """
    Permission that only allows OWNER or ADMIN users to access tax configuration.
    This is critical for security - regular users should not modify tax rates.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user has OWNER or ADMIN role
        user_profile = getattr(request.user, 'profile', None)
        if not user_profile:
            return False
        
        return user_profile.role in ['OWNER', 'ADMIN']


class SalesTaxConfigViewSet(viewsets.ModelViewSet):
    """
    API for managing tenant-specific sales tax rate overrides.
    
    Features:
    - View current tax overrides
    - Create new jurisdiction overrides
    - Update existing overrides
    - Deactivate overrides (never delete for audit trail)
    - Preview tax calculations
    """
    
    permission_classes = [permissions.IsAuthenticated, TenantAccessPermission, OwnerAdminOnlyPermission]
    
    def get_queryset(self):
        """Filter overrides by current tenant"""
        tenant_id = get_current_tenant_id()
        if not tenant_id:
            return SalesTaxJurisdictionOverride.objects.none()
        
        return SalesTaxJurisdictionOverride.objects.filter(
            tenant_id=tenant_id
        ).order_by('-created_at')
    
    def get_serializer_class(self):
        """Return appropriate serializer"""
        # We'll create this serializer next
        from ..serializers import SalesTaxOverrideSerializer
        return SalesTaxOverrideSerializer
    
    def perform_create(self, serializer):
        """Set tenant and user when creating override"""
        tenant_id = get_current_tenant_id()
        
        # Get original global rates for audit
        country = serializer.validated_data['country']
        region_code = serializer.validated_data.get('region_code', '')
        locality = serializer.validated_data.get('locality', '')
        
        original_rates = self._get_global_rates(country, region_code, locality)
        
        serializer.save(
            tenant_id=tenant_id,
            created_by=self.request.user,
            original_global_rates=original_rates
        )
        
        logger.info(f"[TaxConfig] Created tax override for {tenant_id}: {country}/{region_code}/{locality}")
    
    def perform_update(self, serializer):
        """Track who updated the override"""
        serializer.save(updated_by=self.request.user)
        
        instance = serializer.instance
        logger.info(f"[TaxConfig] Updated tax override {instance.id} by {self.request.user.email}")
    
    @action(detail=False, methods=['get'])
    def global_rates(self, request):
        """
        Get global tax rates for a jurisdiction to help with override creation.
        Query params: country, region_code, locality
        """
        country = request.GET.get('country')
        region_code = request.GET.get('region_code', '')
        locality = request.GET.get('locality', '')
        
        if not country:
            return Response(
                {'error': 'Country parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        global_rates = self._get_global_rates(country, region_code, locality)
        
        return Response({
            'success': True,
            'global_rates': global_rates,
            'jurisdiction': {
                'country': country,
                'region_code': region_code,
                'locality': locality
            }
        })
    
    @action(detail=False, methods=['post'])
    def preview_calculation(self, request):
        """
        Preview tax calculation with proposed rates.
        Body: { country, region_code, locality, country_rate, state_rate, county_rate, sale_amount }
        """
        try:
            data = request.data
            
            country_rate = Decimal(str(data.get('country_rate', 0)))
            state_rate = Decimal(str(data.get('state_rate', 0)))
            county_rate = Decimal(str(data.get('county_rate', 0)))
            sale_amount = Decimal(str(data.get('sale_amount', 100)))
            
            total_rate = country_rate + state_rate + county_rate
            tax_amount = sale_amount * total_rate
            total_amount = sale_amount + tax_amount
            
            return Response({
                'success': True,
                'preview': {
                    'sale_amount': float(sale_amount),
                    'breakdown': {
                        'country_rate': float(country_rate * 100),  # Convert to percentage
                        'state_rate': float(state_rate * 100),
                        'county_rate': float(county_rate * 100),
                        'total_rate': float(total_rate * 100)
                    },
                    'tax_amount': float(tax_amount),
                    'total_amount': float(total_amount)
                }
            })
            
        except (ValueError, TypeError, ArithmeticError) as e:
            return Response(
                {'error': f'Invalid input data: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """
        Deactivate an override instead of deleting (for audit trail).
        """
        override = self.get_object()
        override.is_active = False
        override.updated_by = request.user
        override.save()
        
        logger.info(f"[TaxConfig] Deactivated tax override {override.id} by {request.user.email}")
        
        return Response({
            'success': True,
            'message': 'Tax override deactivated successfully'
        })
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Reactivate a previously deactivated override.
        """
        override = self.get_object()
        override.is_active = True
        override.updated_by = request.user
        override.save()
        
        logger.info(f"[TaxConfig] Activated tax override {override.id} by {request.user.email}")
        
        return Response({
            'success': True,
            'message': 'Tax override activated successfully'
        })
    
    def _get_global_rates(self, country, region_code='', locality=''):
        """
        Get global tax rates for a jurisdiction.
        Returns breakdown of country/state/county rates if available.
        """
        rates = {
            'country_rate': 0.0000,
            'state_rate': 0.0000,
            'county_rate': 0.0000,
            'total_rate': 0.0000,
            'found': False,
            'source': 'not_found'
        }
        
        try:
            # Try to find most specific first (country + region + locality)
            if region_code and locality:
                global_rate = GlobalSalesTaxRate.objects.filter(
                    country=country,
                    region_code=region_code,
                    locality__iexact=locality,
                    is_current=True
                ).first()
                
                if global_rate:
                    rates.update({
                        'total_rate': float(global_rate.rate),
                        'found': True,
                        'source': 'county_level',
                        'tax_authority': global_rate.tax_authority_name or '',
                        'effective_date': global_rate.effective_date.isoformat() if global_rate.effective_date else None
                    })
                    # For now, assume all tax is at county level
                    # TODO: Split into state vs county when data is available
                    rates['county_rate'] = float(global_rate.rate)
                    return rates
            
            # Try country + region (state level)
            if region_code:
                global_rate = GlobalSalesTaxRate.objects.filter(
                    country=country,
                    region_code=region_code,
                    locality='',
                    is_current=True
                ).first()
                
                if global_rate:
                    rates.update({
                        'state_rate': float(global_rate.rate),
                        'total_rate': float(global_rate.rate),
                        'found': True,
                        'source': 'state_level',
                        'tax_authority': global_rate.tax_authority_name or '',
                        'effective_date': global_rate.effective_date.isoformat() if global_rate.effective_date else None
                    })
                    return rates
            
            # Try country level only
            global_rate = GlobalSalesTaxRate.objects.filter(
                country=country,
                region_code='',
                locality='',
                is_current=True
            ).first()
            
            if global_rate:
                rates.update({
                    'country_rate': float(global_rate.rate),
                    'total_rate': float(global_rate.rate),
                    'found': True,
                    'source': 'country_level',
                    'tax_authority': global_rate.tax_authority_name or '',
                    'effective_date': global_rate.effective_date.isoformat() if global_rate.effective_date else None
                })
                
        except Exception as e:
            logger.error(f"[TaxConfig] Error fetching global rates: {str(e)}")
            rates['error'] = str(e)
        
        return rates


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, TenantAccessPermission, OwnerAdminOnlyPermission])
def get_tax_settings_summary(request):
    """
    Get a summary of current tax settings for the tenant.
    Shows global vs override status for quick overview.
    """
    tenant_id = get_current_tenant_id()
    if not tenant_id:
        return Response(
            {'error': 'No tenant context'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Get active overrides
        overrides = SalesTaxJurisdictionOverride.objects.filter(
            tenant_id=tenant_id,
            is_active=True
        ).order_by('country', 'region_code', 'locality')
        
        # Count jurisdictions
        total_overrides = overrides.count()
        
        # Get summary by country
        summary_by_country = {}
        for override in overrides:
            country = str(override.country)
            if country not in summary_by_country:
                summary_by_country[country] = {
                    'country': country,
                    'overrides': [],
                    'count': 0
                }
            
            summary_by_country[country]['overrides'].append({
                'id': override.id,
                'jurisdiction': override.get_jurisdiction_display(),
                'total_rate': override.total_rate_percentage,
                'breakdown': {
                    'country': override.country_rate_percentage,
                    'state': override.state_rate_percentage,
                    'county': override.county_rate_percentage
                },
                'created_at': override.created_at.isoformat(),
                'created_by': override.created_by.email if override.created_by else None
            })
            summary_by_country[country]['count'] += 1
        
        return Response({
            'success': True,
            'summary': {
                'total_overrides': total_overrides,
                'countries': list(summary_by_country.values()),
                'tenant_id': tenant_id
            }
        })
        
    except Exception as e:
        logger.error(f"[TaxConfig] Error getting tax settings summary: {str(e)}")
        return Response(
            {'error': 'Failed to fetch tax settings summary'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )