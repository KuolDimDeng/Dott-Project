"""
POS-specific tax views for fast tax rate retrieval
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import logging

from taxes.services.tax_cache_service import TaxRateCacheService
from taxes.models import GlobalSalesTaxRate, TenantTaxSettings

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pos_default_tax_rate(request):
    """
    Get default tax rate for POS - uses cached value for speed
    This endpoint is optimized for POS usage with immediate response
    """
    try:
        logger.info(f"[POS Tax] Getting default rate for user {request.user.id}")
        
        # First try to get from cache (instant response)
        result = TaxRateCacheService.get_cached_rate_or_update(request.user)
        
        if result.get("success"):
            return Response({
                "success": True,
                "tax_rate": result.get("rate", 0),  # As decimal (0.18)
                "rate_percentage": result.get("rate_percentage", 0),  # As percentage (18)
                "jurisdiction": result.get("jurisdiction", "Unknown"),
                "source": result.get("source", "none"),
                "cached": result.get("cached", False),
                "message": "Tax rate loaded successfully"
            })
        else:
            # Return zero rate rather than error to not break POS
            return Response({
                "success": True,
                "tax_rate": 0,
                "rate_percentage": 0,
                "jurisdiction": "Not configured",
                "source": "none",
                "cached": False,
                "message": "No tax rate configured - please set in Settings"
            })
            
    except Exception as e:
        logger.error(f"[POS Tax] Error getting default rate: {e}")
        # Always return a valid response for POS
        return Response({
            "success": False,
            "tax_rate": 0,
            "rate_percentage": 0,
            "jurisdiction": "Error",
            "source": "none",
            "cached": False,
            "message": f"Error loading tax rate: {str(e)}"
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pos_customer_tax_rate(request):
    """
    Calculate tax rate for a specific customer in POS
    Takes customer location into account
    """
    customer_id = request.GET.get('customer_id')
    customer_country = request.GET.get('country', '').upper()
    customer_state = request.GET.get('state', '')
    customer_county = request.GET.get('county', '')
    
    logger.info(f"[POS Tax] Calculating rate for customer {customer_id} in {customer_country}/{customer_state}")
    
    try:
        # Get business default from cache
        business_result = TaxRateCacheService.get_cached_rate_or_update(request.user)
        business_country = None
        
        # Extract business country from jurisdiction
        if business_result.get("success") and business_result.get("jurisdiction"):
            # Parse country from jurisdiction like "US, CA" or "Kenya"
            jurisdiction_parts = business_result.get("jurisdiction", "").split(",")
            if jurisdiction_parts:
                business_country = jurisdiction_parts[0].strip()
        
        # If customer is in different country, return 0% (international sale)
        if customer_country and business_country and customer_country != business_country:
            logger.info(f"[POS Tax] International sale: {business_country} -> {customer_country}")
            return Response({
                "success": True,
                "tax_rate": 0,
                "rate_percentage": 0,
                "jurisdiction": f"International ({customer_country})",
                "source": "international",
                "message": "International sale - 0% tax"
            })
        
        # Check for customer location tax rate
        if customer_country:
            # Check tenant settings first
            tenant_settings = TenantTaxSettings.objects.filter(
                tenant_id=request.user.tenant_id,
                country=customer_country,
                region_code=customer_state
            ).first()
            
            if tenant_settings:
                rate_percentage = float(tenant_settings.sales_tax_rate * 100)
                return Response({
                    "success": True,
                    "tax_rate": float(tenant_settings.sales_tax_rate),
                    "rate_percentage": rate_percentage,
                    "jurisdiction": f"{customer_country}, {customer_state}" if customer_state else customer_country,
                    "source": "tenant",
                    "message": f"Custom rate: {rate_percentage:.1f}%"
                })
            
            # Check global rates
            global_rate = GlobalSalesTaxRate.objects.filter(
                country=customer_country,
                region_code=customer_state,
                is_current=True
            ).first()
            
            if not global_rate and customer_state:
                # Try country-level rate
                global_rate = GlobalSalesTaxRate.objects.filter(
                    country=customer_country,
                    region_code='',
                    is_current=True
                ).first()
            
            if global_rate:
                rate_percentage = float(global_rate.rate * 100)
                jurisdiction = global_rate.country_name or customer_country
                if global_rate.region_name:
                    jurisdiction += f", {global_rate.region_name}"
                elif customer_state:
                    jurisdiction += f", {customer_state}"
                
                return Response({
                    "success": True,
                    "tax_rate": float(global_rate.rate),
                    "rate_percentage": rate_percentage,
                    "jurisdiction": jurisdiction,
                    "source": "global",
                    "message": f"Standard rate: {rate_percentage:.1f}%"
                })
        
        # Fallback to business default
        if business_result.get("success"):
            return Response({
                "success": True,
                "tax_rate": business_result.get("rate", 0),
                "rate_percentage": business_result.get("rate_percentage", 0),
                "jurisdiction": business_result.get("jurisdiction", "Unknown"),
                "source": business_result.get("source", "none"),
                "message": "Using business default rate"
            })
        else:
            return Response({
                "success": True,
                "tax_rate": 0,
                "rate_percentage": 0,
                "jurisdiction": "Not configured",
                "source": "none",
                "message": "No tax rate configured"
            })
            
    except Exception as e:
        logger.error(f"[POS Tax] Error calculating customer rate: {e}")
        return Response({
            "success": False,
            "tax_rate": 0,
            "rate_percentage": 0,
            "jurisdiction": "Error",
            "source": "none",
            "message": f"Error: {str(e)}"
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refresh_cached_tax_rate(request):
    """
    Force refresh of cached tax rate for current user
    """
    try:
        result = TaxRateCacheService.update_user_cached_tax_rate(request.user)
        
        if result.get("success"):
            return Response({
                "success": True,
                "message": "Tax rate cache refreshed",
                "tax_rate": result.get("rate", 0),
                "rate_percentage": result.get("rate_percentage", 0),
                "jurisdiction": result.get("jurisdiction", "Unknown"),
                "source": result.get("source", "none")
            })
        else:
            return Response({
                "success": False,
                "message": result.get("error", "Failed to refresh cache")
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"[POS Tax] Error refreshing cache: {e}")
        return Response({
            "success": False,
            "message": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)