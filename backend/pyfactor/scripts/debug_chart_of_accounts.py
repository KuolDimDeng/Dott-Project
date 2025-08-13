#!/usr/bin/env python3
"""
Debug script to check and fix Chart of Accounts initialization
Run this on staging/production via Render shell
"""

import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from custom_auth.models import User
from users.models import Business
from finance.models import ChartOfAccount, AccountCategory
from finance.chart_of_accounts_init import initialize_chart_of_accounts
from pyfactor.logging_config import get_logger

logger = get_logger()

def debug_chart_of_accounts(email='kuoldimdeng@outlook.com'):
    """Debug and fix Chart of Accounts for a specific user."""
    try:
        print(f"\n{'='*60}")
        print(f"DEBUGGING CHART OF ACCOUNTS FOR: {email}")
        print(f"{'='*60}\n")
        
        # Get the user
        user = User.objects.filter(email=email).first()
        if not user:
            print(f"❌ User not found: {email}")
            return False
        
        print(f"✅ User found: {user.email}")
        print(f"   User ID: {user.id}")
        print(f"   Tenant ID: {user.tenant_id}")
        print(f"   Business ID: {user.business_id}")
        
        # Check tenant_id
        if not user.tenant_id:
            print(f"❌ User has no tenant_id!")
            return False
        
        tenant_id = user.tenant_id
        
        # Get business
        business = Business.objects.filter(tenant_id=tenant_id).first()
        if business:
            print(f"✅ Business found: {business.name}")
            print(f"   Business ID: {business.id}")
            print(f"   Business tenant_id: {business.tenant_id}")
        else:
            print(f"⚠️  No business found for tenant {tenant_id}")
        
        # Check existing Chart of Accounts
        print(f"\n{'='*40}")
        print("CHECKING EXISTING CHART OF ACCOUNTS")
        print(f"{'='*40}")
        
        # Count by tenant_id
        accounts = ChartOfAccount.objects.filter(tenant_id=tenant_id)
        account_count = accounts.count()
        print(f"Accounts for tenant {tenant_id}: {account_count}")
        
        # Show first few accounts
        if account_count > 0:
            print("\nFirst 5 accounts:")
            for acc in accounts[:5]:
                print(f"  {acc.account_number}: {acc.name}")
                print(f"    Category: {acc.category.name if acc.category else 'None'}")
                print(f"    Tenant: {acc.tenant_id}")
        
        # Check AccountCategory
        categories = AccountCategory.objects.filter(tenant_id=tenant_id)
        category_count = categories.count()
        print(f"\nCategories for tenant {tenant_id}: {category_count}")
        
        if category_count > 0:
            print("Categories:")
            for cat in categories:
                print(f"  {cat.code}: {cat.name}")
        
        # If no accounts, initialize them
        if account_count == 0:
            print(f"\n{'='*40}")
            print("INITIALIZING CHART OF ACCOUNTS")
            print(f"{'='*40}")
            
            result = initialize_chart_of_accounts(tenant_id, business)
            
            if result['success']:
                print(f"✅ Successfully initialized Chart of Accounts!")
                print(f"   Created: {result.get('created', 0)} accounts")
                print(f"   Categories: {result.get('categories_created', 0)}")
                
                # Verify the creation
                new_count = ChartOfAccount.objects.filter(tenant_id=tenant_id).count()
                print(f"   Verified count: {new_count} accounts")
                
                # Show some created accounts
                new_accounts = ChartOfAccount.objects.filter(tenant_id=tenant_id)[:5]
                print("\nSample created accounts:")
                for acc in new_accounts:
                    print(f"  {acc.account_number}: {acc.name}")
            else:
                print(f"❌ Failed to initialize: {result.get('error')}")
                return False
        else:
            print(f"\n✅ Chart of Accounts already exists with {account_count} accounts")
        
        # Debug the API filtering
        print(f"\n{'='*40}")
        print("DEBUGGING API FILTERING")
        print(f"{'='*40}")
        
        # Test the exact filter used in the API
        print(f"Testing: ChartOfAccount.objects.filter(tenant_id='{tenant_id}')")
        api_query = ChartOfAccount.objects.filter(tenant_id=tenant_id)
        api_count = api_query.count()
        print(f"Result count: {api_count}")
        
        # Check if tenant_id field exists and is accessible
        first_account = ChartOfAccount.objects.first()
        if first_account:
            print(f"\nFirst account in database:")
            print(f"  ID: {first_account.id}")
            print(f"  Account Number: {first_account.account_number}")
            print(f"  Name: {first_account.name}")
            print(f"  Tenant ID: {first_account.tenant_id}")
            print(f"  Tenant ID type: {type(first_account.tenant_id)}")
        
        # Check all unique tenant_ids in ChartOfAccount
        from django.db.models import Count
        tenant_distribution = ChartOfAccount.objects.values('tenant_id').annotate(count=Count('id'))
        print(f"\nTenant distribution in ChartOfAccount:")
        for td in tenant_distribution[:5]:
            print(f"  Tenant {td['tenant_id']}: {td['count']} accounts")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else 'kuoldimdeng@outlook.com'
    debug_chart_of_accounts(email)