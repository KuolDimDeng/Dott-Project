#!/usr/bin/env python
"""
Fix missing Business record using Django ORM
"""
import os
import sys
import django

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from users.models import Business, BusinessDetails
from uuid import UUID

def create_business():
    business_id = UUID('05ce07dc-929f-404c-bef0-7f4692da95be')
    
    # Check if business exists
    if Business.objects.filter(id=business_id).exists():
        print(f"Business {business_id} already exists")
        return
    
    # Create business with minimal fields
    business = Business(
        id=business_id,
        name='Dott Support'
    )
    
    # Set Stripe fields to empty strings if they're not nullable
    business.stripe_customer_id = ''
    business.default_bank_token = ''
    business.ach_mandate_id = ''
    
    business.save()
    print(f"✅ Created Business: {business.name}")
    
    # Create BusinessDetails
    business_details, created = BusinessDetails.objects.get_or_create(
        business=business,
        defaults={
            'preferred_currency_code': 'USD',
            'preferred_currency_name': 'US Dollar',
            'show_usd_on_invoices': True,
            'show_usd_on_quotes': True,
            'show_usd_on_reports': False,
        }
    )
    if created:
        print("✅ Created BusinessDetails with USD as default currency")
    else:
        print("BusinessDetails already exists")

if __name__ == "__main__":
    try:
        create_business()
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()