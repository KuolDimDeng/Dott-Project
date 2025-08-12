#!/usr/bin/env python3
"""
Add South Sudan 18% tax rate to the GlobalSalesTaxRate table
"""

import os
import sys
import django
from decimal import Decimal

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from taxes.models import GlobalSalesTaxRate

def add_south_sudan_tax():
    """Add or update South Sudan tax rate"""
    
    # Check if South Sudan rate already exists
    existing = GlobalSalesTaxRate.objects.filter(
        country='SS',
        region_code='',
        is_current=True
    ).first()
    
    if existing:
        if existing.rate != Decimal('0.18'):
            existing.rate = Decimal('0.18')
            existing.save()
            print(f"✅ Updated South Sudan tax rate from {existing.rate} to 18%")
        else:
            print(f"✅ South Sudan already has 18% tax rate")
    else:
        # Create new tax rate for South Sudan
        GlobalSalesTaxRate.objects.create(
            country='SS',
            country_name='South Sudan',
            region_code='',
            region_name='',
            locality='',
            locality_name='',
            rate=Decimal('0.18'),
            is_current=True
        )
        print("✅ Added South Sudan with 18% tax rate")
    
    # Also add common African countries with their VAT rates
    african_vat_rates = {
        'KE': ('Kenya', Decimal('0.16')),  # 16% VAT
        'NG': ('Nigeria', Decimal('0.075')),  # 7.5% VAT
        'GH': ('Ghana', Decimal('0.125')),  # 12.5% + 2.5% = 15% total
        'UG': ('Uganda', Decimal('0.18')),  # 18% VAT
        'TZ': ('Tanzania', Decimal('0.18')),  # 18% VAT
        'RW': ('Rwanda', Decimal('0.18')),  # 18% VAT
        'ET': ('Ethiopia', Decimal('0.15')),  # 15% VAT
        'ZA': ('South Africa', Decimal('0.15')),  # 15% VAT
        'EG': ('Egypt', Decimal('0.14')),  # 14% VAT
        'ZM': ('Zambia', Decimal('0.16')),  # 16% VAT
        'ZW': ('Zimbabwe', Decimal('0.15')),  # 15% VAT
        'BW': ('Botswana', Decimal('0.12')),  # 12% VAT
        'SN': ('Senegal', Decimal('0.18')),  # 18% VAT
        'CI': ('Ivory Coast', Decimal('0.18')),  # 18% VAT
        'CM': ('Cameroon', Decimal('0.195')),  # 19.25% VAT
    }
    
    for country_code, (country_name, rate) in african_vat_rates.items():
        existing = GlobalSalesTaxRate.objects.filter(
            country=country_code,
            region_code='',
            is_current=True
        ).first()
        
        if not existing:
            GlobalSalesTaxRate.objects.create(
                country=country_code,
                country_name=country_name,
                region_code='',
                region_name='',
                locality='',
                locality_name='',
                rate=rate,
                is_current=True
            )
            print(f"✅ Added {country_name} ({country_code}) with {rate*100}% tax rate")
        elif existing.rate != rate:
            existing.rate = rate
            existing.save()
            print(f"✅ Updated {country_name} ({country_code}) tax rate to {rate*100}%")

if __name__ == '__main__':
    add_south_sudan_tax()
    print("\n✅ Tax rates configuration complete!")