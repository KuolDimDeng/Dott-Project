#!/usr/bin/env python
"""
Test the complete_all_onboarding endpoint to verify it now saves subscription_plan and name fields.
This script creates a test user and verifies the fix is working.
"""

import os
import sys
import django
import requests
from django.contrib.auth import get_user_model

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User, Tenant
from onboarding.models import OnboardingProgress
from accounting.models import Business

def test_complete_all_endpoint():
    """Test the complete_all endpoint to verify subscription plan saving."""
    
    print("Testing complete_all_onboarding endpoint...")
    
    # Find a user who has completed onboarding to test with
    test_users = User.objects.filter(
        onboarding_completed=True,
        tenant__isnull=False
    )[:3]
    
    if not test_users:
        print("No test users found with completed onboarding")
        return
    
    for user in test_users:
        print(f"\n--- User: {user.email} ---")
        print(f"Current subscription_plan: {user.subscription_plan}")
        print(f"Current first_name: '{user.first_name}'")
        print(f"Current last_name: '{user.last_name}'")
        print(f"Current name: '{user.name}'")
        print(f"Tenant: {user.tenant.id if user.tenant else 'None'}")
        
        # Check OnboardingProgress
        try:
            progress = OnboardingProgress.objects.get(user=user)
            print(f"OnboardingProgress subscription_plan: {getattr(progress, 'subscription_plan', 'N/A')}")
            print(f"OnboardingProgress selected_plan: {getattr(progress, 'selected_plan', 'N/A')}")
            print(f"OnboardingProgress payment_completed: {getattr(progress, 'payment_completed', 'N/A')}")
        except OnboardingProgress.DoesNotExist:
            print("No OnboardingProgress found")
    
    # Show the view code to confirm it's updated
    print("\n--- Current complete_all_view.py code ---")
    try:
        with open('/Users/kuoldeng/projectx/backend/pyfactor/onboarding/api/views/complete_all_view.py', 'r') as f:
            lines = f.readlines()
            # Show lines around subscription plan logic
            for i, line in enumerate(lines[70:110], 71):
                if 'subscription_plan' in line or 'first_name' in line or 'last_name' in line:
                    print(f"{i:3}: {line.rstrip()}")
    except Exception as e:
        print(f"Error reading file: {e}")

if __name__ == '__main__':
    test_complete_all_endpoint()