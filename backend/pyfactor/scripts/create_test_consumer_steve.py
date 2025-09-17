#!/usr/bin/env python
"""
Script to create a test consumer account for Steve Majak
This user can then manually create a courier business in the app
Run from Django shell: python manage.py shell < scripts/create_test_consumer_steve.py
"""

from django.contrib.auth import get_user_model
from users.models import UserProfile
from django.db import transaction

User = get_user_model()

# MTN Test number for development (555 numbers are standard test numbers)
TEST_PHONE = "+211925550100"  # MTN test number format
TEST_EMAIL = "steve.majak@test.com"
TEST_NAME = "Steve Majak"

try:
    with transaction.atomic():
        # Check if user already exists
        existing_user = User.objects.filter(email=TEST_EMAIL).first()
        
        if existing_user:
            print(f"✅ User already exists: {TEST_EMAIL}")
            user = existing_user
            # Update password in case you forgot it
            user.set_password("Test123!")
            user.save()
            print("✅ Password reset to: Test123!")
        else:
            # Create new test user
            user = User.objects.create_user(
                email=TEST_EMAIL,
                password="Test123!",
                first_name="Steve",
                last_name="Majak"
            )
            print(f"✅ Created new user: {TEST_EMAIL}")
        
        # Create or update UserProfile
        profile, created = UserProfile.objects.update_or_create(
            user=user,
            defaults={
                'phone_number': TEST_PHONE,
                'phone_verified': True,  # Pre-verified for testing
                'country': 'SS',  # South Sudan
                'city': 'Juba',
                'business_type': None,  # No business yet - consumer account
                'business_name': None,  # Will be set when creating courier business
                'is_active': True,
                'onboarding_completed': False,  # Can go through onboarding
                'preferred_currency_code': 'SSP',
                'preferred_currency_name': 'South Sudanese Pound',
                'preferred_currency_symbol': 'SSP'
            }
        )
        
        if created:
            print("✅ Created new user profile")
        else:
            print("✅ Updated existing user profile")
        
        # Set user as active and verified
        user.is_active = True
        user.save()
        
        print(f"""
        ========================================
        TEST CONSUMER ACCOUNT READY
        ========================================
        
        Login Credentials:
        ------------------
        Email: {TEST_EMAIL}
        Password: Test123!
        
        Account Details:
        ----------------
        Name: {TEST_NAME}
        Phone: {TEST_PHONE} (MTN test number - pre-verified)
        Country: South Sudan
        City: Juba
        Account Type: Consumer (No business yet)
        
        Next Steps:
        -----------
        1. Open the mobile app
        2. Sign in with email and password above
        3. You'll be logged in as a consumer
        4. Go to profile/settings to create a courier business
        5. The phone number is already verified
        
        ========================================
        """)
        
except Exception as e:
    print(f"❌ Error creating test account: {e}")
    import traceback
    traceback.print_exc()