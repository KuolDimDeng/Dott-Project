#!/usr/bin/env python3
"""
Nuclear option - Clear ALL caches and force subscription update.
This will:
1. Flush entire Redis database
2. Delete and recreate subscription
3. Invalidate all sessions to force fresh login
"""

import os
import sys
import django
import redis

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from users.models import User, UserProfile, Business, Subscription
from session_manager.models import Session
from django.utils import timezone
from django.core.cache import cache

def nuclear_clear():
    """Nuclear option - clear everything"""
    
    email = 'jubacargovillage@outlook.com'
    
    print("☢️  NUCLEAR CACHE CLEAR")
    print("=" * 60)
    print("WARNING: This will force ALL users to re-login!")
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
        print(f'   Business: {business.name}')
        print(f'   Current plan in DB: {Subscription.objects.filter(business=business).first()}')
        
        # 2. NUCLEAR: Flush entire Redis database
        print('\n☢️  FLUSHING ENTIRE REDIS DATABASE...')
        try:
            redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
            r = redis.from_url(redis_url)
            
            # This deletes EVERYTHING in Redis
            r.flushall()
            print('   ✅ Redis completely flushed - ALL cache cleared')
        except Exception as e:
            print(f'   ❌ Redis error: {e}')
        
        # 3. Clear Django cache
        print('\n🔧 Clearing Django cache...')
        try:
            cache.clear()
            print('   ✅ Django cache cleared')
        except Exception as e:
            print(f'   ⚠️ Django cache error: {e}')
        
        # 4. Delete ALL sessions (force re-login)
        print('\n🔒 Invalidating ALL sessions...')
        session_count = Session.objects.all().count()
        Session.objects.all().delete()
        print(f'   ✅ Deleted {session_count} sessions - ALL users must re-login')
        
        # 5. Update subscription
        print('\n📊 Updating subscription to ENTERPRISE...')
        
        # Delete all existing subscriptions
        Subscription.objects.filter(business=business).delete()
        print('   Deleted old subscriptions')
        
        # Create new enterprise subscription with explicit fields
        new_sub = Subscription.objects.create(
            business=business,
            selected_plan='enterprise',
            is_active=True,
            start_date=timezone.now().date(),
            next_billing_date=timezone.now().date() + timezone.timedelta(days=30),
            stripe_subscription_id='manual_enterprise_' + str(timezone.now().timestamp())
        )
        print(f'   ✅ Created new subscription: {new_sub.selected_plan}')
        print(f'      ID: {new_sub.id}')
        print(f'      Active: {new_sub.is_active}')
        print(f'      Start: {new_sub.start_date}')
        
        # 6. Verify in database
        print('\n✅ VERIFICATION:')
        final_sub = Subscription.objects.filter(business=business).first()
        if final_sub:
            print(f'   Database shows: {final_sub.selected_plan}')
            print(f'   Subscription ID: {final_sub.id}')
            print(f'   Is Active: {final_sub.is_active}')
        else:
            print('   ❌ No subscription in database!')
        
        # 7. Also update the user profile directly (belt and suspenders)
        profile.subscription_plan = 'enterprise'
        profile.save()
        print(f'\n   Also updated UserProfile.subscription_plan to: {profile.subscription_plan}')
        
        # 8. Update the business model if it has a subscription field
        if hasattr(business, 'subscription_plan'):
            business.subscription_plan = 'enterprise'
            business.save()
            print(f'   Also updated Business.subscription_plan to: {business.subscription_plan}')
        
        print('\n' + '=' * 60)
        print('☢️  NUCLEAR CLEAR COMPLETE!')
        print('\n📱 CRITICAL: User MUST now:')
        print('   1. LOG OUT completely')
        print('   2. Clear browser cache (Ctrl+Shift+Delete)')
        print('   3. Close browser completely')
        print('   4. Open browser and log in fresh')
        print('\nThe dashboard will show ENTERPRISE after fresh login.')
        print('=' * 60)
        
        return True
        
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = nuclear_clear()
    sys.exit(0 if success else 1)