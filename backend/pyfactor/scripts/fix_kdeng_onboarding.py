#!/usr/bin/env python
"""
Quick fix script for kdeng@dottapps.com onboarding status
"""

import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dott_project.settings')
django.setup()

from custom_auth.models import CustomUser
from onboarding.models import OnboardingProgress
from tenant.models import Tenant
from django.db import transaction
from datetime import datetime, timezone

def fix_kdeng_onboarding():
    """Fix onboarding status for kdeng@dottapps.com"""
    
    email = 'kdeng@dottapps.com'
    
    try:
        # Get user
        user = CustomUser.objects.get(email=email)
        print(f"✅ Found user: {email}")
        print(f"   - User ID: {user.id}")
        print(f"   - Tenant ID: {user.tenant_id}")
        
        # Get or create OnboardingProgress
        progress, created = OnboardingProgress.objects.get_or_create(
            user=user,
            defaults={
                'tenant_id': user.tenant_id,
                'onboarding_status': 'complete',
                'current_step': 'complete',
                'setup_completed': True
            }
        )
        
        if created:
            print("✅ Created new OnboardingProgress record")
        else:
            print(f"📋 Found existing OnboardingProgress:")
            print(f"   - Current status: {progress.onboarding_status}")
            print(f"   - Setup completed: {progress.setup_completed}")
        
        # Update to complete status
        with transaction.atomic():
            progress.onboarding_status = 'complete'
            progress.current_step = 'complete'
            progress.setup_completed = True
            progress.business_info_completed = True
            progress.subscription_selected = True
            progress.payment_completed = True  # Mark as complete for professional plan
            
            # Ensure tenant_id is set
            if not progress.tenant_id and user.tenant_id:
                progress.tenant_id = user.tenant_id
            
            # Set completed_at if not set
            if not progress.completed_at:
                progress.completed_at = datetime.now(timezone.utc)
            
            # Add completed steps
            if not isinstance(progress.completed_steps, list):
                progress.completed_steps = []
            
            required_steps = ['business_info', 'subscription', 'payment', 'complete']
            for step in required_steps:
                if step not in progress.completed_steps:
                    progress.completed_steps.append(step)
            
            progress.save()
            
            print(f"\n✅ Updated OnboardingProgress:")
            print(f"   - Status: {progress.onboarding_status}")
            print(f"   - Setup completed: {progress.setup_completed}")
            print(f"   - Completed steps: {progress.completed_steps}")
            print(f"   - Tenant ID: {progress.tenant_id}")
        
        # Clear user sessions to force refresh
        try:
            from session_manager.models import UserSession
            sessions_deleted = UserSession.objects.filter(user=user).delete()[0]
            if sessions_deleted > 0:
                print(f"\n🔄 Cleared {sessions_deleted} active sessions")
        except:
            print("\n⚠️  Could not clear sessions")
        
        print(f"\n✅ Successfully fixed onboarding status for {email}")
        print("\n🎯 Next steps:")
        print("1. Clear browser cache and cookies")
        print("2. Sign in again")
        print("3. You should be redirected to the dashboard")
        
        return True
        
    except CustomUser.DoesNotExist:
        print(f"❌ User {email} not found")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    fix_kdeng_onboarding()