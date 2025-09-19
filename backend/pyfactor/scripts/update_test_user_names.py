#!/usr/bin/env python
"""
Update test users' name fields from Auth0 name field
"""
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User

def update_test_users():
    """Update test users with proper first_name and last_name from name field"""

    test_users = [
        {'email': 'johnpeter.test@dottapps.com', 'expected_name': 'John Peter'},
        {'email': 'support@dottapps.com', 'expected_name': 'Support User'},
    ]

    for test_user in test_users:
        try:
            user = User.objects.filter(email=test_user['email']).first()

            if not user:
                print(f"❌ User not found: {test_user['email']}")
                continue

            print(f"\nProcessing user: {user.email}")
            print(f"  Current first_name: '{user.first_name}'")
            print(f"  Current last_name: '{user.last_name}'")
            print(f"  Current name field: '{user.name}'")

            # Parse name from the 'name' field or use expected name
            name_to_parse = user.name or test_user['expected_name']

            if name_to_parse:
                name_parts = name_to_parse.strip().split(' ', 1)
                first_name = name_parts[0] if name_parts else ''
                last_name = name_parts[1] if len(name_parts) > 1 else ''

                # Update the user
                user.first_name = first_name
                user.last_name = last_name
                if not user.name:
                    user.name = name_to_parse
                user.save()

                print(f"  ✅ Updated to:")
                print(f"     first_name: '{user.first_name}'")
                print(f"     last_name: '{user.last_name}'")
                print(f"     name: '{user.name}'")
            else:
                print(f"  ⚠️ No name data available to parse")

        except Exception as e:
            print(f"❌ Error updating user {test_user['email']}: {str(e)}")

if __name__ == "__main__":
    print("""
    ========================================
    Updating Test Users' Name Fields
    ========================================
    """)

    update_test_users()

    print("\n✅ Done!")