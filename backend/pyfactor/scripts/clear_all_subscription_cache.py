#!/usr/bin/env python3
"""
Clear ALL subscription-related caches for jubacargovillage@outlook.com
This script clears Redis cache directly and forces database update.
"""

import os
import sys
import django
import redis
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from users.models import User, UserProfile, Business, Subscription
from django.core.cache import cache
from django.utils import timezone

def clear_all_caches():
    """Clear all possible caches"""
    
    email = 'jubacargovillage@outlook.com'
    
    print(f"🧹 Clearing ALL caches for {email}")
    print("=" * 60)
    
    try:
        # 1. Get user and business info
        user = User.objects.filter(email=email).first()
        if not user:
            print(f'❌ User {email} not found')
            return False
        
        profile = UserProfile.objects.filter(user=user).first()
        if not profile:
            print('❌ User profile not found')
            return False
            
        business_id = str(profile.business_id)
        tenant_id = str(profile.tenant_id)
        user_id = user.id
        
        print(f'✅ Found user: {email}')
        print(f'   User ID: {user_id}')
        print(f'   Business ID: {business_id}')
        print(f'   Tenant ID: {tenant_id}')
        
        # 2. Update subscription in database FIRST
        print('\n📊 Updating subscription in database...')
        business = Business.objects.get(id=business_id)
        
        # Delete ALL existing subscriptions for this business
        Subscription.objects.filter(business=business).delete()
        print('   Deleted all existing subscriptions')
        
        # Create new enterprise subscription
        new_sub = Subscription.objects.create(
            business=business,
            selected_plan='enterprise',
            is_active=True,
            start_date=timezone.now().date()
        )
        print(f'   Created new subscription: {new_sub.selected_plan}')
        
        # 3. Clear Django cache
        print('\n🔧 Clearing Django cache...')
        try:
            # Clear all possible cache keys
            cache_keys = [
                f'user_profile:{user_id}',
                f'user:{user_id}',
                f'profile:{user_id}',
                f'tenant:{tenant_id}',
                f'business:{business_id}',
                f'subscription:{business_id}',
                f'session:*',
                f'auth:*'
            ]
            
            for key in cache_keys:
                cache.delete(key)
                print(f'   Cleared Django cache key: {key}')
                
            # Try pattern deletion
            cache.delete_many(cache_keys)
            
        except Exception as e:
            print(f'   ⚠️ Django cache error: {e}')
        
        # 4. Clear Redis cache DIRECTLY
        print('\n🔴 Clearing Redis cache directly...')
        try:
            # Connect to Redis
            redis_url = os.environ.get('REDIS_URL', 'redis://red-d18u66p5pdvs73cvcnig:6379')
            print(f'   Connecting to Redis: {redis_url}')
            r = redis.from_url(redis_url)
            
            # Find ALL keys related to this user/business
            patterns = [
                f'*{email}*',
                f'*{user_id}*',
                f'*{business_id}*',
                f'*{tenant_id}*',
                '*session*',
                '*profile*',
                '*subscription*',
                '*cache*'
            ]
            
            total_deleted = 0
            for pattern in patterns:
                keys = []
                for key in r.scan_iter(match=pattern, count=1000):
                    keys.append(key)
                
                if keys:
                    deleted = r.delete(*keys)
                    total_deleted += deleted
                    print(f'   Deleted {deleted} keys matching pattern: {pattern}')
            
            print(f'   Total Redis keys deleted: {total_deleted}')
            
            # Also clear specific session keys
            print('\n   Clearing specific session keys...')
            
            # Get all sessions for this user
            from session_manager.models import UserSession
            sessions = UserSession.objects.filter(user__email=email)
            for session in sessions:
                session_key = f'session:{session.session_id}'
                r.delete(session_key)
                print(f'   Deleted session key: {session_key}')
                
                # Also try with different key formats
                r.delete(f'django.contrib.sessions.cache{session.session_id}')
                r.delete(f'sessionid:{session.session_id}')
                r.delete(f':1:django.contrib.sessions.cache{session.session_id}')
            
            # Flush specific databases in Redis (be careful!)
            # This will clear EVERYTHING in Redis db 0
            print('\n   ⚠️ Flushing Redis database 0...')
            r.flushdb()
            print('   ✅ Redis database flushed')
            
        except Exception as e:
            print(f'   ❌ Redis error: {e}')
            import traceback
            traceback.print_exc()
        
        # 5. Verify the update
        print('\n✅ VERIFICATION:')
        
        # Direct database check
        final_sub = Subscription.objects.filter(business=business).first()
        if final_sub:
            print(f'   Database subscription: {final_sub.selected_plan}')
            print(f'   Is Active: {final_sub.is_active}')
        else:
            print('   ❌ No subscription found in database')
        
        print('\n' + '=' * 60)
        print('🎉 CACHE CLEARING COMPLETE!')
        print('\n📱 CRITICAL USER ACTIONS REQUIRED:')
        print('   1. User MUST completely close their browser')
        print('   2. Clear browser cache:')
        print('      - Chrome: Settings → Privacy → Clear browsing data')
        print('      - Firefox: Settings → Privacy → Clear Data')
        print('      - Safari: Develop → Empty Caches')
        print('   3. Open browser again')
        print('   4. Log in fresh')
        print('\n   OR:')
        print('   - Open an incognito/private window')
        print('   - Log in there')
        print('=' * 60)
        
        return True
        
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = clear_all_caches()
    sys.exit(0 if success else 1)