#!/usr/bin/env python
"""
Script to investigate the support@dottapps.com user and their business associations.
This helps debug the UserProfile creation issue.

Usage:
    python scripts/investigate_support_user.py
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
from users.models import UserProfile, Business


def investigate_support_user():
    """Investigate the support@dottapps.com user and their business associations"""
    
    email = 'support@dottapps.com'
    
    print(f"\n{'='*60}")
    print(f"Investigating {email}")
    print(f"{'='*60}\n")
    
    # 1. Check the user
    try:
        user = User.objects.get(email=email)
        print(f"✓ Found user: {user.email}")
        print(f"  - User ID: {user.id}")
        print(f"  - Username: {user.username}")
        print(f"  - Role: {user.role}")
        print(f"  - Business ID (user.business_id): {getattr(user, 'business_id', 'Not set')}")
        print(f"  - Tenant ID (user.tenant_id): {getattr(user, 'tenant_id', 'Not set')}")
        
        # Check all fields on user
        print(f"\n  All User fields:")
        for field in user._meta.fields:
            field_name = field.name
            field_value = getattr(user, field_name, None)
            if field_value and field_name not in ['password', 'auth0_id']:
                print(f"    - {field_name}: {field_value}")
        
    except User.DoesNotExist:
        print(f"✗ ERROR: User with email {email} not found!")
        return
    
    # 2. Check if UserProfile exists
    print(f"\n{'='*60}")
    print("Checking UserProfile...")
    try:
        profile = UserProfile.objects.get(user=user)
        print(f"✓ UserProfile exists!")
        print(f"  - Profile ID: {profile.id}")
        print(f"  - Business ID: {profile.business_id}")
    except UserProfile.DoesNotExist:
        print(f"✗ No UserProfile found for this user")
    
    # 3. Check all businesses
    print(f"\n{'='*60}")
    print("Checking all Businesses...")
    businesses = Business.objects.all()
    print(f"Total businesses in database: {businesses.count()}")
    
    # Look for businesses by name
    dott_businesses = Business.objects.filter(name__icontains='dott')
    if dott_businesses.exists():
        print(f"\nBusinesses with 'dott' in name:")
        for business in dott_businesses:
            print(f"  - ID: {business.id}")
            print(f"    Name: {business.name}")
            print(f"    Owner ID: {business.owner_id}")
            print(f"    Business Type: {getattr(business, 'business_type', 'Not set')}")
    
    # Look for businesses by owner
    owner_businesses = Business.objects.filter(owner_id=user.id)
    if owner_businesses.exists():
        print(f"\nBusinesses owned by user {user.id}:")
        for business in owner_businesses:
            print(f"  - ID: {business.id}")
            print(f"    Name: {business.name}")
    
    # 4. Raw SQL query to check businesses table
    print(f"\n{'='*60}")
    print("Raw SQL query for businesses...")
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, name, owner_id, business_type, created_at 
            FROM businesses 
            WHERE name LIKE '%dott%' OR name LIKE '%Dott%'
            ORDER BY created_at DESC
            LIMIT 10
        """)
        rows = cursor.fetchall()
        if rows:
            print(f"Found {len(rows)} businesses:")
            for row in rows:
                print(f"  - ID: {row[0]}")
                print(f"    Name: {row[1]}")
                print(f"    Owner ID: {row[2]}")
                print(f"    Type: {row[3]}")
                print(f"    Created: {row[4]}")
        else:
            print("No businesses found with 'dott' in name")
    
    # 5. Check if the specific business ID exists
    print(f"\n{'='*60}")
    print(f"Checking for business ID: 05ce07dc-929f-404c-bef0-7f4692da95be")
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, name, owner_id 
            FROM businesses 
            WHERE id = '05ce07dc-929f-404c-bef0-7f4692da95be'
        """)
        row = cursor.fetchone()
        if row:
            print(f"✓ Found business with this ID:")
            print(f"  - Name: {row[1]}")
            print(f"  - Owner ID: {row[2]}")
        else:
            print(f"✗ No business found with this ID")
    
    # 6. Suggest next steps
    print(f"\n{'='*60}")
    print("RECOMMENDATIONS:")
    print(f"{'='*60}")
    
    if not owner_businesses.exists():
        print("\n1. The user doesn't own any businesses.")
        print("   You may need to:")
        print("   a) Create a UserProfile without a business_id")
        print("   b) Create a business for this user first")
        print("   c) Find the correct business ID to associate")
    else:
        correct_business = owner_businesses.first()
        print(f"\n1. Found business owned by user: {correct_business.name} (ID: {correct_business.id})")
        print(f"   Use this command to fix:")
        print(f"   python manage.py create_missing_userprofile --email {email} --business-id {correct_business.id}")


if __name__ == '__main__':
    investigate_support_user()