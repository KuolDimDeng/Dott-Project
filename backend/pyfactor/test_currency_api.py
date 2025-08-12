#\!/usr/bin/env python3
"""Test script for currency API"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from users.api.currency_views_v3 import currency_preferences_v3
from users.models import Business, BusinessDetails
from currency.currency_data import get_currency_info

User = get_user_model()

def test_currency_api():
    """Test the currency API endpoint"""
    
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
            print(f"   - Currency Updated: {business.currency_updated_at}")
            
            # Check if SSP is in currency data
            ssp_info = get_currency_info('SSP')
            if ssp_info:
                print(f"\n✅ SSP currency info from get_currency_info():")
                print(f"   - Name: {ssp_info['name']}")
                print(f"   - Symbol: {ssp_info['symbol']}")
                print(f"   - Decimal Places: {ssp_info['decimal_places']}")
            
        except Business.DoesNotExist:
            print(f"❌ Business not found for ID: {user.business_id}")
            return
    else:
        print("❌ User has no business_id")
        return
    
    # Test the API endpoint
    print("\n📞 Testing currency API endpoint...")
    
    # Create a mock request
    factory = RequestFactory()
    request = factory.get('/api/currency/preferences')
    request.user = user
    
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
                print(f"   - Updated: {prefs.get('last_updated')}")
            else:
                print(f"   No preferences in response")
                
            if data.get('business'):
                biz = data['business']
                print(f"\n   Business Info:")
                print(f"   - ID: {biz.get('id')}")
                print(f"   - Name: {biz.get('name')}")
                print(f"   - Country: {biz.get('country')}")
        else:
            print(f"❌ API returned error status: {response.status_code}")
            print(f"   Data: {response.data}")
            
    except Exception as e:
        print(f"\n❌ Error calling API: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_currency_api()
EOF < /dev/null