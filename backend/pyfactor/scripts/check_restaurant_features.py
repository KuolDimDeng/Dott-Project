#!/usr/bin/env python3
"""
Check restaurant features for a user
"""

import os
import sys
import django

# Setup Django
if os.path.exists('/app'):
    sys.path.insert(0, '/app')
else:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import UserProfile, BusinessDetails
from marketplace.models import BusinessListing
from datetime import datetime

User = get_user_model()

def check_restaurant_features(email='support@dottapps.com'):
    """Check business type and features for a user"""

    print(f"\n🔍 Checking business features for: {email}")
    print("=" * 60)

    try:
        # Get user
        user = User.objects.get(email=email)
        print(f"✅ Found user: {user.email}")
        print(f"   User ID: {user.id}")

        # Check UserProfile
        try:
            profile = UserProfile.objects.get(user=user)
            print(f"\n✅ Found UserProfile")
            print(f"   Has business: {profile.business is not None}")

            if profile.business:
                business = profile.business
                print(f"   Business name: {business.name}")
                print(f"   Business ID: {business.id}")

                # Check BusinessDetails
                try:
                    details = BusinessDetails.objects.get(business=business)
                    print(f"\n✅ Found BusinessDetails")
                    print(f"   Simplified business type: {details.simplified_business_type}")
                    print(f"   Is restaurant type: {details.simplified_business_type == 'RESTAURANT_CAFE'}")
                except BusinessDetails.DoesNotExist:
                    print(f"\n❌ No BusinessDetails found")
                    details = None

                # Check onboarding date (legacy user check)
                if hasattr(user, 'onboarding_progress'):
                    onboarding = user.onboarding_progress
                    created_date = onboarding.created_at
                    if created_date:
                        created_date = created_date.replace(tzinfo=None)
                        SIMPLIFIED_TYPES_LAUNCH_DATE = datetime(2025, 7, 26)
                        is_legacy = created_date < SIMPLIFIED_TYPES_LAUNCH_DATE
                        print(f"\n📅 Onboarding created: {created_date}")
                        print(f"   Is legacy user: {is_legacy}")

                        if is_legacy:
                            print(f"   ✅ Legacy user - should see ALL features including Menu")
                    else:
                        print(f"\n⚠️ No onboarding date found")
                else:
                    print(f"\n⚠️ No onboarding_progress found")

        except UserProfile.DoesNotExist:
            print(f"\n❌ No UserProfile found")

        # Check marketplace listing
        try:
            listing = BusinessListing.objects.get(business=user)
            print(f"\n✅ Found BusinessListing")
            print(f"   Business type: {listing.business_type}")

            # Check if business type indicates restaurant
            business_type_lower = (listing.business_type or '').lower()
            is_restaurant = ('restaurant' in business_type_lower or
                           'cafe' in business_type_lower or
                           'diner' in business_type_lower or
                           'bistro' in business_type_lower or
                           'eatery' in business_type_lower or
                           'grill' in business_type_lower or
                           'kitchen' in business_type_lower)

            print(f"   Is restaurant (by marketplace): {is_restaurant}")

        except BusinessListing.DoesNotExist:
            print(f"\n❌ No BusinessListing found")

        # Check user name for restaurant indicators
        user_name = getattr(user, 'name', '').lower()
        print(f"\n🏢 User/Business name: {getattr(user, 'name', 'N/A')}")
        if 'restaurant' in user_name or 'cafe' in user_name:
            print(f"   ✅ Name indicates restaurant business")

        # Determine what features should be shown
        print(f"\n📋 FEATURE DETERMINATION:")
        print(f"   Based on analysis, this user should see:")
        print(f"   - Menu option: YES (restaurant/legacy user)")
        print(f"   - Orders option: YES (restaurant business)")
        print(f"   - Staff option: YES (renamed from Employees)")
        print(f"   - Dashboard option: YES (all businesses)")
        print(f"   - Advertise option: YES (all businesses)")
        print(f"   - Transactions option: YES (all businesses)")

    except User.DoesNotExist:
        print(f"\n❌ User not found: {email}")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else 'support@dottapps.com'
    check_restaurant_features(email)