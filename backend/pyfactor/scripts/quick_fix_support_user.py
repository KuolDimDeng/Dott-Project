#!/usr/bin/env python
"""
Quick fix for support@dottapps.com user's has_business flag
"""

import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from custom_auth.models import User

email = 'support@dottapps.com'

print("\n" + "="*60)
print(f"Quick Fix for {email}")
print("="*60 + "\n")

try:
    # Get the user
    user = User.objects.get(email=email)
    print(f"Found user: {user.email}")
    print(f"  Current has_business: {user.has_business}")
    print(f"  Current role: {user.role}")
    
    # Fix the has_business flag
    user.has_business = True
    user.save()
    
    print("\n✅ Fixed!")
    print(f"  has_business is now: {user.has_business}")
    
    # Verify with raw SQL
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT has_business, role, business_id 
            FROM users_user 
            WHERE email = %s
        """, [email])
        row = cursor.fetchone()
        if row:
            print(f"\nVerified in database:")
            print(f"  has_business: {row[0]}")
            print(f"  role: {row[1]}")
            print(f"  business_id: {row[2]}")
    
    print("\n✅ The Business menu should now appear when you log in!")
    
except User.DoesNotExist:
    print(f"❌ User {email} not found!")
except Exception as e:
    print(f"❌ Error: {e}")