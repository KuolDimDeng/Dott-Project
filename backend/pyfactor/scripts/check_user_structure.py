#!/usr/bin/env python
"""
Check the actual structure of the User model and database
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
print(f"Checking User Model Structure for {email}")
print("="*60 + "\n")

# Check model fields
user = User.objects.get(email=email)
print("User model fields:")
for field in user._meta.fields:
    field_name = field.name
    field_value = getattr(user, field_name, None)
    if field_name not in ['password']:  # Skip sensitive fields
        print(f"  - {field_name}: {field_value}")

# Check raw database columns
print("\n" + "="*60)
print("Raw Database Columns:")
print("="*60 + "\n")

with connection.cursor() as cursor:
    # Get column names
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users_user'
        ORDER BY ordinal_position
    """)
    columns = cursor.fetchall()
    print("Available columns in users_user table:")
    for col in columns:
        print(f"  - {col[0]}")
    
    # Get the actual data
    print("\n" + "="*60)
    print(f"Data for {email}:")
    print("="*60 + "\n")
    
    cursor.execute("""
        SELECT * FROM users_user WHERE email = %s
    """, [email])
    
    # Get column names from cursor description
    col_names = [desc[0] for desc in cursor.description]
    row = cursor.fetchone()
    
    if row:
        for i, col_name in enumerate(col_names):
            if col_name not in ['password']:  # Skip sensitive fields
                print(f"  - {col_name}: {row[i]}")

print("\n" + "="*60)
print("ANALYSIS:")
print("="*60)
print("\nThe 'has_business' field might:")
print("1. Be stored in UserProfile instead of User")
print("2. Be computed dynamically based on business_id")
print("3. Not exist at all in the database")
print("\nLet's check UserProfile...")

# Check UserProfile
from users.models import UserProfile
try:
    profile = UserProfile.objects.get(user=user)
    print("\nUserProfile fields:")
    for field in profile._meta.fields:
        field_name = field.name
        field_value = getattr(profile, field_name, None)
        print(f"  - {field_name}: {field_value}")
except UserProfile.DoesNotExist:
    print("No UserProfile found")