"""
Check all bank accounts for support@dottapps.com
"""

from custom_auth.models import User
from banking.models import BankAccount, PlaidItem
from django.contrib.contenttypes.models import ContentType

email = 'support@dottapps.com'

try:
    user = User.objects.get(email=email)
    print(f"✅ Found user: {user.email}")
    
    # Check all bank accounts
    all_accounts = BankAccount.objects.filter(user=user)
    print(f"\n📊 Total bank accounts: {all_accounts.count()}")
    
    if all_accounts.exists():
        for account in all_accounts:
            ct = account.integration_type
            integration_name = ct.model_class().__name__ if ct else "Unknown"
            print(f"\n  Account ID: {account.id}")
            print(f"  Bank Name: {account.bank_name}")
            print(f"  Account Number: {account.account_number}")
            print(f"  Balance: {account.balance}")
            print(f"  Integration Type: {integration_name}")
            print(f"  Integration ID: {account.integration_id}")
            
            # Check if it's a PlaidItem
            if integration_name == 'PlaidItem':
                try:
                    plaid_item = PlaidItem.objects.get(id=account.integration_id)
                    print(f"  Plaid Item ID: {plaid_item.item_id}")
                    print(f"  ⚠️  This is a Plaid account!")
                except PlaidItem.DoesNotExist:
                    print(f"  ⚠️  PlaidItem with ID {account.integration_id} does not exist!")
    
    # Check UserProfile country
    if hasattr(user, 'profile'):
        profile = user.profile
        print(f"\n📍 User Profile:")
        print(f"  Country: {profile.country}")
        print(f"  Business ID: {profile.business_id}")
        
        if profile.business:
            print(f"  Business Country: {profile.business.country}")
    else:
        print(f"\n⚠️  User has no profile!")
    
except User.DoesNotExist:
    print(f"❌ User {email} not found")
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()