#!/usr/bin/env python
"""
Fix edge case where users have tenant_id in session but not in UserProfile.
This can happen during OAuth login when session gets tenant but UserProfile doesn't get updated.
"""

import os
import sys
import django
import json

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.conf import settings
from users.models import UserProfile
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession
import redis

User = get_user_model()

def get_redis_client():
    """Get Redis client for session data"""
    try:
        redis_url = getattr(settings, 'REDIS_URL', None)
        if redis_url:
            return redis.from_url(redis_url, decode_responses=True)
    except Exception as e:
        print(f"Could not connect to Redis: {e}")
    return None

def get_session_tenant_id(user):
    """Get tenant_id from user's active session"""
    from django.utils import timezone
    
    # Check active sessions
    active_sessions = UserSession.objects.filter(
        user=user,
        is_active=True,
        expires_at__gt=timezone.now()
    ).order_by('-last_activity')
    
    if not active_sessions:
        return None
    
    # First check if session has tenant field directly
    for session in active_sessions:
        if session.tenant_id:
            return str(session.tenant_id)
    
    # Also check session_data JSON field
    for session in active_sessions:
        if session.session_data and isinstance(session.session_data, dict):
            tenant_id = session.session_data.get('tenant_id')
            if tenant_id:
                return str(tenant_id)
    
    # Try to get from Redis if available
    redis_client = get_redis_client()
    if redis_client:
        for session in active_sessions:
            try:
                # Use session_id, not session_token
                session_key = f"session:{session.session_id}"
                session_data = redis_client.get(session_key)
                if session_data:
                    data = json.loads(session_data)
                    if 'tenant_id' in data:
                        return str(data['tenant_id'])
            except Exception as e:
                print(f"Error reading Redis session data: {e}")
    
    return None

def analyze_edge_case(email):
    """Analyze if user has the session-UserProfile tenant mismatch"""
    try:
        user = User.objects.get(email=email)
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        print(f"\n{'='*60}")
        print(f"EDGE CASE ANALYSIS: {email}")
        print(f"{'='*60}")
        
        # Basic info
        print(f"\n📊 Current Status:")
        print(f"  - User.onboarding_completed: {user.onboarding_completed}")
        print(f"  - UserProfile.tenant_id: {profile.tenant_id}")
        print(f"  - UserProfile.business_id: {profile.business_id}")
        
        # Check if user owns any tenants
        owned_tenants = Tenant.objects.filter(owner=user)
        if owned_tenants.exists():
            print(f"\n📁 User owns {owned_tenants.count()} tenant(s):")
            for tenant in owned_tenants:
                print(f"  - {tenant.id}: {tenant.name} (active: {tenant.is_active})")
                
                # This is the edge case - user owns tenant but profile doesn't have it
                if not profile.tenant_id:
                    print(f"\n⚠️ EDGE CASE DETECTED!")
                    print(f"  User owns tenant {tenant.id} but UserProfile.tenant_id is None")
                    return 'owns_tenant_no_profile', str(tenant.id)
        
        # Check for session tenant_id
        session_tenant_id = get_session_tenant_id(user)
        if session_tenant_id:
            print(f"  - Session tenant_id: {session_tenant_id}")
            
            if not profile.tenant_id:
                print(f"\n⚠️ EDGE CASE DETECTED!")
                print(f"  Session has tenant_id but UserProfile doesn't")
                return 'edge_case', session_tenant_id
            elif str(profile.tenant_id) != str(session_tenant_id):
                print(f"\n⚠️ MISMATCH DETECTED!")
                print(f"  Session tenant_id doesn't match UserProfile")
                return 'mismatch', session_tenant_id
        else:
            print(f"  - No active session with tenant_id found")
        
        # Check if tenant exists
        if session_tenant_id:
            try:
                tenant = Tenant.objects.get(id=session_tenant_id)
                print(f"\n✅ Tenant exists: {tenant.name}")
                print(f"  - Owner: {tenant.owner.email}")
                print(f"  - Active: {tenant.is_active}")
            except Tenant.DoesNotExist:
                print(f"\n❌ Tenant ID {session_tenant_id} not found in database!")
                return 'invalid_tenant', session_tenant_id
        
        return 'normal', None
        
    except User.DoesNotExist:
        print(f"❌ User not found: {email}")
        return None, None

