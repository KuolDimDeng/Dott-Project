#!/usr/bin/env python3
"""
Fix subscription for jubacargovillage@outlook.com using single source of truth
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from users.models import User, UserProfile, Business, Subscription
from users.subscription_service import SubscriptionService
from session_manager.models import UserSession
from django.utils import timezone
from django.core.cache import cache
import redis

def fix_subscription():
    """Fix subscription using single source of truth"""
    
    email = 'jubacargovillage@outlook.com'
    
    print("🔧 FIXING SUBSCRIPTION WITH SINGLE SOURCE OF TRUTH")
    print("=" * 60)
    
    try:
        # 1. Get user and business
        user = User.objects.filter(email=email).first()
        if not user:
            print(f'❌ User {email} not found')
            return False
        
        profile = UserProfile.objects.filter(user=user).first()
        if not profile:
            print('❌ User profile not found')
            return False
            
        business = Business.objects.get(id=profile.business_id)
        
        print(f'✅ Found user: {email}')
        print(f'   Business: {business.name} (ID: {business.id})')
        
        # 2. Check current subscription
        print('\n📊 Current subscription status:')
        current_sub = Subscription.objects.filter(business=business).first()
        if current_sub:
            print(f'   Database: {current_sub.selected_plan}')
        else:
            print('   Database: No subscription found')
        
        # Check what SubscriptionService returns
        service_plan = SubscriptionService.get_subscription_plan(str(business.id))
        print(f'   SubscriptionService: {service_plan}')
        
        # 3. Update subscription in database
        print('\n🔄 Updating subscription to ENTERPRISE...')
        
        # Delete all existing subscriptions
        Subscription.objects.filter(business=business).delete()
        
        # Create new enterprise subscription
        new_sub = Subscription.objects.create(
            business=business,
            selected_plan='enterprise',
            is_active=True,
            start_date=timezone.now().date()
        )
        print(f'   ✅ Created new subscription: {new_sub.selected_plan}')
        
        # 4. Clear SubscriptionService cache
        print('\n🧹 Clearing SubscriptionService cache...')
        SubscriptionService._clear_subscription_cache(str(business.id))
        print('   ✅ Cache cleared')
        
        # 5. Update all active sessions for this user
        print('\n🔄 Updating user sessions...')
        sessions = UserSession.objects.filter(user=user, is_active=True)
        for session in sessions:
            session.subscription_plan = 'enterprise'
            session.save(update_fields=['subscription_plan'])
            print(f'   ✅ Updated session {session.session_id}')
        
        # 6. Clear Redis cache
        print('\n🧹 Clearing Redis cache...')
        try:
            redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
            r = redis.from_url(redis_url)
            
            # Clear specific keys
            patterns = [
                f'*{email}*',
                f'*{user.id}*',
                f'*{business.id}*',
                f'subscription:*',
                f'session:*',
                f'user_profile:*'
            ]
            
            for pattern in patterns:
                keys = list(r.scan_iter(match=pattern, count=100))
                if keys:
                    r.delete(*keys)
                    print(f'   Cleared {len(keys)} keys matching: {pattern}')
        except Exception as e:
            print(f'   ⚠️ Redis error: {e}')
        
        # 7. Verify the update
        print('\n✅ VERIFICATION:')
        
        # Check database
        final_sub = Subscription.objects.filter(business=business).first()
        print(f'   Database: {final_sub.selected_plan if final_sub else "NOT FOUND"}')
        
        # Check SubscriptionService (single source of truth)
        service_plan = SubscriptionService.get_subscription_plan(str(business.id))
        print(f'   SubscriptionService: {service_plan}')
        
        # Check sessions
        active_sessions = UserSession.objects.filter(user=user, is_active=True)
        for session in active_sessions:
            print(f'   Session {session.session_id}: {session.subscription_plan}')
        
        print('\n' + '=' * 60)
        print('🎉 SUBSCRIPTION FIX COMPLETE!')
        print('\n📱 User should now:')
        print('   1. Clear browser cache (Ctrl+Shift+R)')
        print('   2. Or log out and log back in')
        print('\nThe dashboard will show ENTERPRISE from the single source of truth.')
        print('=' * 60)
        
        return True
        
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = fix_subscription()
    sys.exit(0 if success else 1)