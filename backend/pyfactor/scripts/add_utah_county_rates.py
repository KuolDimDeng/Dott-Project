#!/usr/bin/env python3
"""
Script to add Utah county-level sales tax rates as proof of concept
"""
import os
import sys
import django
from decimal import Decimal
from datetime import date

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from taxes.models import GlobalSalesTaxRate
from django.db import transaction as db_transaction

# Utah County Tax Rates (2025)
# Source: Utah State Tax Commission
# Base state rate: 4.85%
# Most counties have additional local option taxes
UTAH_COUNTY_RATES = {
    # County: (County Name, Total Rate including state 4.85%)
    'BEAVER': ('Beaver County', 7.10),
    'BOX ELDER': ('Box Elder County', 6.10),
    'CACHE': ('Cache County', 7.10),
    'CARBON': ('Carbon County', 7.35),
    'DAGGETT': ('Daggett County', 6.10),
    'DAVIS': ('Davis County', 7.10),
    'DUCHESNE': ('Duchesne County', 6.60),
    'EMERY': ('Emery County', 6.85),
    'GARFIELD': ('Garfield County', 7.10),
    'GRAND': ('Grand County', 7.85),  # Higher due to tourism
    'IRON': ('Iron County', 7.85),
    'JUAB': ('Juab County', 6.85),
    'KANE': ('Kane County', 7.35),
    'MILLARD': ('Millard County', 6.60),
    'MORGAN': ('Morgan County', 6.10),
    'PIUTE': ('Piute County', 6.85),
    'RICH': ('Rich County', 6.10),
    'SALT LAKE': ('Salt Lake County', 7.75),  # Most populated
    'SAN JUAN': ('San Juan County', 7.60),
    'SANPETE': ('Sanpete County', 7.10),
    'SEVIER': ('Sevier County', 7.35),
    'SUMMIT': ('Summit County', 8.85),  # Highest - Park City area
    'TOOELE': ('Tooele County', 7.35),
    'UINTAH': ('Uintah County', 6.85),
    'UTAH': ('Utah County', 7.25),  # Second most populated
    'WASATCH': ('Wasatch County', 7.60),
    'WASHINGTON': ('Washington County', 7.35),  # St. George area
    'WAYNE': ('Wayne County', 7.10),
    'WEBER': ('Weber County', 7.35),  # Ogden area
}

def add_utah_county_rates():
    """Add Utah county-level tax rates"""
    print("=== Adding Utah County Tax Rates ===\n")
    
    counties_added = 0
    counties_updated = 0
    
    with db_transaction.atomic():
        # First ensure Utah state rate exists and is correct
        state_rate = GlobalSalesTaxRate.objects.filter(
            country='US',
            region_code='UT',
            locality='',
            tax_type='sales_tax',
            is_current=True
        ).first()
        
        if state_rate:
            print(f"Utah state base rate: {state_rate.rate * 100:.2f}%\n")
        else:
            print("⚠️  Utah state rate not found. Please run update_state_tax_rates.py first.\n")
        
        # Add county rates
        for county_code, (county_name, total_rate) in UTAH_COUNTY_RATES.items():
            rate_decimal = Decimal(str(total_rate / 100))
            
            # Check if county rate already exists
            existing = GlobalSalesTaxRate.objects.filter(
                country='US',
                region_code='UT',
                locality=county_code,
                tax_type='sales_tax',
                is_current=True
            ).first()
            
            if existing:
                if abs(float(existing.rate * 100) - total_rate) > 0.001:
                    print(f"Updating {county_name}: {float(existing.rate * 100):.2f}% → {total_rate:.2f}%")
                    existing.rate = rate_decimal
                    existing.effective_date = date.today()
                    existing.manually_verified = True
                    existing.ai_confidence_score = Decimal('1.0')
                    existing.save()
                    counties_updated += 1
                else:
                    print(f"✓ {county_name}: Already correct at {total_rate:.2f}%")
            else:
                # Create new county rate
                print(f"Creating {county_name}: {total_rate:.2f}%")
                GlobalSalesTaxRate.objects.create(
                    country='US',
                    country_name='United States',
                    region_code='UT',
                    region_name='Utah',
                    locality=county_code,
                    tax_type='sales_tax',
                    rate=rate_decimal,
                    effective_date=date.today(),
                    is_current=True,
                    manually_verified=True,
                    ai_confidence_score=Decimal('1.0'),
                    manual_notes=f'Total rate including Utah state tax of 4.85%. County: {county_name}'
                )
                counties_added += 1
    
    print("\n" + "=" * 50)
    print(f"Summary:")
    print(f"  Counties processed: {len(UTAH_COUNTY_RATES)}")
    print(f"  New counties added: {counties_added}")
    print(f"  Counties updated: {counties_updated}")
    print("=" * 50)
    
    # Show some examples
    print("\nExample queries to test:")
    print("  - Salt Lake County: 7.75% (includes state 4.85%)")
    print("  - Summit County: 8.85% (highest - Park City area)")
    print("  - Utah County: 7.25% (Provo/Orem area)")

if __name__ == '__main__':
    add_utah_county_rates()