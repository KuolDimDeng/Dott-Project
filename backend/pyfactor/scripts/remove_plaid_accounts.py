#!/usr/bin/env python
"""
Script to remove Plaid bank accounts for a specific user.
This is needed when a user changes their country from a Plaid-supported country
to a non-Plaid country (like South Sudan) and needs to use Wise instead.
"""

import os
import sys
import django
from django.contrib.contenttypes.models import ContentType

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from custom_auth.models import User
from banking.models import BankAccount, PlaidItem


def remove_plaid_accounts_for_user(email):
    """Remove all Plaid bank accounts for a specific user."""
    try:
        # Find the user
        user = User.objects.get(email=email)
        print(f"\n✅ Found user: {user.email}")
        
        # Get the PlaidItem ContentType
        plaid_ct = ContentType.objects.get_for_model(PlaidItem)
        
        # Find all BankAccounts linked to PlaidItem for this user
        plaid_accounts = BankAccount.objects.filter(
            user=user,
            integration_type=plaid_ct
        )
        
        account_count = plaid_accounts.count()
        print(f"\n📊 Found {account_count} Plaid bank account(s) for {user.email}")
        
        if account_count > 0:
            # List the accounts to be deleted
            print("\n🏦 Accounts to be removed:")
            for account in plaid_accounts:
                print(f"  - {account.bank_name} (****{account.account_number[-4:] if len(account.account_number) >= 4 else '****'})")
                print(f"    Type: {account.account_type or 'Unknown'}")
                print(f"    Balance: ${account.balance}")
            
            # Get confirmation
            confirm = input(f"\n⚠️  Are you sure you want to remove these {account_count} Plaid account(s)? (yes/no): ")
            
            if confirm.lower() == 'yes':
                with transaction.atomic():
                    # Also remove the associated PlaidItem records
                    plaid_item_ids = []
                    for account in plaid_accounts:
                        plaid_item_ids.append(account.integration_id)
                    
                    # Delete the PlaidItem records
                    deleted_items = PlaidItem.objects.filter(
                        user=user,
                        id__in=plaid_item_ids
                    ).delete()
                    
                    # Delete the BankAccount records
                    deleted_accounts = plaid_accounts.delete()
                    
                    print(f"\n✅ Successfully removed {deleted_accounts[0]} bank account(s)")
                    print(f"✅ Successfully removed {deleted_items[0]} Plaid integration(s)")
                    
                    # Check user's country
                    if hasattr(user, 'userprofile') and user.userprofile.business_country:
                        country = user.userprofile.business_country
                        print(f"\n📍 User's business country: {country}")
                        
                        # List of Plaid-supported countries
                        plaid_countries = [
                            'US', 'CA', 'GB', 'FR', 'ES', 'NL', 'IE', 'DE', 'DK', 
                            'NO', 'SE', 'EE', 'LT', 'LV', 'PL', 'BE', 'AT', 'PT', 'IT'
                        ]
                        
                        if country not in plaid_countries:
                            print(f"✅ {country} is NOT a Plaid country - Wise should now be available")
                        else:
                            print(f"⚠️  {country} is a Plaid country - Plaid will still be shown")
                    else:
                        print("\n⚠️  Could not determine user's business country")
            else:
                print("\n❌ Operation cancelled")
        else:
            print("\n✅ No Plaid accounts to remove")
            
            # Check if there are any other bank accounts
            all_accounts = BankAccount.objects.filter(user=user)
            if all_accounts.exists():
                print(f"\n📊 User has {all_accounts.count()} other bank account(s):")
                for account in all_accounts:
                    ct = account.integration_type
                    integration_name = ct.model_class().__name__ if ct else "Unknown"
                    print(f"  - {account.bank_name} via {integration_name}")
                    
    except User.DoesNotExist:
        print(f"\n❌ User with email {email} not found")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python remove_plaid_accounts.py <user_email>")
        print("Example: python remove_plaid_accounts.py support@dottapps.com")
        sys.exit(1)
    
    email = sys.argv[1]
    remove_plaid_accounts_for_user(email)