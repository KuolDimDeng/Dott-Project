#!/usr/bin/env python3
"""
Script to revert South Sudan's sales tax rate back to original
"""

import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from taxes.models import GlobalSalesTaxRate
from decimal import Decimal

def revert_south_sudan_rate():
    """Revert South Sudan's sales tax rate back to original"""
    
    print("Reverting South Sudan sales tax rate to original...")
    print("=" * 60)
    
    # Find South Sudan rate
    ss_rate = GlobalSalesTaxRate.objects.filter(
        country='SS',
        region_code='',
        locality='',
        is_current=True
    ).first()
    
    if ss_rate:
        old_rate = ss_rate.rate
        ss_rate.rate = Decimal('0.10')  # Revert to original 10%
        ss_rate.tax_type = 'sales_tax'
        ss_rate.manually_verified = True
        ss_rate.manual_notes = "Reverted to original rate - country rates should not be modified"
        ss_rate.save()
        print(f"✅ Reverted South Sudan: {old_rate*100:.1f}% → 10.0% sales tax")
        print("Note: Only adding sub-national rates, not modifying country rates")
    else:
        print("❌ South Sudan rate not found in database")
    
    print("=" * 60)
    print("✅ Revert complete!")

if __name__ == "__main__":
    revert_south_sudan_rate()