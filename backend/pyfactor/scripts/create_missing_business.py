#!/usr/bin/env python
"""
Create missing Business record for support@dottapps.com
"""
import os
import sys
import django
from uuid import UUID

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction as db_transaction

def create_missing_business():
    """Create the missing business directly with SQL"""
    business_id = '05ce07dc-929f-404c-bef0-7f4692da95be'
    tenant_id = '05ce07dc-929f-404c-bef0-7f4692da95be'
    
    with connection.cursor() as cursor:
        # Check if business exists
        cursor.execute("SELECT id FROM users_business WHERE id = %s", [business_id])
        if cursor.fetchone():
            print(f"Business {business_id} already exists")
            return
        
        with db_transaction.atomic():
            # Create the business with required fields including Stripe defaults
            cursor.execute("""
                INSERT INTO users_business (
                    id, name, created_at, updated_at, 
                    stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled
                )
                VALUES (%s, %s, NOW(), NOW(), false, false, false)
            """, [
                business_id,
                'Dott Support'
            ])
            print(f"✅ Created Business: Dott Support (ID: {business_id})")
            
            # Create BusinessDetails
            cursor.execute("""
                INSERT INTO users_businessdetails (
                    business_id, 
                    preferred_currency_code,
                    preferred_currency_name,
                    show_usd_on_invoices,
                    show_usd_on_quotes,
                    show_usd_on_reports,
                    currency_updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (business_id) DO NOTHING
            """, [
                business_id,
                'USD',
                'US Dollar',
                True,
                True,
                False
            ])
            print("✅ Created BusinessDetails with USD as default currency")

if __name__ == "__main__":
    try:
        create_missing_business()
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()