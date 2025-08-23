#!/usr/bin/env python
"""
Script to check South Sudan tax rate configuration
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from taxes.models import GlobalSalesTaxRate
from users.models import Business, UserProfile
from django.contrib.auth import get_user_model

User = get_user_model()

def check_south_sudan_tax():
    print("\n" + "="*60)
    print("SOUTH SUDAN TAX RATE INVESTIGATION")
    print("="*60)
    
    # Check GlobalSalesTaxRate for South Sudan
    print("\n1. Checking GlobalSalesTaxRate table for South Sudan...")
    print("-" * 40)
    
    # Try different country code variations
    country_codes = ['SS', 'SSD', 'SD', 'SOUTH_SUDAN']
    
    for code in country_codes:
        rates = GlobalSalesTaxRate.objects.filter(country=code)
        if rates.exists():
            print(f"\n✓ Found {rates.count()} rate(s) for country code: {code}")
            for rate in rates:
                print(f"  - Rate: {rate.rate * 100}% (decimal: {rate.rate})")
                print(f"    Country Name: {rate.country_name}")
                print(f"    Region: {rate.region_code or 'None'}")
                print(f"    Is Current: {rate.is_current}")
                print(f"    Tax Type: {rate.tax_type}")
                print(f"    Created: {rate.created_at}")
                
                # Check if we can access the rate field
                try:
                    test_rate = rate.rate
                    print(f"    ✓ Can access 'rate' field: {test_rate}")
                except AttributeError as e:
                    print(f"    ✗ Error accessing 'rate' field: {e}")
                    # Try other field names
                    for attr in ['standard_rate', 'tax_rate', 'rate_decimal']:
                        if hasattr(rate, attr):
                            print(f"    Found alternative field: {attr} = {getattr(rate, attr)}")
        else:
            print(f"✗ No rates found for country code: {code}")
    
    # Check by country name
    print("\n2. Checking by country name...")
    print("-" * 40)
    
    name_patterns = ['Sudan', 'sudan', 'SUDAN']
    for pattern in name_patterns:
        rates = GlobalSalesTaxRate.objects.filter(country_name__icontains=pattern)
        if rates.exists():
            print(f"\n✓ Found {rates.count()} rate(s) with name containing: {pattern}")
            for rate in rates:
                print(f"  - Country: {rate.country} ({rate.country_name})")
                print(f"    Rate: {rate.rate * 100}%")
                print(f"    Is Current: {rate.is_current}")
    
    # Check current rates only
    print("\n3. Checking ONLY current rates for SS...")
    print("-" * 40)
    current_rates = GlobalSalesTaxRate.objects.filter(country='SS', is_current=True)
    if current_rates.exists():
        print(f"✓ Found {current_rates.count()} CURRENT rate(s) for SS")
        for rate in current_rates:
            print(f"  - Rate: {rate.rate * 100}%")
            print(f"  - Region: {rate.region_code or 'Country-level'}")
    else:
        print("✗ No CURRENT rates found for SS")
        # Check if there are non-current rates
        all_ss = GlobalSalesTaxRate.objects.filter(country='SS')
        if all_ss.exists():
            print(f"  But found {all_ss.count()} non-current rate(s):")
            for rate in all_ss:
                print(f"    - Rate: {rate.rate * 100}%, Is Current: {rate.is_current}")
    
    # Check support@dottapps.com user's business
    print("\n4. Checking support@dottapps.com business configuration...")
    print("-" * 40)
    
    try:
        user = User.objects.get(email='support@dottapps.com')
        print(f"✓ Found user: {user.email}")
        
        # Check profile
        profile = UserProfile.objects.filter(user=user).first()
        if profile:
            print(f"✓ Found profile")
            if profile.business:
                business = profile.business
                print(f"✓ Found business: {business.name}")
                print(f"  - Business Country: {business.country}")
                print(f"  - Business State: {getattr(business, 'state', 'Not set')}")
                print(f"  - Business County: {getattr(business, 'county', 'Not set')}")
                
                # Check cached tax rate
                print(f"\n  Cached Tax Information:")
                print(f"  - Cached Rate: {getattr(profile, 'cached_tax_rate', 'Not set')}")
                print(f"  - Cached Percentage: {getattr(profile, 'cached_tax_rate_percentage', 'Not set')}")
                print(f"  - Cached Jurisdiction: {getattr(profile, 'cached_tax_jurisdiction', 'Not set')}")
                print(f"  - Cached Source: {getattr(profile, 'cached_tax_source', 'Not set')}")
                print(f"  - Cached Updated: {getattr(profile, 'cached_tax_updated_at', 'Not set')}")
            else:
                print("✗ No business linked to profile")
        else:
            print("✗ No profile found")
    except User.DoesNotExist:
        print("✗ User support@dottapps.com not found")
    
    print("\n" + "="*60)
    print("END OF INVESTIGATION")
    print("="*60 + "\n")

if __name__ == "__main__":
    check_south_sudan_tax()