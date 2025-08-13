#!/usr/bin/env python3
"""
Script to initialize Chart of Accounts for production users.
Run this directly on production via Render shell.
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
from finance.chart_of_accounts_init import initialize_chart_of_accounts
from pyfactor.logging_config import get_logger

logger = get_logger()

def initialize_for_user(email):
    """Initialize Chart of Accounts for a specific user."""
    try:
        user = User.objects.filter(email=email).first()
        if not user:
            print(f"❌ User not found: {email}")
            return False
        
        # Get the user's tenant_id
        tenant_id = user.tenant_id
        if not tenant_id:
            print(f"❌ User {email} has no tenant_id")
            return False
        
        # Get business info if available
        business = Business.objects.filter(tenant_id=tenant_id).first()
        
        print(f"✅ Found user: {email}")
        print(f"   Tenant ID: {tenant_id}")
        if business:
            print(f"   Business: {business.name}")
        
        # Initialize Chart of Accounts
        result = initialize_chart_of_accounts(tenant_id, business)
        
        if result['success']:
            if result.get('existing'):
                print(f"ℹ️  Chart of Accounts already exists with {result['existing']} accounts")
            else:
                print(f"✅ Successfully initialized {result.get('created', 0)} accounts")
                print(f"   Categories created: {result.get('categories_created', 0)}")
                
                # Show some of the created accounts
                from finance.models import ChartOfAccount
                sample_accounts = ChartOfAccount.objects.filter(
                    tenant_id=tenant_id
                ).order_by('account_number')[:5]
                
                if sample_accounts:
                    print("\n   Sample accounts created:")
                    for acc in sample_accounts:
                        print(f"     - {acc.account_number}: {acc.name}")
        else:
            print(f"❌ Failed to initialize: {result.get('error', 'Unknown error')}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def initialize_all_users():
    """Initialize Chart of Accounts for all users without accounts."""
    try:
        from finance.models import ChartOfAccount
        
        # Get all tenants that don't have any accounts
        users_with_tenants = User.objects.exclude(
            tenant_id__isnull=True
        ).values('email', 'tenant_id').distinct()
        
        users_needing_init = []
        for user_info in users_with_tenants:
            account_count = ChartOfAccount.objects.filter(
                tenant_id=user_info['tenant_id']
            ).count()
            
            if account_count == 0:
                users_needing_init.append(user_info['email'])
        
        if not users_needing_init:
            print("✅ All users already have Chart of Accounts initialized")
            return
        
        print(f"Found {len(users_needing_init)} users needing Chart of Accounts initialization")
        
        success_count = 0
        for email in users_needing_init:
            print(f"\nInitializing for {email}...")
            if initialize_for_user(email):
                success_count += 1
        
        print(f"\n✅ Successfully initialized {success_count}/{len(users_needing_init)} users")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        email = sys.argv[1]
        print(f"Initializing Chart of Accounts for {email}...")
        initialize_for_user(email)
    else:
        print("Initializing Chart of Accounts for all users without accounts...")
        initialize_all_users()