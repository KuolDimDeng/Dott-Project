#!/usr/bin/env python
"""
Fix BusinessSettings to have SSP currency for South Sudan users
"""
import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import BusinessSettings, UserProfile
from sales.models import POSTransaction

User = get_user_model()

def fix_business_settings_currency():
    """Create or update BusinessSettings with SSP currency for South Sudan users"""
    print("=== Fixing BusinessSettings Currency ===\n")
    
    # Get all unique tenant_ids that have transactions
    tenant_ids = POSTransaction.objects.values_list('tenant_id', flat=True).distinct()
    
    for tenant_id in tenant_ids:
        if not tenant_id:
            print(f"Skipping None tenant_id")
            continue
            
        print(f"Processing tenant: {tenant_id}")
        
        # Get or create BusinessSettings for this tenant
        business_settings, created = BusinessSettings.objects.get_or_create(
            tenant_id=tenant_id,
            defaults={
                'preferred_currency_code': 'SSP',
                'preferred_currency_symbol': 'SSP',
                'business_name': 'Business',  # Default name
                'business_type': 'RETAIL',
                'country': 'SS',  # South Sudan
            }
        )
        
        if created:
            print(f"  ✅ Created BusinessSettings with SSP currency")
        else:
            # Update existing settings to use SSP
            if business_settings.country == 'SS' or not business_settings.preferred_currency_code:
                business_settings.preferred_currency_code = 'SSP'
                business_settings.preferred_currency_symbol = 'SSP'
                business_settings.save()
                print(f"  ✅ Updated to SSP currency")
            else:
                print(f"  - Keeping existing currency: {business_settings.preferred_currency_code}")
        
        # Get user for this tenant to check country
        user = User.objects.filter(tenant_id=tenant_id).first()
        if user:
            user_profile = UserProfile.objects.filter(user=user).first()
            if user_profile:
                print(f"  - User: {user.email}")
                print(f"  - Country: {user_profile.country if hasattr(user_profile, 'country') else 'Not set'}")
                
                # If user is from South Sudan, ensure SSP currency
                if hasattr(user_profile, 'country') and user_profile.country == 'SS':
                    if business_settings.preferred_currency_code != 'SSP':
                        business_settings.preferred_currency_code = 'SSP'
                        business_settings.preferred_currency_symbol = 'SSP'
                        business_settings.country = 'SS'
                        business_settings.save()
                        print(f"  ✅ Force updated to SSP for South Sudan user")
    
    print("\n=== Now updating transactions with correct currency ===\n")
    
    # Update transactions again with the fixed BusinessSettings
    total_updated = 0
    
    for tenant_id in tenant_ids:
        if not tenant_id:
            continue
            
        business_settings = BusinessSettings.objects.filter(tenant_id=tenant_id).first()
        
        if business_settings:
            currency_code = business_settings.preferred_currency_code
            currency_symbol = business_settings.preferred_currency_symbol
            
            updated = POSTransaction.objects.filter(
                tenant_id=tenant_id
            ).update(
                currency_code=currency_code,
                currency_symbol=currency_symbol
            )
            
            print(f"Tenant {tenant_id}:")
            print(f"  - Currency: {currency_code} ({currency_symbol})")
            print(f"  - Updated {updated} transactions")
            
            total_updated += updated
    
    print(f"\n✅ Total transactions updated: {total_updated}")
    
    # Verify
    print("\n=== Verification (First 5 Transactions) ===")
    for trans in POSTransaction.objects.all()[:5]:
        print(f"{trans.transaction_number}: {trans.currency_symbol} {trans.total_amount} ({trans.currency_code})")

if __name__ == "__main__":
    fix_business_settings_currency()