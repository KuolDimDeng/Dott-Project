#!/usr/bin/env python3
"""
Test script to verify tax rates can be accessed via API
Simulates what the dashboard would do
"""
import os
import sys
import django
import json

# Add the project directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from taxes.views.global_tax_rates import GlobalTaxRateViewSet
from taxes.models import GlobalSalesTaxRate

User = get_user_model()

def test_tax_rate_api():
    """Test the tax rate API endpoints"""
    print("🔍 Testing Tax Rate API Access...")
    print("="*60)
    
    # Create a request factory
    factory = RequestFactory()
    
    # Create the viewset instance
    viewset = GlobalTaxRateViewSet()
    
    # Test 1: Lookup specific country
    test_countries = ['US', 'CA', 'GB', 'DE', 'AE']
    
    for country_code in test_countries:
        print(f"\n📍 Testing lookup for {country_code}:")
        
        # Create a GET request
        request = factory.get(f'/api/taxes/global-rates/lookup/?country={country_code}')
        request.query_params = request.GET
        
        # Call the lookup action
        response = viewset.lookup(request)
        
        if response.status_code == 200:
            data = response.data
            if data['success']:
                tax_data = data['data']
                print(f"  ✅ Found: {tax_data['country_name']} ({tax_data['country']})")
                print(f"     Tax Type: {tax_data['tax_type']}")
                print(f"     Rate: {tax_data['rate_percentage']}%")
                if tax_data.get('notes'):
                    print(f"     Notes: {tax_data['notes']}")
            else:
                print(f"  ❌ Lookup failed")
        else:
            print(f"  ❌ Error: {response.status_code}")
    
    # Test 2: Statistics endpoint
    print("\n📊 Testing statistics endpoint:")
    request = factory.get('/api/taxes/global-rates/statistics/')
    response = viewset.statistics(request)
    
    if response.status_code == 200:
        stats = response.data['statistics']
        print(f"  Total countries: {stats['total_countries']}")
        print(f"  Average rate: {stats['avg_rate_percentage']:.1f}%")
        print(f"  Min rate: {stats['min_rate_percentage']:.1f}%")
        print(f"  Max rate: {stats['max_rate_percentage']:.1f}%")
        
        print("\n  Tax type distribution:")
        for tt in response.data['tax_types']:
            print(f"    {tt['tax_type'].upper()}: {tt['count']} countries")
    
    # Test 3: Direct database query (what POS would do)
    print("\n💾 Testing direct database access (POS simulation):")
    test_country = 'US'
    
    rate = GlobalSalesTaxRate.objects.filter(
        country=test_country,
        region_code='',
        locality='',
        is_current=True
    ).first()
    
    if rate:
        print(f"  ✅ Direct DB query for {test_country}:")
        print(f"     Tax Type: {rate.tax_type}")
        print(f"     Rate: {rate.rate * 100:.1f}%")
        print(f"     AI Confidence: {rate.ai_confidence_score * 100:.0f}%")
    else:
        print(f"  ❌ No rate found for {test_country}")
    
    print("\n" + "="*60)
    print("✅ Tax Rate API Testing Complete!")

if __name__ == '__main__':
    test_tax_rate_api()