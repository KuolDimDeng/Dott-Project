"""
Check exactly what data is in the UserProfile
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
        print(f"\n📊 UserProfile data:")
        print(f"  profile.country: {profile.country}")
        print(f"  str(profile.country): {str(profile.country)}")
        print(f"  type(profile.country): {type(profile.country)}")
        
        # Check the raw value
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT country FROM users_userprofile WHERE user_id = %s",
                [user.id]
            )
            row = cursor.fetchone()
            if row:
                print(f"  Raw DB value: {row[0]}")
        
        # Check if business exists
        if profile.business:
            business = profile.business
            print(f"\n📊 Business data:")
            print(f"  business.country: {business.country}")
            print(f"  str(business.country): {str(business.country)}")
    else:
        print(f"\n⚠️  User has no profile!")
    
    # Now test what the view would return
    print(f"\n📊 Testing view logic:")
    user_country = str(profile.country) if profile.country else 'US'
    print(f"  Result: {user_country}")
    
except User.DoesNotExist:
    print(f"❌ User {email} not found")
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()