"""
Fix support@dottapps.com to have a UserProfile with South Sudan as business country
"""

from custom_auth.models import User
from users.models import UserProfile

email = 'support@dottapps.com'

try:
    user = User.objects.get(email=email)
    print(f"✅ Found user: {user.email}")
    
    # Check if profile exists
    if hasattr(user, 'profile'):
        profile = user.profile
        print(f"📊 Existing profile found")
        print(f"   Current business_country: {profile.business_country}")
        print(f"   Current country: {profile.country}")
    else:
        # Create profile
        profile = UserProfile.objects.create(
            user=user,
            business_country='SS',  # South Sudan
            country='SS',  # South Sudan
            business_name='Dott Support',
            phone='+211555190595',  # South Sudan phone
            address='Juba, South Sudan',
            tenant_id=user.tenant_id  # Use same tenant as user
        )
        print(f"✅ Created UserProfile for {user.email}")
    
    # Update to South Sudan
    profile.business_country = 'SS'
    profile.country = 'SS'
    profile.save()
    
    print(f"\n✅ UserProfile updated:")
    print(f"   Business Country: {profile.business_country}")
    print(f"   Country: {profile.country}")
    print(f"   Business Name: {profile.business_name}")
    
    # Check banking setup
    from banking.models import BankAccount
    accounts = BankAccount.objects.filter(user=user)
    print(f"\n📊 Bank Accounts: {accounts.count()}")
    
    if profile.business_country == 'SS':
        print(f"\n✅ South Sudan (SS) is NOT a Plaid country")
        print(f"   → Wise should be shown for banking connections")
    
except User.DoesNotExist:
    print(f"❌ User {email} not found")
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()