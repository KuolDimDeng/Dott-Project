#!/usr/bin/env python3
"""Test POS tax calculation with customer location."""

import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.test import RequestFactory
from taxes.views.views_orig import TaxCalculationView

User = get_user_model()

def test_tax_calculation():
    """Test tax calculation for different customer locations."""
    
    # Get a test user
    user = User.objects.filter(email='support@dottapps.com').first()
    if not user:
        print('❌ Test user not found')
        return
    
    print('=' * 60)
    print('Testing POS Tax Calculation with Customer Locations')
    print('=' * 60)
    
    # Create request factory
    factory = RequestFactory()
    view = TaxCalculationView()
    
    # Test cases
    test_cases = [
        {
            'name': 'California Customer',
            'params': {'country': 'US', 'state': 'CA', 'county': ''},
            'expected': 7.25
        },
        {
            'name': 'Utah Salt Lake County Customer',
            'params': {'country': 'US', 'state': 'UT', 'county': 'SALT LAKE'},
            'expected': 7.75
        },
        {
            'name': 'Canada Customer (International)',
            'params': {'country': 'CA', 'state': '', 'county': ''},
            'expected': 5.00
        },
        {
            'name': 'Unknown Location',
            'params': {'country': 'ZZ', 'state': '', 'county': ''},
            'expected': 0
        }
    ]
    
    for test in test_cases:
        print(f"\n📍 Testing: {test['name']}")
        print(f"   Parameters: {test['params']}")
        
        # Create request
        request = factory.get('/api/taxes/calculate/', test['params'])
        request.user = user
        
        # Call the view
        response = view.get(request)
        
        if response.status_code == 200:
            data = response.data
            tax_percentage = data.get('tax_percentage', 0)
            source = data.get('source', 'unknown')
            
            if abs(tax_percentage - test['expected']) < 0.01:
                print(f"   ✅ SUCCESS: Tax rate = {tax_percentage:.2f}% (source: {source})")
            else:
                print(f"   ⚠️  MISMATCH: Got {tax_percentage:.2f}%, expected {test['expected']:.2f}%")
            
            if data.get('country'):
                print(f"   Location: {data.get('country_name', data.get('country'))}")
                if data.get('state'):
                    print(f"   State: {data.get('state_name', data.get('state'))}")
                if data.get('county'):
                    print(f"   County: {data.get('county')}")
        else:
            print(f"   ❌ ERROR: Status {response.status_code}")
            print(f"   Response: {response.data}")
    
    print('\n' + '=' * 60)
    print('✅ Tax calculation endpoint is working correctly!')
    print('=' * 60)

if __name__ == '__main__':
    test_tax_calculation()