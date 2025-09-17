#!/usr/bin/env python3
"""
Create test consumer account for Steve Majak with phone +211925550100
Run this on Render shell: python manage.py shell < scripts/create_test_consumer_steve.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction
from custom_auth.models import Tenant
from users.models import UserProfile
from onboarding.models import OnboardingProgress

User = get_user_model()

# Test user details - using phone auth format
TEST_PHONE = "+211925550100"
TEST_EMAIL = "phone_211925550100@dottapps.com"  # Phone auth creates this format
TEST_NAME = "Steve Majak"

print("\n" + "="*60)
print(f"CREATING TEST CONSUMER: {TEST_NAME}")
print("="*60)

with transaction.atomic():
    # Check if user exists
    user = User.objects.filter(email=TEST_EMAIL).first()
    
    if user:
        print(f"\nUser already exists: {TEST_EMAIL}")
        print(f"Current status:")
        print(f"  - Has tenant: {'Yes' if user.tenant else 'No'}")
        print(f"  - Onboarding completed: {user.onboarding_completed}")
        
        # Fix missing tenant
        if not user.tenant:
            print("\n⚠️ User missing tenant - creating one...")
            tenant = Tenant.objects.create(
                name=f"User {user.id}",
                owner_id=str(user.id),
                is_active=True,
                rls_enabled=True
            )
            user.tenant = tenant
            user.save()
            print(f"✅ Created tenant ID: {tenant.id}")
            
            # Update profile
            profile = UserProfile.objects.filter(user=user).first()
            if profile:
                if not profile.tenant_id:
                    profile.tenant_id = tenant.id
                # Ensure user_mode is set
                if not hasattr(profile, 'user_mode') or not profile.user_mode:
                    profile.user_mode = 'consumer'
                    profile.default_mode = 'consumer'
                    profile.has_consumer_access = True
                    profile.has_business_access = False
                profile.save()
                print(f"✅ Updated UserProfile with tenant_id and user_mode")
    else:
        print(f"\nCreating new user...")
        
        # Create user
        user = User.objects.create_user(
            email=TEST_EMAIL,
            username=TEST_EMAIL,
            first_name="Steve",
            last_name="Majak",
            phone_number=TEST_PHONE
        )
        user.set_unusable_password()  # Phone auth doesn't use password
        user.save()
        print(f"✅ Created user: {TEST_EMAIL}")
        
        # Create tenant
        tenant = Tenant.objects.create(
            name=f"User {user.id}",
            owner_id=str(user.id),
            is_active=True,
            rls_enabled=True
        )
        user.tenant = tenant
        user.save()
        print(f"✅ Created tenant ID: {tenant.id}")
        
        # Create UserProfile with user_mode
        profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'user_mode': 'consumer',
                'default_mode': 'consumer',
                'has_consumer_access': True,
                'has_business_access': False,
                'tenant_id': tenant.id,
                'onboarding_completed': False
            }
        )
        if created:
            print(f"✅ Created UserProfile with user_mode='consumer'")
        else:
            # Update existing profile
            profile.user_mode = 'consumer'
            profile.default_mode = 'consumer'
            profile.has_consumer_access = True
            profile.tenant_id = tenant.id
            profile.save()
            print(f"✅ Updated UserProfile")
        
        # Create OnboardingProgress
        OnboardingProgress.objects.get_or_create(
            user=user,
            defaults={
                'onboarding_status': 'not_started',
                'current_step': 'business_info',
                'completed_steps': []
            }
        )
        print(f"✅ Created OnboardingProgress")

print("\n" + "="*60)
print("TEST ACCOUNT READY")
print("="*60)
print(f"Phone: {TEST_PHONE}")
print(f"Email: {TEST_EMAIL}")
print(f"Name: {TEST_NAME}")
print("\nThis account:")
print("  - Bypasses SMS verification (returns OTP in response)")
print("  - Has tenant assigned (can register business)")
print("  - Is in consumer mode by default")
print("  - Can switch to business mode after registering courier")
print("="*60 + "\n")