#!/usr/bin/env python3
"""
Script to check all US state sales tax rates in the database
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from taxes.models import GlobalSalesTaxRate

# Get all US state rates
us_rates = GlobalSalesTaxRate.objects.filter(
    country='US',
    tax_type='sales_tax'
).exclude(
    region_code=''
).order_by('region_code')

print("=== Current US State Sales Tax Rates in Database ===")
print(f"Total states found: {us_rates.count()}\n")

print(f"{'State Code':<12} {'State Name':<25} {'Tax Rate':<12} {'Effective Date':<15}")
print("-" * 80)

for rate in us_rates:
    print(f"{rate.region_code:<12} {rate.region_name:<25} {rate.rate * 100:>6.2f}%      {rate.effective_date}")

# Check for missing states
all_state_codes = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

existing_codes = set(rate.region_code for rate in us_rates)
missing_states = set(all_state_codes) - existing_codes

if missing_states:
    print(f"\n⚠️  Missing states: {', '.join(sorted(missing_states))}")
else:
    print("\n✅ All 50 states have tax rates in the database")