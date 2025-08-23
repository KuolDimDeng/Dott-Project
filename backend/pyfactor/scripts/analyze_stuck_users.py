#!/usr/bin/env python
"""
Quick analysis of stuck users to understand their state
"""

import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import UserProfile, Business
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession
from django.utils import timezone

User = get_user_model()

def analyze_stuck_users():
    """Analyze users who are stuck"""
    
    stuck_emails = ['test@example.com', 'kuoltest01@gmail.com']
    
    for email in stuck_emails:
        try:
            user = User.objects.get(email=email)
            profile = UserProfile.objects.filter(user=user).first()
            progress = OnboardingProgress.objects.filter(user=user).first()
            sessions = UserSession.objects.filter(user=user, is_active=True).count()
            
            print(f"\n{'='*60}")
            print(f"USER: {email}")
            print(f"{'='*60}")
            
            print(f"User ID: {user.id}")
            print(f"Date Joined: {user.date_joined}")
            print(f"Onboarding Completed: {user.onboarding_completed}")
            print(f"Active Sessions: {sessions}")
            
            if profile:
                print(f"\nUserProfile:")
                print(f"  - Tenant ID: {profile.tenant_id}")
                print(f"  - Business ID: {profile.business_id}")
                
                # Check if tenant exists
                if profile.tenant_id:
                    try:
                        tenant = Tenant.objects.get(id=profile.tenant_id)
                        print(f"  - Tenant Name: {tenant.name}")
                        print(f"  - Tenant Active: {tenant.is_active}")
                    except Tenant.DoesNotExist:
                        print(f"  - ⚠️ Tenant ID exists but Tenant not found!")
                
                # Check if business exists
                if profile.business_id:
                    try:
                        business = Business.objects.get(id=profile.business_id)
                        print(f"  - Business Name: {business.name}")
                        print(f"  - Business Active: {business.is_active}")
                    except Business.DoesNotExist:
                        print(f"  - ⚠️ Business ID exists but Business not found!")
            else:
                print(f"\n⚠️ No UserProfile found")
            
            if progress:
                print(f"\nOnboardingProgress:")
                print(f"  - Status: {progress.onboarding_status}")
                print(f"  - Current Step: {progress.current_step}")
                print(f"  - Completed Steps: {progress.completed_steps}")
                print(f"  - Selected Plan: {progress.selected_plan}")
            else:
                print(f"\n⚠️ No OnboardingProgress found")
            
            # Recommendation
            print(f"\n🎯 Recommendation:")
            if profile and (profile.tenant_id or profile.business_id):
                if progress and len(progress.completed_steps) >= 3:
                    print(f"  → Mark as complete (has data and most steps done)")
                else:
                    print(f"  → Mark as complete (has tenant/business, likely old user)")
            else:
                print(f"  → Let them complete onboarding normally")
                
        except User.DoesNotExist:
            print(f"\n❌ User not found: {email}")

if __name__ == "__main__":
    analyze_stuck_users()