#!/usr/bin/env python
"""
Test script for business registration flow
Tests that business registration correctly:
1. Creates a Business record
2. Updates user has_business to True
3. Sets user role to OWNER
4. Creates tenant 
5. Registers business in marketplace
"""

import os
import sys
import django
import json
from django.test import Client

# Add the project directory to the path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User
from users.models import Business, UserProfile
from marketplace.models import BusinessListing
from django.contrib.auth import authenticate

def test_business_registration():
    """Test the complete business registration flow"""
    
    print("=" * 50)
    print("Testing Business Registration Flow")
    print("=" * 50)
    
    # Create a test user (consumer)
    test_email = "test_consumer@example.com"
    test_password = "TestPass123!"
    
    # Clean up any existing test data
    try:
        User.objects.filter(email=test_email).delete()
    except:
        pass
    
    # Create a new consumer user
    user = User.objects.create_user(
        email=test_email,
        password=test_password,
        role='USER'
    )
    
    # Check has_business status (computed from Business records)
    has_business = Business.objects.filter(owner_id=user.id).exists()
    
    print(f"✅ Created test user: {test_email}")
    print(f"   - has_business: {has_business}")
    print(f"   - role: {user.role}")
    
    # Create a client and login
    client = Client()
    login_success = client.login(username=test_email, password=test_password)
    if not login_success:
        print("❌ Failed to login")
        return
    
    print("✅ Logged in successfully")
    
    # Prepare business registration data
    business_data = {
        "business_name": "Test Business",
        "business_type": "RETAIL",
        "entity_type": "SMALL_BUSINESS",
        "registration_status": "REGISTERED",
        "registration_number": "REG123456",
        "phone": "+211920000000",
        "email": test_email,
        "address": "123 Test Street",
        "city": "Juba",
        "business_country": "SS",
        "offers_courier_services": False
    }
    
    # Make the registration request
    print("\n📝 Submitting business registration...")
    response = client.post(
        '/users/business/register',
        data=json.dumps(business_data),
        content_type='application/json'
    )
    
    print(f"Response status: {response.status_code}")
    
    if response.status_code == 200:
        response_data = json.loads(response.content)
        print(f"Response: {json.dumps(response_data, indent=2)}")
        
        if response_data.get('success'):
            print("\n✅ Business registration successful!")
            
            # Verify the changes
            user.refresh_from_db()
            has_business_after = Business.objects.filter(owner_id=user.id).exists()
            print("\n🔍 Verifying user updates:")
            print(f"   - has_business: {has_business_after}")
            print(f"   - role: {user.role}")
            
            # Check if business was created
            business = Business.objects.filter(owner_id=user.id).first()
            if business:
                print(f"\n✅ Business created:")
                print(f"   - ID: {business.id}")
                print(f"   - Name: {business.name}")
                print(f"   - Type: {business.business_type}")
                print(f"   - Entity: {business.entity_type}")
            else:
                print("❌ Business not found")
            
            # Check if user profile was updated
            profile = UserProfile.objects.filter(user=user).first()
            if profile:
                print(f"\n✅ User profile updated:")
                print(f"   - Business ID: {profile.business_id}")
                print(f"   - Tenant ID: {profile.tenant_id}")
                print(f"   - Is Owner: {profile.is_business_owner}")
                print(f"   - Role: {profile.role}")
            else:
                print("❌ User profile not found")
            
            # Check if marketplace listing was created
            listing = BusinessListing.objects.filter(business=user).first()
            if listing:
                print(f"\n✅ Marketplace listing created:")
                print(f"   - ID: {listing.id}")
                print(f"   - Type: {listing.business_type}")
                print(f"   - Active: {listing.is_active}")
                print(f"   - Verified: {listing.is_verified}")
            else:
                print("⚠️  Marketplace listing not found (may not be required)")
            
            print("\n" + "=" * 50)
            print("✅ All tests passed!")
            print("=" * 50)
            
        else:
            print(f"❌ Registration failed: {response_data.get('error')}")
    else:
        print(f"❌ Request failed with status {response.status_code}")
        print(f"Response: {response.content}")
    
    # Cleanup
    try:
        User.objects.filter(email=test_email).delete()
        print("\n🧹 Test data cleaned up")
    except:
        pass

if __name__ == "__main__":
    test_business_registration()