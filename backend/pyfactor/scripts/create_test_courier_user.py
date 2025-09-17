#!/usr/bin/env python
"""
Script to create a test user for courier business testing
Run from Django shell: python manage.py shell < scripts/create_test_courier_user.py
"""

from django.contrib.auth import get_user_model
from users.models import UserProfile
from django.db import transaction

User = get_user_model()

# Test user details
TEST_EMAIL = "steve.majak.test@example.com"
TEST_NAME = "Steve Majak Test"
TEST_PHONE = "+211925550100"  # Clearly marked as test number

try:
    with transaction.atomic():
        # Check if user already exists
        if User.objects.filter(email=TEST_EMAIL).exists():
            print(f"Test user {TEST_EMAIL} already exists")
            user = User.objects.get(email=TEST_EMAIL)
        else:
            # Create test user
            user = User.objects.create_user(
                email=TEST_EMAIL,
                password="TestPassword123!",  # You can use this to login
                first_name="Steve",
                last_name="Majak Test"
            )
            
            # Create or update UserProfile
            profile, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'phone_number': TEST_PHONE,
                    'country': 'SS',
                    'business_type': 'TRANSPORT',  # For courier
                    'is_test_account': True  # Mark as test account if you have this field
                }
            )
            
            if created:
                print(f"✅ Test courier user created successfully!")
            else:
                print(f"✅ Test user profile updated!")
                
        print(f"""
        Test Courier Account Details:
        ============================
        Email: {TEST_EMAIL}
        Password: TestPassword123!
        Phone: {TEST_PHONE}
        Type: Courier/Transport Business
        
        Use these credentials to test courier business creation in the mobile app.
        """)
        
except Exception as e:
    print(f"❌ Error creating test user: {e}")