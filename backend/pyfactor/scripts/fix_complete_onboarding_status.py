#!/usr/bin/env python3
"""
Comprehensive fix for onboarding status issues
Fixes both onboarding status and session creation problems
"""

import os
import sys
import django
from django.utils import timezone
from django.db import transaction

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User, Tenant
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession
from users.models import Business, Subscription

def fix_user_onboarding(email):
    """Fix onboarding status comprehensively"""
    
    print(f"\n=== Fixing onboarding for {email} ===\n")
    
    try:
        with transaction.atomic():
            # Find the user
            user = User.objects.get(email=email)
            print(f"✅ Found user: {user.email} (ID: {user.id})")
            print(f"   - Auth0 Sub: {user.auth0_sub}")
            print(f"   - Active: {user.is_active}")
            
            # Check tenant
            tenant = None
            if hasattr(user, 'tenant') and user.tenant:
                tenant = user.tenant
                print(f"\n✅ User has tenant: {tenant.id}")
                print(f"   - Name: {tenant.name}")
            else:
                # Try to find tenant by owner_id
                tenants = Tenant.objects.filter(owner_id=str(user.id))
                if tenants.exists():
                    tenant = tenants.first()
                    user.tenant = tenant
                    user.save(update_fields=['tenant'])
                    print(f"\n✅ Found and linked tenant: {tenant.id}")
                    print(f"   - Name: {tenant.name}")
                else:
                    print(f"\n❌ No tenant found for user")
                    return
            
            # Fix OnboardingProgress
            try:
                progress = OnboardingProgress.objects.get(user=user)
                print(f"\n📋 Current onboarding progress:")
                print(f"   - Status: {progress.onboarding_status}")
                print(f"   - Current step: {progress.current_step}")
                print(f"   - Setup completed: {progress.setup_completed}")
                print(f"   - Payment completed: {progress.payment_completed}")
                print(f"   - Subscription plan: {progress.subscription_plan}")
                
                # Check if payment was actually completed
                if progress.payment_completed and progress.subscription_plan in ['professional', 'enterprise']:
                    print(f"\n✅ Payment was completed for {progress.subscription_plan} plan")
                    print("🔧 Fixing onboarding status...")
                    
                    # Update all fields to ensure completion
                    progress.onboarding_status = 'complete'
                    progress.current_step = 'complete'
                    progress.setup_completed = True
                    progress.setup_timestamp = progress.setup_timestamp or timezone.now()
                    progress.completed_at = progress.completed_at or timezone.now()
                    
                    # Ensure completed_steps includes all steps
                    if progress.completed_steps is None:
                        progress.completed_steps = []
                    
                    required_steps = ['business_info', 'subscription', 'payment', 'setup', 'complete']
                    for step in required_steps:
                        if step not in progress.completed_steps:
                            progress.completed_steps.append(step)
                    
                    # Ensure tenant_id is set
                    if not progress.tenant_id and tenant:
                        progress.tenant_id = tenant.id
                    
                    progress.save()
                    
                    print(f"\n✅ Updated onboarding progress:")
                    print(f"   - Status: {progress.onboarding_status}")
                    print(f"   - Current step: {progress.current_step}")
                    print(f"   - Setup completed: {progress.setup_completed}")
                    print(f"   - Completed steps: {progress.completed_steps}")
                else:
                    print(f"\n⚠️  Payment not completed or free plan - not updating status")
                    
            except OnboardingProgress.DoesNotExist:
                print(f"\n❌ No onboarding progress found")
                
            # Update user's needs_onboarding field
            if hasattr(user, 'needs_onboarding'):
                user.needs_onboarding = False
                user.save(update_fields=['needs_onboarding'])
                print(f"\n✅ Updated user.needs_onboarding to False")
            
            # Check Business and Subscription
            try:
                from users.models import UserProfile
                profile = UserProfile.objects.get(user=user)
                if profile.business:
                    print(f"\n🏢 Business: {profile.business.name}")
                    
                    # Check subscription
                    try:
                        subscription = Subscription.objects.get(business=profile.business)
                        print(f"   - Subscription plan: {subscription.selected_plan}")
                        print(f"   - Active: {subscription.is_active}")
                        
                        # Update subscription if needed
                        if progress.subscription_plan in ['professional', 'enterprise']:
                            subscription.selected_plan = progress.subscription_plan
                            subscription.is_active = True
                            subscription.save()
                            print(f"   - ✅ Updated subscription to {progress.subscription_plan}")
                    except Subscription.DoesNotExist:
                        print(f"   - ❌ No subscription found")
                        
            except UserProfile.DoesNotExist:
                print(f"\n⚠️  No user profile found")
                
            # Clear any active sessions to force fresh login
            active_sessions = UserSession.objects.filter(
                user=user,
                expires_at__gt=timezone.now()
            )
            session_count = active_sessions.count()
            if session_count > 0:
                active_sessions.delete()
                print(f"\n🧹 Cleared {session_count} active session(s)")
            
            # Verify the fix
            progress.refresh_from_db()
            print(f"\n✅ Final verification:")
            print(f"   - Onboarding status: {progress.onboarding_status}")
            print(f"   - Setup completed: {progress.setup_completed}")
            print(f"   - User tenant: {user.tenant_id if hasattr(user, 'tenant_id') else 'N/A'}")
            
            print(f"\n✅ Successfully fixed onboarding for {email}")
            print("\n💡 Next steps:")
            print("   1. User should clear browser cache/cookies")
            print("   2. Sign in again at https://dottapps.com/auth/signin")
            print("   3. Should be redirected to dashboard, not onboarding")
            
    except User.DoesNotExist:
        print(f"\n❌ User {email} not found")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Fix support@dottapps.com
    fix_user_onboarding('support@dottapps.com')