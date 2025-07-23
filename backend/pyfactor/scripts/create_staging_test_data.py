"""
Create test data for staging environment
Run this after migrations: python manage.py shell < scripts/create_staging_test_data.py
"""

from django.contrib.auth import get_user_model
from django.db import transaction
from businesses.models import Business, BusinessUser
from users.models import UserProfile
import uuid

User = get_user_model()

print("🧪 Creating test data for staging...")

# Test users with different roles
test_users = [
    {
        'email': 'owner@staging.com',
        'username': 'staging_owner',
        'password': 'StageTest123!',
        'role': 'owner',
        'first_name': 'Test',
        'last_name': 'Owner'
    },
    {
        'email': 'admin@staging.com', 
        'username': 'staging_admin',
        'password': 'StageTest123!',
        'role': 'admin',
        'first_name': 'Test',
        'last_name': 'Admin'
    },
    {
        'email': 'user@staging.com',
        'username': 'staging_user', 
        'password': 'StageTest123!',
        'role': 'user',
        'first_name': 'Test',
        'last_name': 'User'
    }
]

with transaction.atomic():
    # Create test business first
    business = Business.objects.create(
        id=uuid.uuid4(),
        business_name='Staging Test Company',
        business_type='corporation',
        industry='technology',
        annual_revenue=1000000.00,
        employee_count=50,
        ein='12-3456789',
        country='US',
        currency='USD',
        fiscal_year_start='2025-07-01',
        fiscal_year_end='2025-06-30',
        is_active=True
    )
    print(f"✅ Created business: {business.business_name}")
    
    # Create users
    for user_data in test_users:
        # Create user
        user = User.objects.create_user(
            email=user_data['email'],
            username=user_data['username'],
            password=user_data['password'],
            first_name=user_data['first_name'],
            last_name=user_data['last_name'],
            is_active=True,
            onboarding_completed=True
        )
        
        # Create profile
        UserProfile.objects.create(
            user=user,
            phone_number='+1234567890',
            country='US',
            timezone='America/New_York'
        )
        
        # Link to business
        BusinessUser.objects.create(
            user=user,
            business=business,
            role=user_data['role'].upper(),
            is_active=True
        )
        
        print(f"✅ Created {user_data['role']}: {user_data['email']} / {user_data['password']}")

print("\n🎉 Test data created successfully!")
print("\nTest accounts:")
print("- owner@staging.com / StageTest123! (OWNER role)")
print("- admin@staging.com / StageTest123! (ADMIN role)") 
print("- user@staging.com / StageTest123! (USER role)")
print("\nBusiness: Staging Test Company")
print("\nYou can now log into staging with these accounts!"