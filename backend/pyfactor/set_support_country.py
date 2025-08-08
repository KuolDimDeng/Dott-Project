"""
Set support@dottapps.com country to South Sudan
"""

from custom_auth.models import User
from users.models import UserProfile, Business

email = 'support@dottapps.com'

try:
    user = User.objects.get(email=email)
    print(f"✅ Found user: {user.email}")
    
    # Check if profile exists
    if hasattr(user, 'profile'):
        profile = user.profile
        print(f"📊 Existing profile found")
        print(f"   Current country: {profile.country}")
    else:
        # Create profile with same tenant as user
        profile = UserProfile.objects.create(
            user=user,
            country='SS',  # South Sudan
            phone_number='+211555190595',  # South Sudan phone
            tenant_id=user.tenant_id  # Use same tenant as user
        )
        print(f"✅ Created UserProfile for {user.email}")
    
    # Update to South Sudan
    profile.country = 'SS'  # South Sudan ISO code
    profile.save()
    
    print(f"\n✅ UserProfile updated:")
    print(f"   Country: {profile.country}")
    
    # Also update business if exists
    if profile.business:
        business = profile.business
        business.country = 'SS'
        business.save()
        print(f"   Business Country: {business.country}")
    
    # Check banking setup
    from banking.models import BankAccount
    accounts = BankAccount.objects.filter(user=user)
    print(f"\n📊 Bank Accounts: {accounts.count()}")
    
    # List of Plaid countries
    plaid_countries = ['US', 'CA', 'GB', 'FR', 'ES', 'NL', 'IE', 'DE', 'DK', 
                      'NO', 'SE', 'EE', 'LT', 'LV', 'PL', 'BE', 'AT', 'PT', 'IT']
    
    if 'SS' not in plaid_countries:
        print(f"\n✅ South Sudan (SS) is NOT a Plaid country")
        print(f"   → Wise should be shown for banking connections")
    
except User.DoesNotExist:
    print(f"❌ User {email} not found")
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()