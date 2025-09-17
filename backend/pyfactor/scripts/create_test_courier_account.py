#!/usr/bin/env python
"""
Script to create a test courier account using MTN test number
This uses the MTN-provided test number for development purposes
Run from Django shell: python manage.py shell < scripts/create_test_courier_account.py
"""

from django.contrib.auth import get_user_model
from users.models import UserProfile
from django.db import transaction
from django.utils import timezone

User = get_user_model()

# MTN Test number for development (555 numbers are standard test numbers)
TEST_PHONE = "+211925550100"  # MTN test number format
TEST_EMAIL = "steve.majak@testcourier.com"
TEST_NAME = "Steve Majak"

try:
    with transaction.atomic():
        # Check if user already exists
        existing_user = User.objects.filter(email=TEST_EMAIL).first()
        
        if existing_user:
            print(f"✅ Test user already exists: {TEST_EMAIL}")
            user = existing_user
        else:
            # Create new test user
            user = User.objects.create_user(
                email=TEST_EMAIL,
                password="Courier123!",
                first_name="Steve",
                last_name="Majak"
            )
            print(f"✅ Created new test user: {TEST_EMAIL}")
        
        # Create or update UserProfile
        profile, created = UserProfile.objects.update_or_create(
            user=user,
            defaults={
                'phone_number': TEST_PHONE,
                'phone_verified': True,  # Mark as verified for testing
                'country': 'SS',  # South Sudan
                'city': 'Juba',
                'business_type': 'TRANSPORT',  # For courier business
                'business_name': 'Steve Majak Courier Services',
                'is_active': True,
                'onboarding_completed': False,  # So they can go through onboarding
                'preferred_currency_code': 'SSP',
                'preferred_currency_name': 'South Sudanese Pound',
                'preferred_currency_symbol': 'SSP'
            }
        )
        
        if created:
            print("✅ Created new user profile")
        else:
            print("✅ Updated existing user profile")
        
        # Set user as verified (for testing)
        user.is_active = True
        user.save()
        
        print(f"""
        ========================================
        TEST COURIER ACCOUNT CREATED SUCCESSFULLY
        ========================================
        
        Login Credentials:
        ------------------
        Email: {TEST_EMAIL}
        Password: Courier123!
        
        Account Details:
        ----------------
        Name: {TEST_NAME}
        Phone: {TEST_PHONE} (MTN test number)
        Country: South Sudan
        City: Juba
        Business Type: TRANSPORT/Courier
        
        Phone Status: VERIFIED ✓
        
        Instructions:
        -------------
        1. Open the mobile app
        2. Sign in with the email and password above
        3. You should be able to create a courier business
        4. The phone is pre-verified for testing
        
        Note: This is a TEST account using MTN's 
        designated test number (555 prefix)
        ========================================
        """)
        
except Exception as e:
    print(f"❌ Error creating test account: {e}")
    import traceback
    traceback.print_exc()