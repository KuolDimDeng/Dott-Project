"""
Subscription Service - Single Source of Truth for Subscription Data

This service centralizes all subscription-related operations to prevent
the data consistency issues that occur when multiple sources are used.

Industry Standard Approach:
1. Single database table (users_subscription) 
2. Single API endpoint (/api/users/me)
3. Single frontend hook (useSession)
4. Real-time updates via webhooks
"""

import logging
from django.utils import timezone
from users.models import Subscription
from custom_auth.models import Tenant

logger = logging.getLogger(__name__)

class SubscriptionService:
    """Centralized subscription management service"""
    
    @staticmethod
    def get_active_subscription(tenant_id):
        """
        Get active subscription for a tenant
        
        Args:
            tenant_id (str): Tenant UUID (maps to business.id)
            
        Returns:
            Subscription or None: Active subscription record
        """
        try:
            # tenant_id maps to business.id in our architecture
            subscription = Subscription.objects.filter(
                business_id=tenant_id,
                is_active=True
            ).first()
            
            logger.info(f"[SubscriptionService] Found subscription for tenant {tenant_id}: {subscription.selected_plan if subscription else 'None'}")
            return subscription
            
        except Exception as e:
            logger.error(f"[SubscriptionService] Error getting subscription for tenant {tenant_id}: {str(e)}")
            return None
    
    @staticmethod
    def create_or_update_subscription(tenant_id, plan, status='active', billing_cycle='monthly', **kwargs):
        """
        Create or update subscription for a tenant
        
        Args:
            tenant_id (str): Tenant UUID (maps to business.id)
            plan (str): Subscription plan (free, professional, enterprise)
            status (str): Subscription status
            billing_cycle (str): Billing cycle
            **kwargs: Additional subscription fields
            
        Returns:
            Subscription: Created or updated subscription
        """
        try:
            from users.models import Business
            
            # Get the business (tenant_id maps to business.id)
            try:
                business = Business.objects.get(id=tenant_id)
            except Business.DoesNotExist:
                logger.error(f"[SubscriptionService] Business not found for tenant {tenant_id}")
                raise ValueError(f"Business not found for tenant {tenant_id}")
            
            # Get or create subscription
            subscription, created = Subscription.objects.update_or_create(
                business=business,
                defaults={
                    'selected_plan': plan,
                    'is_active': status == 'active',
                    'start_date': timezone.now().date(),
                    **kwargs
                }
            )
            
            action = "Created" if created else "Updated"
            logger.info(f"[SubscriptionService] {action} subscription for tenant {tenant_id}: {plan}")
            
            # Clear any caches related to this subscription
            SubscriptionService._clear_subscription_cache(tenant_id)
            
            return subscription
            
        except Exception as e:
            logger.error(f"[SubscriptionService] Error creating/updating subscription for tenant {tenant_id}: {str(e)}")
            raise
    
    @staticmethod
    def get_subscription_plan(tenant_id):
        """
        Get subscription plan for a tenant (simplified method)
        
        Args:
            tenant_id (str): Tenant UUID
            
        Returns:
            str: Subscription plan name ('free', 'professional', 'enterprise')
        """
        subscription = SubscriptionService.get_active_subscription(tenant_id)
        return subscription.selected_plan if subscription else 'free'
    
    @staticmethod
    def is_plan_active(tenant_id, required_plan):
        """
        Check if tenant has an active subscription for required plan or higher
        
        Args:
            tenant_id (str): Tenant UUID
            required_plan (str): Required plan level
            
        Returns:
            bool: True if tenant has required plan or higher
        """
        current_plan = SubscriptionService.get_subscription_plan(tenant_id)
        
        # Plan hierarchy: free < professional < enterprise
        plan_hierarchy = {
            'free': 0,
            'professional': 1,
            'enterprise': 2
        }
        
        current_level = plan_hierarchy.get(current_plan, 0)
        required_level = plan_hierarchy.get(required_plan, 0)
        
        return current_level >= required_level
    
    @staticmethod
    def upgrade_subscription(tenant_id, new_plan):
        """
        Upgrade subscription to a higher plan
        
        Args:
            tenant_id (str): Tenant UUID
            new_plan (str): New subscription plan
            
        Returns:
            Subscription: Updated subscription
        """
        current_subscription = SubscriptionService.get_active_subscription(tenant_id)
        
        if current_subscription:
            # Update existing subscription
            current_subscription.selected_plan = new_plan
            current_subscription.start_date = timezone.now().date()
            current_subscription.save()
            
            logger.info(f"[SubscriptionService] Upgraded subscription for tenant {tenant_id} to {new_plan}")
        else:
            # Create new subscription
            current_subscription = SubscriptionService.create_or_update_subscription(
                tenant_id=tenant_id,
                plan=new_plan
            )
            
        SubscriptionService._clear_subscription_cache(tenant_id)
        return current_subscription
    
    @staticmethod
    def cancel_subscription(tenant_id):
        """
        Cancel subscription (set to inactive)
        
        Args:
            tenant_id (str): Tenant UUID
            
        Returns:
            bool: True if cancelled successfully
        """
        try:
            subscription = SubscriptionService.get_active_subscription(tenant_id)
            if subscription:
                subscription.is_active = False
                subscription.save()
                
                logger.info(f"[SubscriptionService] Cancelled subscription for tenant {tenant_id}")
                SubscriptionService._clear_subscription_cache(tenant_id)
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"[SubscriptionService] Error cancelling subscription for tenant {tenant_id}: {str(e)}")
            return False
    
    @staticmethod
    def _clear_subscription_cache(tenant_id):
        """
        Clear subscription-related caches
        
        Args:
            tenant_id (str): Tenant UUID
        """
        try:
            # Clear user profile caches for all users in this tenant
            from core.cache_service import cache_service
            from custom_auth.models import User
            
            # Find users by business (tenant_id maps to business.id)
            from users.models import UserProfile
            tenant_profiles = UserProfile.objects.filter(business_id=tenant_id)
            for profile in tenant_profiles:
                if profile.user:
                    cache_service.clear_user_profile(profile.user.id)
                
            logger.info(f"[SubscriptionService] Cleared caches for tenant {tenant_id}")
            
        except Exception as e:
            logger.error(f"[SubscriptionService] Error clearing caches for tenant {tenant_id}: {str(e)}")
    
    @staticmethod
    def get_subscription_features(tenant_id):
        """
        Get features available for tenant's subscription plan
        
        Args:
            tenant_id (str): Tenant UUID
            
        Returns:
            dict: Feature flags for the subscription
        """
        plan = SubscriptionService.get_subscription_plan(tenant_id)
        
        # Define features by plan
        features = {
            'free': {
                'max_users': 1,
                'max_storage_gb': 3,
                'advanced_reports': False,
                'api_access': False,
                'priority_support': False,
                'custom_integrations': False
            },
            'professional': {
                'max_users': 10,
                'max_storage_gb': 25,
                'advanced_reports': True,
                'api_access': True,
                'priority_support': False,
                'custom_integrations': False
            },
            'enterprise': {
                'max_users': -1,  # Unlimited
                'max_storage_gb': 100,
                'advanced_reports': True,
                'api_access': True,
                'priority_support': True,
                'custom_integrations': True
            }
        }
        
        return features.get(plan, features['free'])