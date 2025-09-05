#!/usr/bin/env python
"""
Fix has_business flag for support@dottapps.com
This is the main issue preventing the Business menu from showing
"""

import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction
from custom_auth.models import User

def fix_user():
    email = 'support@dottapps.com'
    
    print("\n" + "="*60)
    print(f"Fixing {email}")
    print("="*60 + "\n")
    
    with transaction.atomic():
        try:
            # Get the user
            user = User.objects.get(email=email)
            
            print(f"Current status:")
            print(f"  - Email: {user.email}")
            print(f"  - Role: {user.role}")
            print(f"  - Has Business: {user.has_business} ❌")
            print(f"  - Business ID: {user.business_id}")
            print(f"  - Tenant ID: {user.tenant_id}")
            
            # Fix the critical issue
            user.has_business = True
            user.save()
            
            print(f"\n✅ FIXED!")
            print(f"  - Has Business: {user.has_business} ✅")
            
            # Verify with raw SQL
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT email, role, has_business, business_id 
                    FROM users_user 
                    WHERE email = %s
                """, [email])
                row = cursor.fetchone()
                if row:
                    print(f"\n✅ Verified in database:")
                    print(f"  - Email: {row[0]}")
                    print(f"  - Role: {row[1]}")
                    print(f"  - Has Business: {row[2]} ✅")
                    print(f"  - Business ID: {row[3]}")
            
            print("\n" + "="*60)
            print("✅ SUCCESS! The Business menu should now appear!")
            print("="*60)
            print("\nNext steps:")
            print("1. Log out of support@dottapps.com")
            print("2. Log back in")
            print("3. The Business menu should now be visible")
            
        except User.DoesNotExist:
            print(f"❌ User {email} not found!")
        except Exception as e:
            print(f"❌ Error: {e}")
            raise

if __name__ == '__main__':
    fix_user()