#!/usr/bin/env python3
"""
Direct initialization of Chart of Accounts for existing user
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
os.environ['PGSSLMODE'] = 'disable'  # Disable SSL for local connection
django.setup()

from django.contrib.auth import get_user_model
from finance.chart_of_accounts_init import initialize_for_existing_tenant

User = get_user_model()

def main():
    email = 'kuoldimdeng@outlook.com'
    print(f"Initializing Chart of Accounts for {email}...")
    
    try:
        result = initialize_for_existing_tenant(email)
        
        if result['success']:
            print(f"✅ Successfully initialized {result['created']} accounts")
            print(f"   Tenant ID: {result.get('tenant_id')}")
            if result.get('existing', 0) > 0:
                print(f"   (Already had {result['existing']} existing accounts)")
            
            # Show sample accounts
            if result.get('accounts'):
                print("\n   Sample accounts created:")
                for acc in result['accounts']:
                    print(f"   - {acc['number']}: {acc['name']} ({acc['type']})")
        else:
            print(f"❌ Failed: {result['message']}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()