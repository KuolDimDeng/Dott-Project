#!/usr/bin/env python
"""
Check and add South Sudan tax rates to the GlobalSalesTaxRate table
"""
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from taxes.models import GlobalSalesTaxRate

def check_and_add_south_sudan_tax():
    """Check if South Sudan tax rates exist and add them if not"""

    # Check for South Sudan tax rates
    south_sudan_rates = GlobalSalesTaxRate.objects.filter(country='SS')

    if south_sudan_rates.exists():
        print("✅ South Sudan tax rates found:")
        for rate in south_sudan_rates:
            print(f"  - Region: {rate.region or 'Default'}")
            print(f"    Tax Rate: {rate.rate}%")
            print(f"    Name: {rate.tax_name}")
            print(f"    Active: {rate.is_active}")
    else:
        print("❌ No South Sudan tax rates found. Adding default rates...")

        # Add default South Sudan tax rates
        # South Sudan has a 15% VAT rate
        default_rate = GlobalSalesTaxRate.objects.create(
            country='SS',  # South Sudan ISO code
            rate=15.0,
            tax_name='VAT',
            is_active=True,
            region=None  # Default for entire country
        )

        print(f"✅ Added default South Sudan tax rate:")
        print(f"  - Country: South Sudan (SS)")
        print(f"  - Tax Rate: {default_rate.rate}%")
        print(f"  - Tax Name: {default_rate.tax_name}")
        print(f"  - Active: {default_rate.is_active}")

        # Add Juba-specific rate if needed (same as default for now)
        juba_rate = GlobalSalesTaxRate.objects.create(
            country='SS',
            rate=15.0,
            tax_name='VAT',
            is_active=True,
            region='Juba'  # Capital city
        )

        print(f"  - Added Juba-specific rate: {juba_rate.rate}%")

    # Check other African countries for comparison
    print("\n📊 Other African countries tax rates for reference:")
    african_countries = ['KE', 'UG', 'ET', 'RW', 'TZ', 'NG', 'GH', 'ZA']
    for country_code in african_countries:
        rates = GlobalSalesTaxRate.objects.filter(country=country_code, is_active=True).first()
        if rates:
            print(f"  {country_code}: {rates.rate}% ({rates.tax_name})")

if __name__ == "__main__":
    print("""
    ========================================
    Checking South Sudan Tax Rates
    ========================================
    """)

    check_and_add_south_sudan_tax()

    print("\n✅ Done!")