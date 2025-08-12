#\!/usr/bin/env python3
"""Test script for currency API with tenant context"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from users.api.currency_views_v3 import currency_preferences_v3
from users.models import Business
from custom_auth.models import Tenant

User = get_user_model()

def test_currency_api():
    """Test the currency API endpoint with tenant context"""
    
    # Get the support@dottapps.com user
    try:
        user = User.objects.get(email='support@dottapps.com')
        print(f"✅ Found user: {user.email}")
        print(f"   - User ID: {user.id}")
        print(f"   - Business ID: {user.business_id}")
        print(f"   - Tenant ID: {user.tenant_id}")
    except User.DoesNotExist:
        print("❌ User support@dottapps.com not found")
        return
    
    # Check the business
    if user.business_id:
        try:
            business = Business.objects.get(id=user.business_id)
            print(f"\n✅ Found business: {business.name}")
            print(f"   - Country: {business.country}")
            print(f"   - Currency Code: {business.preferred_currency_code}")
            print(f"   - Currency Name: {business.preferred_currency_name}")
            print(f"   - Currency Symbol: {business.preferred_currency_symbol}")
            
        except Business.DoesNotExist:
            print(f"❌ Business not found for ID: {user.business_id}")
            return
    else:
        print("❌ User has no business_id")
        return
    
    # Test the API endpoint
    print("\n📞 Testing currency API endpoint...")
    
    # Create a mock request with tenant context
    factory = RequestFactory()
    request = factory.get('/api/currency/preferences')
    request.user = user
    
    # Add tenant context (required by middleware)
    if user.tenant_id:
        try:
            tenant = Tenant.objects.get(id=user.tenant_id)
            request.tenant = tenant
            request.tenant_id = tenant.id
            print(f"   Added tenant context: {tenant.name}")
        except Tenant.DoesNotExist:
            print(f"   ⚠️ Warning: Tenant not found for ID {user.tenant_id}")
    
    try:
        response = currency_preferences_v3(request)
        print(f"\n✅ API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.data
            print(f"   Success: {data.get('success', False)}")
            
            if data.get('preferences'):
                prefs = data['preferences']
                print(f"\n   Currency Preferences:")
                print(f"   - Code: {prefs.get('currency_code')}")
                print(f"   - Name: {prefs.get('currency_name')}")
                print(f"   - Symbol: {prefs.get('currency_symbol')}")
                
                # Check display format
                print(f"\n   Display Format:")
                print(f"   - DashAppBar should show: {prefs.get('currency_code')} (3-letter code)")
                print(f"   - Amount displays should use: {prefs.get('currency_symbol')} (symbol)")
            else:
                print(f"   No preferences in response")
                
        else:
            print(f"❌ API returned error status: {response.status_code}")
            print(f"   Data: {response.data}")
            
    except Exception as e:
        print(f"\n❌ Error calling API: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_currency_api()