def fix_edge_case(email, force=False):
    """Fix the edge case by syncing session tenant_id to UserProfile"""
    
    status, tenant_id_to_use = analyze_edge_case(email)
    
    if not status or status == 'normal':
        print(f"\n✅ No edge case detected for {email}")
        return False
    
    if status == 'invalid_tenant':
        print(f"\n❌ Cannot fix - tenant {tenant_id_to_use} doesn't exist")
        return False
    
    user = User.objects.get(email=email)
    profile, _ = UserProfile.objects.get_or_create(user=user)
    
    print(f"\n🔧 Applying Fix...")
    
    if status in ['edge_case', 'mismatch', 'owns_tenant_no_profile']:
        # Verify tenant exists and user has permission
        try:
            tenant = Tenant.objects.get(id=tenant_id_to_use)
            
            # Update UserProfile with the correct tenant_id
            old_tenant_id = profile.tenant_id
            profile.tenant_id = tenant_id_to_use
            profile.save()
            
            print(f"  ✅ Updated UserProfile.tenant_id: {old_tenant_id} → {tenant_id_to_use}")
            
            # If user has business_id but no tenant_id was set, update business tenant too
            if profile.business_id:
                from users.models import Business
                try:
                    business = Business.objects.get(id=profile.business_id)
                    if not business.tenant_id or business.tenant_id != tenant.id:
                        business.tenant = tenant
                        business.save()
                        print(f"  ✅ Updated Business tenant association")
                except Business.DoesNotExist:
                    pass
            
            # Ensure OnboardingProgress exists
            progress, created = OnboardingProgress.objects.get_or_create(
                user=user,
                defaults={
                    'onboarding_status': 'in_progress',
                    'current_step': 'business_info',
                    'completed_steps': []
                }
            )
            
            if created:
                print(f"  ✅ Created OnboardingProgress record")
            
            print(f"\n✅ Edge case fixed successfully!")
            return True
            
        except Tenant.DoesNotExist:
            print(f"  ❌ Tenant {session_tenant_id} not found")
            return False
        except Exception as e:
            print(f"  ❌ Error: {str(e)}")
            return False
    
    return False

def scan_for_edge_cases():
    """Scan all users for this edge case"""
    
    print("\n" + "="*60)
    print("SCANNING FOR EDGE CASES")
    print("="*60)
    
    edge_cases = []
    
    # Find users with active sessions
    active_user_ids = UserSession.objects.filter(
        is_active=True,
        expires_at__gt=datetime.now()
    ).values_list('user_id', flat=True).distinct()
    
    users_with_sessions = User.objects.filter(id__in=active_user_ids)
    
    print(f"\nChecking {users_with_sessions.count()} users with active sessions...")
    
    for user in users_with_sessions:
        profile = UserProfile.objects.filter(user=user).first()
        
        # Skip if profile already has tenant_id
        if profile and profile.tenant_id:
            continue
        
        # Check if session has tenant_id
        session_tenant_id = get_session_tenant_id(user)
        if session_tenant_id:
            edge_cases.append({
                'email': user.email,
                'session_tenant_id': session_tenant_id,
                'profile_tenant_id': profile.tenant_id if profile else None
            })
            print(f"  ⚠️ {user.email} - Session has tenant but profile doesn't")
    
    print(f"\n📊 Results:")
    print(f"  Found {len(edge_cases)} users with edge case")
    
    if edge_cases:
        print(f"\n⚠️ Users with edge case:")
        for case in edge_cases:
            print(f"  - {case['email']}: session={case['session_tenant_id']}, profile={case['profile_tenant_id']}")
    
    return edge_cases

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Fix session-UserProfile tenant mismatch edge case')
    parser.add_argument('--email', help='Fix specific user')
    parser.add_argument('--scan', action='store_true', help='Scan for all edge cases')
    parser.add_argument('--fix-all', action='store_true', help='Fix all detected edge cases')
    parser.add_argument('--force', action='store_true', help='Force fix even if checks fail')
    
    args = parser.parse_args()
    
    if args.email:
        fix_edge_case(args.email, force=args.force)
        
    elif args.scan:
        scan_for_edge_cases()
        
    elif args.fix_all:
        edge_cases = scan_for_edge_cases()
        
        if edge_cases:
            print(f"\n🔧 Found {len(edge_cases)} edge cases")
            response = input("Fix them all? (yes/no): ")
            
            if response.lower() == 'yes':
                fixed = 0
                for case in edge_cases:
                    print(f"\nFixing {case['email']}...")
                    try:
                        if fix_edge_case(case['email']):
                            fixed += 1
                    except Exception as e:
                        print(f"  ❌ Error: {str(e)}")
                
                print(f"\n✅ Fixed {fixed}/{len(edge_cases)} users")
    else:
        print("Usage:")
        print("  python fix_onboarding_edge_case.py --email user@example.com")
        print("  python fix_onboarding_edge_case.py --scan")
        print("  python fix_onboarding_edge_case.py --fix-all")

if __name__ == "__main__":
    main()