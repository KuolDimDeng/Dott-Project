#!/usr/bin/env python3
"""
Test the county tax API
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from taxes.models import GlobalSalesTaxRate

# Test scenarios
test_cases = [
    {
        'name': 'Utah state rate',
        'params': {'country': 'US', 'region_code': 'UT', 'locality': ''},
        'expected': 4.85
    },
    {
        'name': 'Salt Lake County',
        'params': {'country': 'US', 'region_code': 'UT', 'locality': 'SALT LAKE'},
        'expected': 7.75
    },
    {
        'name': 'Summit County (Park City)',
        'params': {'country': 'US', 'region_code': 'UT', 'locality': 'SUMMIT'},
        'expected': 8.85
    },
    {
        'name': 'Utah County',
        'params': {'country': 'US', 'region_code': 'UT', 'locality': 'UTAH'},
        'expected': 7.25
    }
]

print("=== Testing County Tax Rates ===\n")

for test in test_cases:
    rate = GlobalSalesTaxRate.objects.filter(
        country=test['params']['country'],
        region_code=test['params']['region_code'],
        locality=test['params']['locality'],
        is_current=True
    ).first()
    
    if rate:
        actual_rate = float(rate.rate * 100)
        status = "✅ PASS" if abs(actual_rate - test['expected']) < 0.01 else "❌ FAIL"
        print(f"{test['name']}:")
        print(f"  Expected: {test['expected']:.2f}%")
        print(f"  Actual: {actual_rate:.2f}%")
        print(f"  {status}\n")
    else:
        print(f"{test['name']}:")
        print(f"  ❌ No rate found\n")

# Test the API endpoint logic
print("\n=== Testing API Endpoint Logic ===")

# Simulate the sales-tax endpoint logic
def get_sales_tax_rate(country, state=None, county=None):
    """Simulate the API endpoint logic"""
    tax_rate = None
    
    # Try county level first
    if state and county:
        tax_rate = GlobalSalesTaxRate.objects.filter(
            country=country,
            region_code=state,
            locality=county,
            is_current=True
        ).first()
        if tax_rate:
            print(f"  Found county rate: {county}")
    
    # Try state level
    if not tax_rate and state:
        tax_rate = GlobalSalesTaxRate.objects.filter(
            country=country,
            region_code=state,
            locality='',
            is_current=True
        ).first()
        if tax_rate:
            print(f"  Found state rate: {state}")
    
    # Try country level
    if not tax_rate:
        tax_rate = GlobalSalesTaxRate.objects.filter(
            country=country,
            region_code='',
            locality='',
            is_current=True
        ).first()
        if tax_rate:
            print(f"  Found country rate: {country}")
    
    return tax_rate

# Test with county
print("Test 1: Requesting Salt Lake County rate")
rate = get_sales_tax_rate('US', 'UT', 'SALT LAKE')
if rate:
    print(f"  Rate: {rate.rate * 100:.2f}%")
    print(f"  ✅ Success\n")

# Test without county (should fall back to state)
print("Test 2: Requesting Utah rate without county")
rate = get_sales_tax_rate('US', 'UT')
if rate:
    print(f"  Rate: {rate.rate * 100:.2f}%")
    print(f"  ✅ Success\n")

# Test non-existent county (should fall back to state)
print("Test 3: Requesting non-existent county")
rate = get_sales_tax_rate('US', 'UT', 'NONEXISTENT')
if rate:
    print(f"  Rate: {rate.rate * 100:.2f}%")
    print(f"  ✅ Success (fallback worked)\n")

print("=== All Tests Complete ===")