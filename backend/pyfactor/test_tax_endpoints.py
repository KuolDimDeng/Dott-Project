#!/usr/bin/env python3
"""Test tax endpoints to ensure they work properly."""

import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from taxes.models import GlobalSalesTaxRate
from users.models import Business, BusinessDetails, UserProfile
from onboarding.models import OnboardingProgress
from taxes.views.views_orig import TaxCalculationView
from rest_framework.test import APIRequestFactory
import json

User = get_user_model()

def test_tax_endpoints():
    """Test tax calculation endpoints."""
    
    print("=" * 80)
    print("Testing Tax Endpoints")
    print("=" * 80)
    
    # 1. Check South Sudan tax rate exists
    print("\n1. Checking South Sudan tax rate in database...")
    ss_rate = GlobalSalesTaxRate.objects.filter(
        country='SS',
        is_current=True
    ).first()
    
    if ss_rate:
        print(f"✅ Found South Sudan tax rate: {ss_rate.rate * 100}%")
    else:
        print("❌ No South Sudan tax rate found in database")
        return
    
    # 2. Check if we have a test user with South Sudan business
    print("\n2. Looking for test user with South Sudan business...")
    
    # Find a user with business in South Sudan
    business_details = BusinessDetails.objects.filter(country='SS').first()
    
    if business_details:
        business = business_details.business
        # Get user from onboarding progress
        onboarding = OnboardingProgress.objects.filter(business_id=business.id).first()
        if onboarding:
            user = onboarding.user
        else:
            # Try to find user from tenant_id
            user = User.objects.filter(id=business.tenant_id).first()
        print(f"✅ Found user: {user.email}")
        print(f"   Business: {business.name}")
        print(f"   Country: {business_details.country} ({business_details.country.name})")
    else:
        print("⚠️  No existing user with South Sudan business found")
        print("   Creating test data...")
        
        # Create test user
        user = User.objects.filter(email='test_ss@example.com').first()
        if not user:
            user = User.objects.create_user(
                email='test_ss@example.com',
                username='test_ss@example.com',
                password='testpass123'
            )
            print(f"   Created user: {user.email}")
        
        # Create or get UserProfile
        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={'country': 'SS'}
        )
        
        # Create business
        business = Business.objects.filter(tenant_id=user.id).first()
        if not business:
            business = Business.objects.create(
                name='Test South Sudan Business',
                tenant_id=user.id  # Simple tenant ID
            )
            print(f"   Created business: {business.name}")
        
        # Create business details
        business_details, created = BusinessDetails.objects.get_or_create(
            business=business,
            defaults={
                'country': 'SS',
                'business_type': 'SERVICE'
            }
        )
        if created:
            print(f"   Created business details with country: SS")
        
        # Link OnboardingProgress to Business
        onboarding, _ = OnboardingProgress.objects.get_or_create(
            user=user,
            defaults={'business_id': business.id}
        )
        if onboarding.business_id != business.id:
            onboarding.business_id = business.id
            onboarding.save()
            print(f"   Linked OnboardingProgress to business")
    
    # 3. Test the tax calculation endpoint
    print("\n3. Testing tax calculation endpoint...")
    
    # Create request factory
    factory = APIRequestFactory()
    
    # Test GET request to calculate tax for South Sudan
    request = factory.get('/api/taxes/calculate/', {
        'country': 'SS',
        'state': '',
        'county': ''
    })
    
    # Add user to request (simulate authenticated request)
    request.user = user
    
    # Create view and process request
    view = TaxCalculationView()
    view.setup(request)
    
    try:
        response = view.get(request)
        # Access data directly from response
        data = response.data if hasattr(response, 'data') else json.loads(response.content)
        
        if response.status_code == 200:
            print(f"✅ Tax calculation successful!")
            print(f"   Tax rate: {data.get('tax_rate', 0) * 100}%")
            print(f"   Country: {data.get('country', 'N/A')}")
            print(f"   Source: {data.get('source', 'N/A')}")
        else:
            print(f"❌ Tax calculation failed with status {response.status_code}")
            print(f"   Response: {data}")
    except Exception as e:
        print(f"❌ Error testing tax calculation: {str(e)}")
    
    # 4. Test with US location for comparison
    print("\n4. Testing with US location for comparison...")
    
    request_us = factory.get('/api/taxes/calculate/', {
        'country': 'US',
        'state': 'CA',
        'county': 'Los Angeles'
    })
    request_us.user = user
    
    try:
        response_us = view.get(request_us)
        # Access data directly from response
        data_us = response_us.data if hasattr(response_us, 'data') else json.loads(response_us.content)
        
        if response_us.status_code == 200:
            print(f"✅ US tax calculation successful!")
            print(f"   Tax rate: {data_us.get('tax_rate', 0) * 100}%")
            print(f"   State: {data_us.get('state', 'N/A')}")
            print(f"   County: {data_us.get('county', 'N/A')}")
        else:
            print(f"❌ US tax calculation failed with status {response_us.status_code}")
    except Exception as e:
        print(f"❌ Error testing US tax calculation: {str(e)}")
    
    # 5. Test international sale (should be 0% tax)
    print("\n5. Testing international sale (SS business → US customer)...")
    
    # Update user profile to have SS country
    profile = UserProfile.objects.get(user=user)
    profile.country = 'SS'
    profile.save()
    
    from sales.services.tax_service import TaxService
    from crm.models import Customer
    
    # Create a US customer
    customer = Customer.objects.filter(
        email='us_customer@example.com',
        tenant_id=user.id
    ).first()
    
    if not customer:
        customer = Customer.objects.create(
            first_name='US',
            last_name='Customer',
            email='us_customer@example.com',
            billing_country='US',
            billing_state='CA',
            tenant_id=user.id
        )
    
    try:
        tax_result = TaxService.calculate_sales_tax(
            subtotal=100.00,
            customer=customer,
            user_profile=profile,
            use_shipping_address=False
        )
        
        print(f"✅ International sale tax calculation:")
        print(f"   Business country: SS")
        print(f"   Customer country: US")
        print(f"   Tax rate: {tax_result['tax_rate'] * 100}%")
        print(f"   Expected: 0% (international sale)")
        
        if tax_result['tax_rate'] == 0:
            print("   ✅ Correctly applied 0% tax for international sale")
        else:
            print("   ❌ Warning: Non-zero tax on international sale")
    except Exception as e:
        print(f"❌ Error testing international sale: {str(e)}")
    
    print("\n" + "=" * 80)
    print("Tax Endpoint Testing Complete")
    print("=" * 80)

if __name__ == '__main__':
    test_tax_endpoints()