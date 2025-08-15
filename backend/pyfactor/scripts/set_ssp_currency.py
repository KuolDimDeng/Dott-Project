#!/usr/bin/env python
"""
Set SSP currency for specific user/tenant
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

def set_ssp_currency(email=None):
    """Set SSP currency for a specific user or all users"""
    print("=== Setting SSP Currency ===\n")
    
    if email:
        # Set for specific user
        user = User.objects.filter(email=email).first()
        if not user:
            print(f"❌ User with email {email} not found")
            return
            
        tenant_id = user.tenant_id
        print(f"Found user: {email}")
        print(f"Tenant ID: {tenant_id}")
        
        # Create or update BusinessSettings
        business_settings, created = BusinessSettings.objects.get_or_create(
            tenant_id=tenant_id,
            defaults={
                'preferred_currency_code': 'SSP',
                'preferred_currency_symbol': 'SSP',
                'business_name': user.business_name if hasattr(user, 'business_name') else 'Business',
                'business_type': 'RETAIL',
                'country': 'SS',
            }
        )
        
        if not created:
            # Update existing
            business_settings.preferred_currency_code = 'SSP'
            business_settings.preferred_currency_symbol = 'SSP'
            business_settings.country = 'SS'
            business_settings.save()
        
        print(f"✅ Set currency to SSP for {email}")
        
        # Update all transactions for this tenant
        updated = POSTransaction.objects.filter(
            tenant_id=tenant_id
        ).update(
            currency_code='SSP',
            currency_symbol='SSP'
        )
        
        print(f"✅ Updated {updated} transactions to SSP")
        
    else:
        # Set for all tenants with transactions
        print("Setting SSP for all tenants with transactions...\n")
        
        tenant_ids = POSTransaction.objects.values_list('tenant_id', flat=True).distinct()
        
        for tenant_id in tenant_ids:
            if not tenant_id:
                continue
                
            # Create or update BusinessSettings
            business_settings, created = BusinessSettings.objects.get_or_create(
                tenant_id=tenant_id,
                defaults={
                    'preferred_currency_code': 'SSP',
                    'preferred_currency_symbol': 'SSP',
                    'business_name': 'Business',
                    'business_type': 'RETAIL',
                    'country': 'SS',
                }
            )
            
            if not created:
                business_settings.preferred_currency_code = 'SSP'
                business_settings.preferred_currency_symbol = 'SSP'
                business_settings.country = 'SS'
                business_settings.save()
            
            # Update transactions
            updated = POSTransaction.objects.filter(
                tenant_id=tenant_id
            ).update(
                currency_code='SSP',
                currency_symbol='SSP'
            )
            
            print(f"Tenant {tenant_id}: Updated {updated} transactions to SSP")
    
    print("\n=== Verification ===")
    for trans in POSTransaction.objects.all()[:5]:
        print(f"{trans.transaction_number}: {trans.currency_symbol} {trans.total_amount} ({trans.currency_code})")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Email provided as argument
        email = sys.argv[1]
        set_ssp_currency(email)
    else:
        # No email, update all
        print("Usage: python set_ssp_currency.py [email]")
        print("  - With email: Sets SSP for specific user")
        print("  - Without email: Sets SSP for all tenants")
        print("")
        response = input("Do you want to set SSP for ALL tenants? (yes/no): ")
        if response.lower() == 'yes':
            set_ssp_currency()
        else:
            print("Cancelled.")