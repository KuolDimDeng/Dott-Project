"""
Quick script to remove Plaid accounts for support@dottapps.com
Run this in Django shell: python3 manage.py shell < remove_plaid_accounts_simple.py
"""

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from custom_auth.models import User
from banking.models import BankAccount, PlaidItem

email = 'support@dottapps.com'

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
    print(f"\n📊 Found {account_count} Plaid bank account(s)")
    
    if account_count > 0:
        # List the accounts
        print("\n🏦 Removing accounts:")
        for account in plaid_accounts:
            print(f"  - {account.bank_name}")
        
        with transaction.atomic():
            # Get PlaidItem IDs
            plaid_item_ids = list(plaid_accounts.values_list('integration_id', flat=True))
            
            # Delete PlaidItem records
            PlaidItem.objects.filter(user=user, id__in=plaid_item_ids).delete()
            
            # Delete BankAccount records
            deleted = plaid_accounts.delete()
            
            print(f"\n✅ Successfully removed {deleted[0]} bank account(s)")
            
        # Check user's country
        if hasattr(user, 'userprofile'):
            country = user.userprofile.business_country
            print(f"\n📍 User's business country: {country}")
            
            plaid_countries = ['US', 'CA', 'GB', 'FR', 'ES', 'NL', 'IE', 'DE', 'DK', 
                             'NO', 'SE', 'EE', 'LT', 'LV', 'PL', 'BE', 'AT', 'PT', 'IT']
            
            if country not in plaid_countries:
                print(f"✅ {country} is NOT a Plaid country - Wise should now be available")
            else:
                print(f"⚠️  {country} is a Plaid country")
    else:
        print("\n✅ No Plaid accounts to remove")
        
except User.DoesNotExist:
    print(f"\n❌ User {email} not found")
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()