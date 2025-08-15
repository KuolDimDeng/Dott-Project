#!/usr/bin/env python
"""
Fix existing POS transactions to use correct currency from BusinessSettings
"""
import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from sales.models import POSTransaction
from users.models import BusinessSettings

def fix_transaction_currencies():
    """Update all existing transactions to use currency from BusinessSettings"""
    print("=== Fixing Existing Transaction Currencies ===\n")
    
    # Get all unique tenant_ids from transactions
    tenant_ids = POSTransaction.objects.values_list('tenant_id', flat=True).distinct()
    
    total_updated = 0
    
    for tenant_id in tenant_ids:
        # Get business settings for this tenant
        business_settings = BusinessSettings.objects.filter(
            tenant_id=tenant_id
        ).first()
        
        if business_settings:
            currency_code = business_settings.preferred_currency_code or 'USD'
            currency_symbol = business_settings.preferred_currency_symbol or '$'
            
            # Update all transactions for this tenant
            updated = POSTransaction.objects.filter(
                tenant_id=tenant_id
            ).update(
                currency_code=currency_code,
                currency_symbol=currency_symbol
            )
            
            print(f"Tenant {tenant_id}:")
            print(f"  - Currency: {currency_code} ({currency_symbol})")
            print(f"  - Updated {updated} transactions")
            print()
            
            total_updated += updated
        else:
            # No business settings, use defaults
            updated = POSTransaction.objects.filter(
                tenant_id=tenant_id
            ).update(
                currency_code='USD',
                currency_symbol='$'
            )
            
            print(f"Tenant {tenant_id}: No business settings, using USD default")
            print(f"  - Updated {updated} transactions")
            print()
            
            total_updated += updated
    
    print(f"\n✅ Total transactions updated: {total_updated}")
    
    # Verify a few transactions
    print("\n=== Verification (First 5 Transactions) ===")
    for trans in POSTransaction.objects.all()[:5]:
        print(f"{trans.transaction_number}: {trans.currency_symbol}{trans.total_amount} ({trans.currency_code})")

if __name__ == "__main__":
    fix_transaction_currencies()