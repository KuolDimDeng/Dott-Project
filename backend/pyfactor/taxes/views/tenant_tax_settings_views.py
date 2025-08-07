# taxes/views/tenant_tax_settings_views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction as db_transaction
import logging

from taxes.models import TenantTaxSettings, GlobalSalesTaxRate
from taxes.serializers_new.tenant_tax_serializer import (
    TenantTaxSettingsSerializer,
    GlobalSalesTaxRateSerializer
)

logger = logging.getLogger(__name__)

# Enable detailed logging
import sys
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler(sys.stdout)
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('[%(asctime)s] %(name)s %(levelname)s: %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)


class TenantTaxSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tenant-specific tax settings
    """
    serializer_class = TenantTaxSettingsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return tax settings for the current tenant"""
        return TenantTaxSettings.objects.filter(
            tenant_id=self.request.user.tenant_id
        )
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """
        Get current tenant's tax settings or create from global defaults
        """
        logger.info(f"[TenantTaxSettings] Getting tax settings for user {request.user.id}")
        tenant_id = request.user.tenant_id
        logger.info(f"[TenantTaxSettings] Tenant ID: {tenant_id}")
        
        # Get user's country from profile/business
        try:
            from users.models import UserProfile, Business
            from onboarding.models import OnboardingProgress
            
            user_profile = UserProfile.objects.filter(user=request.user).first()
            logger.info(f"[TenantTaxSettings] Found user profile: {user_profile is not None}")
            
            if not user_profile:
                logger.error(f"User {request.user.id} has no profile")
                return Response(
                    {"error": "User profile not found"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get country from Business model (new consolidated architecture)
            country = None
            region_code = ''
            locality = ''
            
            # First try to get from Business model directly
            if user_profile.business_id:
                try:
                    business = Business.objects.filter(id=user_profile.business_id).first()
                    if business and hasattr(business, 'country'):
                        country = str(business.country) if business.country else None
                        region_code = str(business.state) if hasattr(business, 'state') and business.state else ''
                        locality = str(business.county) if hasattr(business, 'county') and business.county else ''
                        logger.info(f"[TenantTaxSettings] Got location from Business model: {country}/{region_code}/{locality}")
                except Exception as e:
                    logger.warning(f"[TenantTaxSettings] Could not get Business: {e}")
            
            # If not found, try OnboardingProgress
            if not country:
                try:
                    onboarding = OnboardingProgress.objects.filter(user=request.user).first()
                    if onboarding and onboarding.business:
                        country = str(onboarding.business.country) if onboarding.business.country else None
                        region_code = str(onboarding.business.state) if hasattr(onboarding.business, 'state') and onboarding.business.state else ''
                        locality = str(onboarding.business.county) if hasattr(onboarding.business, 'county') and onboarding.business.county else ''
                        logger.info(f"[TenantTaxSettings] Got location from OnboardingProgress: {country}/{region_code}/{locality}")
                except Exception as e:
                    logger.warning(f"[TenantTaxSettings] Could not get OnboardingProgress: {e}")
            
            # Final fallback to UserProfile country
            if not country and hasattr(user_profile, 'country'):
                country = str(user_profile.country) if user_profile.country else None
                logger.info(f"[TenantTaxSettings] Got country from UserProfile: {country}")
            
            if not country:
                # Don't default to US - return error instead
                logger.error(f"[TenantTaxSettings] No country found for user {request.user.id}")
                return Response(
                    {"error": "Business location not configured"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            logger.info(f"[TenantTaxSettings] Country: {country}, Region: {region_code}")
            
        except Exception as e:
            logger.error(f"Error getting user profile: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No details'}")
            return Response(
                {"error": f"Failed to get user profile: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Try to get existing tenant settings
        # Skip locality for now as it may not be in database yet
        try:
            tenant_settings = TenantTaxSettings.objects.filter(
                tenant_id=tenant_id,
                country=country,
                region_code=region_code
            ).first()
        except Exception as e:
            logger.warning(f"[TenantTaxSettings] Could not query tenant settings: {e}")
            tenant_settings = None
        
        if tenant_settings:
            serializer = TenantTaxSettingsSerializer(tenant_settings)
            return Response({
                "source": "tenant",
                "settings": serializer.data
            })
        
        # Get global rate for the country/region
        global_rate = GlobalSalesTaxRate.objects.filter(
            country=country,
            region_code=region_code,
            is_current=True
        ).first()
        
        if not global_rate:
            # Try without region
            global_rate = GlobalSalesTaxRate.objects.filter(
                country=country,
                region_code='',
                is_current=True
            ).first()
        
        if global_rate:
            # Return global rate data formatted as settings
            return Response({
                "source": "global",
                "settings": {
                    "country": str(country),
                    "country_name": global_rate.country_name if hasattr(global_rate, 'country_name') else str(country),
                    "region_code": region_code,
                    "region_name": global_rate.region_name if global_rate.region_name else region_code,
                    "sales_tax_enabled": True,
                    "sales_tax_rate": float(global_rate.rate),
                    "sales_tax_type": global_rate.tax_type if hasattr(global_rate, 'tax_type') else 'VAT',
                    "rate_percentage": float(global_rate.rate * 100),
                    "is_custom_rate": False,
                    "ai_confidence_score": float(global_rate.ai_confidence_score) if global_rate.ai_confidence_score else None,
                    "manually_verified": global_rate.manually_verified if hasattr(global_rate, 'manually_verified') else False
                }
            })
        
        # No rate found
        return Response({
            "source": "none",
            "settings": {
                "country": str(country),
                "country_name": str(country),
                "region_code": region_code,
                "sales_tax_enabled": False,
                "sales_tax_rate": 0.0,
                "sales_tax_type": "none",
                "rate_percentage": 0.0,
                "message": "No tax rate found for your location"
            }
        })
    
    @action(detail=False, methods=['post'])
    def save_custom(self, request):
        """
        Save custom tax settings for the tenant
        """
        tenant_id = request.user.tenant_id
        data = request.data.copy()
        
        # Add tenant_id
        data['tenant_id'] = tenant_id
        
        # Check if settings already exist
        existing = TenantTaxSettings.objects.filter(
            tenant_id=tenant_id,
            country=data.get('country'),
            region_code=data.get('region_code', ''),
            locality=data.get('locality', '')
        ).first()
        
        if existing:
            # Update existing
            serializer = TenantTaxSettingsSerializer(
                existing,
                data=data,
                partial=True,
                context={'request': request}
            )
        else:
            # Create new
            serializer = TenantTaxSettingsSerializer(
                data=data,
                context={'request': request}
            )
        
        if serializer.is_valid():
            with db_transaction.atomic():
                settings = serializer.save()
                
                # Log the change
                logger.info(
                    f"Tax settings saved for tenant {tenant_id}: "
                    f"{settings.country} {settings.region_code} @ {settings.sales_tax_rate*100}%"
                )
                
                return Response({
                    "source": "tenant",
                    "settings": serializer.data,
                    "message": "Tax settings saved successfully"
                })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def counties(self, request):
        """
        Get available counties for a state
        """
        country = request.query_params.get('country')
        state = request.query_params.get('state')
        
        if not country or not state:
            return Response(
                {"error": "Country and state parameters required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get counties with tax rates for this state
        counties = GlobalSalesTaxRate.objects.filter(
            country=country,
            region_code=state,
            is_current=True
        ).exclude(
            locality=''
        ).values('locality').distinct().order_by('locality')
        
        # Format response
        county_list = []
        for county in counties:
            # Try to get the full county info
            county_rate = GlobalSalesTaxRate.objects.filter(
                country=country,
                region_code=state,
                locality=county['locality'],
                is_current=True
            ).first()
            
            if county_rate:
                county_list.append({
                    'code': county['locality'],
                    'name': county_rate.manual_notes.split('County: ')[-1] if 'County: ' in county_rate.manual_notes else county['locality']
                })
        
        return Response({
            "state": state,
            "counties": county_list
        })
    
    @action(detail=False, methods=['get'])
    def global_rates(self, request):
        """
        Get available global tax rates for reference
        """
        country = request.query_params.get('country')
        
        if not country:
            return Response(
                {"error": "Country parameter required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rates = GlobalSalesTaxRate.objects.filter(
            country=country,
            is_current=True
        ).order_by('region_code', 'locality')
        
        serializer = GlobalSalesTaxRateSerializer(rates, many=True)
        
        return Response({
            "country": country,
            "rates": serializer.data
        })
    
    @action(detail=False, methods=['delete'])
    def reset_to_global(self, request):
        """
        Delete custom settings to revert to global defaults
        """
        tenant_id = request.user.tenant_id
        country = request.data.get('country')
        region_code = request.data.get('region_code', '')
        
        if not country:
            return Response(
                {"error": "Country required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete custom settings
        deleted_count = TenantTaxSettings.objects.filter(
            tenant_id=tenant_id,
            country=country,
            region_code=region_code
        ).delete()[0]
        
        if deleted_count > 0:
            logger.info(
                f"Tax settings reset to global for tenant {tenant_id}: "
                f"{country} {region_code}"
            )
            
            return Response({
                "message": "Tax settings reset to global defaults",
                "deleted": True
            })
        
        return Response({
            "message": "No custom settings found to delete",
            "deleted": False
        })