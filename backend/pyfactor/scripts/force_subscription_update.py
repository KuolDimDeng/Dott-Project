#!/usr/bin/env python3
"""
Force subscription update and cache clear for jubacargovillage@outlook.com
Run this directly on the server to ensure the subscription is updated.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from users.models import User, UserProfile, Business, Subscription
from users.subscription_service import SubscriptionService
from core.cache_service import cache_service
from django.utils import timezone
import redis
import json

def force_update_subscription():
    """Force update subscription and clear all caches"""
    
    email = 'jubacargovillage@outlook.com'
    
    print(f"🔧 Force updating subscription for {email}")
    print("=" * 60)
    
    try:
        # 1. Find the user
        user = User.objects.filter(email=email).first()
        if not user:
            print(f'❌ User {email} not found')
            return False
        
        print(f'✅ Found user: {user.email} (ID: {user.id})')
        
        # 2. Get user profile
        profile = UserProfile.objects.filter(user=user).first()
        if not profile:
            print('❌ User profile not found')
            return False
        
        print(f'✅ Found profile:')
        print(f'   Business ID: {profile.business_id}')
        print(f'   Tenant ID: {profile.tenant_id}')
        
        # 3. Get the business
        business = Business.objects.filter(id=profile.business_id).first()
        if not business:
            # If no business, try using tenant_id as business_id (they're the same in this architecture)
            business = Business.objects.filter(id=profile.tenant_id).first()
            if not business:
                print('❌ Business not found')
                return False
        
        print(f'✅ Found business: {business.name} (ID: {business.id})')
        
        # 4. Check current subscription
        print('\n📊 Current subscription status:')
        current_sub = Subscription.objects.filter(business=business).first()
        if current_sub:
            print(f'   Plan: {current_sub.selected_plan}')
            print(f'   Active: {current_sub.is_active}')
            print(f'   Start Date: {current_sub.start_date}')
        else:
            print('   No subscription found')
        
        # 5. Force update subscription
        print('\n🔄 Force updating subscription to ENTERPRISE...')
        
        # Delete any existing subscription first
        if current_sub:
            current_sub.delete()
            print('   Deleted old subscription')
        
        # Create new enterprise subscription
        new_sub = Subscription.objects.create(
            business=business,
            selected_plan='enterprise',
            is_active=True,
            start_date=timezone.now().date()
        )
        print(f'   Created new subscription: {new_sub.selected_plan}')
        
        # 6. Clear ALL caches
        print('\n🧹 Clearing all caches...')
        
        # Clear Django cache
        try:
            cache_service.clear_user_profile(user.id)
            print('   ✅ Cleared Django user profile cache')
        except:
            print('   ⚠️  Could not clear Django cache')
        
        # Clear Redis cache
        try:
            redis_client = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379'))
            
            # Clear user profile cache
            cache_keys = [
                f'user_profile:{user.id}',
                f'user:{user.id}',
                f'profile:{user.id}',
                f'tenant:{profile.tenant_id}',
                f'business:{business.id}',
                f'subscription:{business.id}'
            ]
            
            for key in cache_keys:
                redis_client.delete(key)
                print(f'   ✅ Deleted Redis key: {key}')
            
            # Clear session caches
            pattern = f'*{user.email}*'
            for key in redis_client.scan_iter(match=pattern):
                redis_client.delete(key)
                print(f'   ✅ Deleted Redis key matching email: {key.decode() if isinstance(key, bytes) else key}')
                
        except Exception as e:
            print(f'   ⚠️  Redis cache clear error: {e}')
        
        # 7. Verify the update
        print('\n✅ VERIFICATION:')
        
        # Direct database check
        final_sub = Subscription.objects.filter(business=business).first()
        print(f'   Database subscription: {final_sub.selected_plan if final_sub else "NOT FOUND"}')
        
        # Service check
        service_plan = SubscriptionService.get_subscription_plan(str(business.id))
        print(f'   Service subscription: {service_plan}')
        
        # Force clear service cache one more time
        SubscriptionService._clear_subscription_cache(str(business.id))
        print(f'   Cache cleared again')
        
        print('\n' + '=' * 60)
        print('🎉 SUBSCRIPTION UPDATE COMPLETE!')
        print(f'   User: {email}')
        print(f'   Plan: ENTERPRISE')
        print(f'   Status: ACTIVE')
        print('\n📱 IMPORTANT: User must:')
        print('   1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)')
        print('   2. Log out and log back in')
        print('   3. Or wait 5 minutes for cache to expire')
        print('=' * 60)
        
        return True
        
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = force_update_subscription()
    sys.exit(0 if success else 1)