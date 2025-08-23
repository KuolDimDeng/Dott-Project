"""
Tax Rate Cache Service
Manages cached tax rates in UserProfile for fast POS access
"""
import logging
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from typing import Optional, Dict, Any

from users.models import UserProfile, Business
from taxes.models import TenantTaxSettings, GlobalSalesTaxRate

logger = logging.getLogger(__name__)


class TaxRateCacheService:
    """Service for managing cached tax rates in user profiles"""
    
    @staticmethod
    def update_user_cached_tax_rate(user) -> Dict[str, Any]:
        """
        Update cached tax rate for a user based on their business location
        Returns the cached tax information
        """
        try:
            profile = UserProfile.objects.filter(user=user).first()
            if not profile:
                logger.error(f"No profile found for user {user.id}")
                return {"success": False, "error": "No user profile"}
            
            # Get business location
            business = None
            country = None
            state = ''
            county = ''
            
            if profile.business_id:
                try:
                    business = Business.objects.filter(id=profile.business_id).first()
                    if business:
                        country = str(business.country) if business.country else None
                        state = str(business.state) if hasattr(business, 'state') and business.state else ''
                        county = str(business.county) if hasattr(business, 'county') and business.county else ''
                        logger.info(f"[TaxCache] Found business location: {country}/{state}/{county}")
                except Exception as e:
                    logger.warning(f"[TaxCache] Could not get business: {e}")
            
            # Fallback to profile country
            if not country and hasattr(profile, 'country'):
                country = str(profile.country) if profile.country else None
                logger.info(f"[TaxCache] Using profile country: {country}")
            
            if not country:
                # Set zero tax rate for users without country
                profile.cached_tax_rate = Decimal('0')
                profile.cached_tax_rate_percentage = Decimal('0')
                profile.cached_tax_jurisdiction = 'Not configured'
                profile.cached_tax_updated_at = timezone.now()
                profile.cached_tax_source = None
                profile.save(update_fields=[
                    'cached_tax_rate', 
                    'cached_tax_rate_percentage',
                    'cached_tax_jurisdiction',
                    'cached_tax_updated_at',
                    'cached_tax_source'
                ])
                
                logger.warning(f"[TaxCache] No country configured for user {user.id}")
                return {
                    "success": True,
                    "rate": 0,
                    "rate_percentage": 0,
                    "jurisdiction": "Not configured",
                    "source": None
                }
            
            # Check for tenant-specific settings first
            tenant_settings = TenantTaxSettings.objects.filter(
                tenant_id=user.tenant_id,
                country=country,
                region_code=state
            ).first()
            
            if tenant_settings:
                # Use tenant custom rate
                rate = tenant_settings.sales_tax_rate
                rate_percentage = Decimal(str(rate * 100))
                jurisdiction = f"{country}"
                if state:
                    jurisdiction += f", {state}"
                if county and tenant_settings.locality:
                    jurisdiction += f", {county}"
                
                profile.cached_tax_rate = rate
                profile.cached_tax_rate_percentage = rate_percentage
                profile.cached_tax_jurisdiction = jurisdiction
                profile.cached_tax_updated_at = timezone.now()
                profile.cached_tax_source = 'tenant'
                profile.save(update_fields=[
                    'cached_tax_rate', 
                    'cached_tax_rate_percentage',
                    'cached_tax_jurisdiction',
                    'cached_tax_updated_at',
                    'cached_tax_source'
                ])
                
                logger.info(f"[TaxCache] Cached tenant rate {rate_percentage}% for {jurisdiction}")
                return {
                    "success": True,
                    "rate": float(rate),
                    "rate_percentage": float(rate_percentage),
                    "jurisdiction": jurisdiction,
                    "source": "tenant"
                }
            
            # Check global rates
            logger.info(f"[TaxCache] Searching for global rate: country={country}, state={state}")
            global_rate = GlobalSalesTaxRate.objects.filter(
                country=country,
                region_code=state,
                is_current=True
            ).first()
            
            if not global_rate and state:
                # Try without state for country-level rate
                global_rate = GlobalSalesTaxRate.objects.filter(
                    country=country,
                    region_code='',
                    is_current=True
                ).first()
            
            if global_rate:
                # Use global rate
                logger.info(f"[TaxCache] Found global rate for {country}: {global_rate}")
                try:
                    rate = global_rate.rate
                    logger.info(f"[TaxCache] Rate field value: {rate}")
                    rate_percentage = Decimal(str(rate * 100))
                    logger.info(f"[TaxCache] Calculated percentage: {rate_percentage}%")
                except AttributeError as e:
                    logger.error(f"[TaxCache] ERROR accessing rate field: {e}")
                    logger.error(f"[TaxCache] Available fields: {dir(global_rate)}")
                    # Fallback to 0 if field doesn't exist
                    rate = Decimal('0')
                    rate_percentage = Decimal('0')
                jurisdiction = f"{global_rate.country_name or country}"
                if global_rate.region_name:
                    jurisdiction += f", {global_rate.region_name}"
                elif state:
                    jurisdiction += f", {state}"
                
                profile.cached_tax_rate = rate
                profile.cached_tax_rate_percentage = rate_percentage
                profile.cached_tax_jurisdiction = jurisdiction
                profile.cached_tax_updated_at = timezone.now()
                profile.cached_tax_source = 'global'
                profile.save(update_fields=[
                    'cached_tax_rate', 
                    'cached_tax_rate_percentage',
                    'cached_tax_jurisdiction',
                    'cached_tax_updated_at',
                    'cached_tax_source'
                ])
                
                logger.info(f"[TaxCache] Cached global rate {rate_percentage}% for {jurisdiction}")
                return {
                    "success": True,
                    "rate": float(rate),
                    "rate_percentage": float(rate_percentage),
                    "jurisdiction": jurisdiction,
                    "source": "global"
                }
            
            # No rate found - set to zero
            logger.warning(f"[TaxCache] ⚠️ No global rate found for country={country}, state={state}")
            # Log what rates exist for debugging
            all_ss_rates = GlobalSalesTaxRate.objects.filter(country=country)
            logger.info(f"[TaxCache] All rates for {country}: {list(all_ss_rates.values('country', 'region_code', 'rate', 'is_current'))}")
            
            profile.cached_tax_rate = Decimal('0')
            profile.cached_tax_rate_percentage = Decimal('0')
            profile.cached_tax_jurisdiction = f"{country} (No rate configured)"
            profile.cached_tax_updated_at = timezone.now()
            profile.cached_tax_source = None
            profile.save(update_fields=[
                'cached_tax_rate', 
                'cached_tax_rate_percentage',
                'cached_tax_jurisdiction',
                'cached_tax_updated_at',
                'cached_tax_source'
            ])
            
            logger.warning(f"[TaxCache] No tax rate found for {country}/{state}")
            return {
                "success": True,
                "rate": 0,
                "rate_percentage": 0,
                "jurisdiction": f"{country} (No rate configured)",
                "source": None
            }
            
        except Exception as e:
            logger.error(f"[TaxCache] Error updating cached tax rate: {e}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def get_cached_rate_or_update(user) -> Dict[str, Any]:
        """
        Get cached tax rate from profile or update if stale/missing
        """
        try:
            profile = UserProfile.objects.filter(user=user).first()
            if not profile:
                return {"success": False, "error": "No user profile"}
            
            # Check if cache exists and is recent (within 24 hours)
            if (profile.cached_tax_rate is not None and 
                profile.cached_tax_updated_at and
                (timezone.now() - profile.cached_tax_updated_at).total_seconds() < 86400):
                
                # Return cached value
                return {
                    "success": True,
                    "rate": float(profile.cached_tax_rate),
                    "rate_percentage": float(profile.cached_tax_rate_percentage or 0),
                    "jurisdiction": profile.cached_tax_jurisdiction or "Unknown",
                    "source": profile.cached_tax_source,
                    "cached": True,
                    "cached_at": profile.cached_tax_updated_at.isoformat()
                }
            
            # Cache is stale or missing - update it
            return TaxRateCacheService.update_user_cached_tax_rate(user)
            
        except Exception as e:
            logger.error(f"[TaxCache] Error getting cached rate: {e}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def invalidate_cache_for_tenant(tenant_id):
        """
        Invalidate cached tax rates for all users in a tenant
        (Call this when business location or tax settings change)
        """
        try:
            count = UserProfile.objects.filter(
                user__tenant_id=tenant_id
            ).update(
                cached_tax_rate=None,
                cached_tax_rate_percentage=None,
                cached_tax_jurisdiction=None,
                cached_tax_updated_at=None,
                cached_tax_source=None
            )
            logger.info(f"[TaxCache] Invalidated cache for {count} users in tenant {tenant_id}")
            return count
        except Exception as e:
            logger.error(f"[TaxCache] Error invalidating cache: {e}")
            return 0
    
    @staticmethod
    def populate_all_caches():
        """
        Populate cached tax rates for all users (for initial setup or maintenance)
        """
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        updated = 0
        failed = 0
        
        for user in User.objects.filter(is_active=True):
            result = TaxRateCacheService.update_user_cached_tax_rate(user)
            if result.get("success"):
                updated += 1
            else:
                failed += 1
        
        logger.info(f"[TaxCache] Population complete: {updated} updated, {failed} failed")
        return {"updated": updated, "failed": failed}