#!/usr/bin/env python
"""
Fix admin@dottapps.com user to have OWNER role and professional subscription
"""
import os
import sys
import django

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User
from users.models import UserProfile, Business, Subscription

try:
    # Fix the user
    user = User.objects.get(email='admin@dottapps.com')
    print(f"Found user: {user.email}")
    print(f"Current role: {user.role}")
    print(f"Current subscription_plan: {user.subscription_plan}")
    
    # Update to OWNER role and professional plan
    user.role = 'OWNER'
    user.subscription_plan = 'professional'
    user.save()
    
    print(f"Updated role to: {user.role}")
    print(f"Updated subscription_plan to: {user.subscription_plan}")
    
    # Also update the Subscription model if it exists
    try:
        profile = UserProfile.objects.get(user=user)
        if profile.business:
            subscription, created = Subscription.objects.get_or_create(
                business=profile.business,
                defaults={
                    'selected_plan': 'professional',
                    'billing_cycle': 'monthly',
                    'is_active': True,
                    'status': 'active'
                }
            )
            if not created:
                subscription.selected_plan = 'professional'
                subscription.save()
            print(f"Updated business subscription to professional")
    except Exception as e:
        print(f"Could not update business subscription: {e}")
    
    print("Success!")
    
except User.DoesNotExist:
    print("User admin@dottapps.com not found")
except Exception as e:
    print(f"Error: {e}")