"""
Check what the banking API returns
"""

from custom_auth.models import User
from banking.models import BankAccount
from django.contrib.contenttypes.models import ContentType

email = 'support@dottapps.com'

try:
    user = User.objects.get(email=email)
    print(f"✅ Found user: {user.email}")
    
    # Check ALL bank accounts (without any filter)
    all_accounts = BankAccount.objects.all()
    print(f"\n📊 Total bank accounts in DB: {all_accounts.count()}")
    
    # Check accounts for this user
    user_accounts = BankAccount.objects.filter(user=user)
    print(f"📊 Bank accounts for {user.email}: {user_accounts.count()}")
    
    # Check if there are accounts with user_id=250 (hardcoded)
    accounts_250 = BankAccount.objects.filter(user_id=250)
    print(f"📊 Bank accounts for user_id=250: {accounts_250.count()}")
    
    # Check recent accounts
    recent_accounts = BankAccount.objects.all().order_by('-id')[:5]
    print(f"\n📊 Recent 5 bank accounts:")
    for acc in recent_accounts:
        print(f"  - ID: {acc.id}, User: {acc.user.email if acc.user else 'None'}, Bank: {acc.bank_name}")
    
    # Check if there's any caching or view that might return different data
    from banking.views import BankAccountListCreateView
    from django.test import RequestFactory
    
    factory = RequestFactory()
    request = factory.get('/api/banking/accounts/')
    request.user = user
    
    # Try calling the view
    view = BankAccountListCreateView()
    view.request = request
    
    # Check what queryset the view would use
    queryset = view.get_queryset()
    print(f"\n📊 View queryset count: {queryset.count()}")
    if queryset.exists():
        for acc in queryset:
            print(f"  - {acc.bank_name} ({acc.account_number})")
    
except User.DoesNotExist:
    print(f"❌ User {email} not found")
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()