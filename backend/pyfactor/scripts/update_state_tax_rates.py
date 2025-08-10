#!/usr/bin/env python3
"""
Script to update US state sales tax rates to current 2025 rates
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

# Current 2025 US state sales tax rates
# Source: Tax Foundation and state revenue departments (as of January 2025)
CURRENT_STATE_RATES = {
    'AL': 4.00,   # Alabama
    'AK': 0.00,   # Alaska (no state sales tax, but localities can charge up to 7.5%)
    'AZ': 5.60,   # Arizona
    'AR': 6.50,   # Arkansas
    'CA': 7.25,   # California (highest base rate)
    'CO': 2.90,   # Colorado
    'CT': 6.35,   # Connecticut
    'DE': 0.00,   # Delaware (no sales tax)
    'DC': 6.00,   # District of Columbia
    'FL': 6.00,   # Florida
    'GA': 4.00,   # Georgia
    'HI': 4.00,   # Hawaii (general excise tax)
    'ID': 6.00,   # Idaho
    'IL': 6.25,   # Illinois
    'IN': 7.00,   # Indiana
    'IA': 6.00,   # Iowa
    'KS': 6.50,   # Kansas
    'KY': 6.00,   # Kentucky
    'LA': 4.45,   # Louisiana
    'ME': 5.50,   # Maine
    'MD': 6.00,   # Maryland
    'MA': 6.25,   # Massachusetts
    'MI': 6.00,   # Michigan
    'MN': 6.875,  # Minnesota
    'MS': 7.00,   # Mississippi
    'MO': 4.225,  # Missouri
    'MT': 0.00,   # Montana (no general sales tax)
    'NE': 5.50,   # Nebraska
    'NV': 6.85,   # Nevada
    'NH': 0.00,   # New Hampshire (no sales tax)
    'NJ': 6.625,  # New Jersey
    'NM': 4.875,  # New Mexico
    'NY': 4.00,   # New York
    'NC': 4.75,   # North Carolina
    'ND': 5.00,   # North Dakota
    'OH': 5.75,   # Ohio
    'OK': 4.50,   # Oklahoma
    'OR': 0.00,   # Oregon (no sales tax)
    'PA': 6.00,   # Pennsylvania
    'RI': 7.00,   # Rhode Island
    'SC': 6.00,   # South Carolina
    'SD': 4.20,   # South Dakota (reduced from 4.5% in 2023)
    'TN': 7.00,   # Tennessee
    'TX': 6.25,   # Texas
    'UT': 4.85,   # Utah (4.85% base rate, but 5.95% minimum with mandatory local)
    'VT': 6.00,   # Vermont
    'VA': 4.30,   # Virginia (5.30% total with 1% local)
    'WA': 6.50,   # Washington
    'WV': 6.00,   # West Virginia
    'WI': 5.00,   # Wisconsin
    'WY': 4.00,   # Wyoming
}

# State names mapping
STATE_NAMES = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'DC': 'District of Columbia', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii',
    'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine',
    'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
    'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska',
    'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico',
    'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island',
    'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas',
    'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington',
    'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
}

def update_state_rates():
    """Update all US state sales tax rates"""
    print("=== Updating US State Sales Tax Rates ===\n")
    
    updates_made = 0
    states_checked = 0
    
    with db_transaction.atomic():
        for state_code, new_rate in CURRENT_STATE_RATES.items():
            states_checked += 1
            new_rate_decimal = Decimal(str(new_rate / 100))  # Convert percentage to decimal
            
            # Get existing rate
            existing = GlobalSalesTaxRate.objects.filter(
                country='US',
                region_code=state_code,
                tax_type='sales_tax',
                is_current=True
            ).first()
            
            if existing:
                old_rate_percent = float(existing.rate * 100)
                new_rate_percent = new_rate
                
                if abs(old_rate_percent - new_rate_percent) > 0.001:  # Check if rates differ
                    print(f"{state_code} ({STATE_NAMES[state_code]}):")
                    print(f"  Old rate: {old_rate_percent:.2f}%")
                    print(f"  New rate: {new_rate_percent:.2f}%")
                    print(f"  Difference: {new_rate_percent - old_rate_percent:+.2f}%")
                    
                    # Update the rate
                    existing.rate = new_rate_decimal
                    existing.effective_date = date.today()
                    existing.manually_verified = True
                    existing.ai_confidence_score = Decimal('1.0')  # Manual verification
                    existing.save()
                    
                    updates_made += 1
                    print("  ✅ Updated\n")
                else:
                    print(f"{state_code}: ✓ Already correct at {new_rate_percent:.2f}%")
            else:
                # Create new rate
                print(f"{state_code} ({STATE_NAMES[state_code]}): Creating new rate at {new_rate:.2f}%")
                GlobalSalesTaxRate.objects.create(
                    country='US',
                    region_code=state_code,
                    region_name=STATE_NAMES[state_code],
                    locality='',
                    tax_type='sales_tax',
                    tax_name=f'{STATE_NAMES[state_code]} Sales Tax',
                    rate=new_rate_decimal,
                    effective_date=date.today(),
                    is_current=True,
                    manually_verified=True,
                    ai_confidence_score=Decimal('1.0')
                )
                updates_made += 1
                print("  ✅ Created\n")
    
    print("\n" + "=" * 50)
    print(f"Summary:")
    print(f"  States checked: {states_checked}")
    print(f"  Updates made: {updates_made}")
    print(f"  Already correct: {states_checked - updates_made}")
    print("=" * 50)

if __name__ == '__main__':
    update_state_rates()