#!/usr/bin/env python3
"""
Script to correct South Sudan's sales tax rate to 18%
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

def update_south_sudan_rate():
    """Update South Sudan's sales tax rate to correct 18%"""
    
    print("Updating South Sudan sales tax rate...")
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
        ss_rate.rate = Decimal('0.18')
        ss_rate.tax_type = 'sales_tax'
        ss_rate.manually_verified = True
        ss_rate.manual_notes = "Standard sales tax rate 18% (Financial Act 2023/2024)"
        ss_rate.save()
        print(f"✅ Updated South Sudan: {old_rate*100:.1f}% → 18.0% sales tax")
        print("Note: South Sudan uses sales tax (not VAT) at 18% standard rate")
        print("Some categories may have 20% (imports, hospitality services)")
    else:
        print("❌ South Sudan rate not found in database")
    
    print("=" * 60)
    print("✅ Update complete!")

if __name__ == "__main__":
    update_south_sudan_rate()