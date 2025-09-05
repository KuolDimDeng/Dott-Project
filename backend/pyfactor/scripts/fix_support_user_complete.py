#!/usr/bin/env python
"""
Script to diagnose and fix the support@dottapps.com user's business menu and role issues.

Usage:
    python scripts/fix_support_user_complete.py [--fix]
"""

import os
import sys
import django
import argparse

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction
from custom_auth.models import User
from users.models import UserProfile, Business
from hr.models import Employee

def diagnose_support_user():
    """Diagnose issues with support@dottapps.com user"""
    
    email = 'support@dottapps.com'
    issues = []
    
    print(f"\n{'='*60}")
    print(f"Diagnosing {email}")
    print(f"{'='*60}\n")
    
    # 1. Check User
    try:
        user = User.objects.get(email=email)
        print(f"✓ User found:")
        print(f"  - ID: {user.id}")
        print(f"  - Username: {user.username}")
        print(f"  - Role: {getattr(user, 'role', 'NOT SET')}")
        print(f"  - Has Business: {getattr(user, 'has_business', False)}")
        print(f"  - Business ID: {getattr(user, 'business_id', 'NOT SET')}")
        print(f"  - Tenant ID: {getattr(user, 'tenant_id', 'NOT SET')}")
        
        # Check role issue
        if not hasattr(user, 'role') or user.role != 'OWNER':
            issues.append(f"User role is not OWNER (current: {getattr(user, 'role', 'NOT SET')})")
        
        # Check has_business flag - THIS IS THE MAIN ISSUE
        if not getattr(user, 'has_business', False):
            issues.append("🔴 User has_business flag is False - THIS PREVENTS BUSINESS MENU FROM SHOWING")
            
        # Check if business_id is set
        if not getattr(user, 'business_id', None):
            issues.append("User business_id is not set")
            
    except User.DoesNotExist:
        print(f"✗ User not found!")
        return []
    
    # 2. Check UserProfile
    print(f"\n{'='*60}")
    print("Checking UserProfile...")
    try:
        profile = UserProfile.objects.get(user=user)
        print(f"✓ UserProfile exists:")
        print(f"  - Profile ID: {profile.id}")
        print(f"  - Business ID: {profile.business_id}")
        print(f"  - Tenant ID: {getattr(profile, 'tenant_id', 'NOT SET')}")
        print(f"  - Onboarding Completed: {profile.onboarding_completed}")
            
    except UserProfile.DoesNotExist:
        print(f"✗ UserProfile not found!")
        issues.append("UserProfile does not exist")
        profile = None
    
    # 3. Check Business
    print(f"\n{'='*60}")
    print("Checking Business...")
    
    # Look for Dott support business
    dott_business = Business.objects.filter(name__icontains='dott support').first()
    if dott_business:
        print(f"✓ Found 'Dott support' business:")
        print(f"  - Business ID: {dott_business.id}")
        print(f"  - Name: {dott_business.name}")
        print(f"  - Owner ID: {dott_business.owner_id}")
        
        if str(dott_business.owner_id) != str(user.id):
            issues.append(f"Business owner_id doesn't match user.id")
    else:
        print(f"✗ No 'Dott support' business found")
        issues.append("Business 'Dott support' does not exist")
    
    # 4. Check Employee record
    print(f"\n{'='*60}")
    print("Checking Employee record...")
    try:
        employee = Employee.objects.get(user=user)
        print(f"✓ Employee record exists:")
        print(f"  - Employee ID: {employee.id}")
        print(f"  - Role: {employee.role}")
        print(f"  - User Role: {employee.user_role}")
        
        if employee.user_role != 'OWNER':
            issues.append(f"Employee user_role is not OWNER (current: {employee.user_role})")
            
    except Employee.DoesNotExist:
        print(f"✗ No Employee record found")
        issues.append("Employee record does not exist")
    
    # 5. Check raw database
    print(f"\n{'='*60}")
    print("Checking raw database...")
    with connection.cursor() as cursor:
        # Check users_user table
        cursor.execute("""
            SELECT id, email, role, has_business, business_id, tenant_id
            FROM users_user
            WHERE email = %s
        """, [email])
        row = cursor.fetchone()
        if row:
            print(f"Raw users_user data:")
            print(f"  - ID: {row[0]}")
            print(f"  - Email: {row[1]}")
            print(f"  - Role: {row[2]}")
            print(f"  - Has Business: {row[3]}")
            print(f"  - Business ID: {row[4]}")
            print(f"  - Tenant ID: {row[5]}")
    
    return issues

def fix_support_user():
    """Fix the support@dottapps.com user issues"""
    
    email = 'support@dottapps.com'
    
    print(f"\n{'='*60}")
    print(f"Fixing {email}")
    print(f"{'='*60}\n")
    
    with transaction.atomic():
        # 1. Get or create user
        user = User.objects.get(email=email)
        
        # 2. Create or get business
        business, created = Business.objects.get_or_create(
            name="Dott support",
            defaults={
                'owner_id': user.id,
                'entity_type': 'SMALL_BUSINESS',
                'business_type': 'TECHNOLOGY',
                'simplified_business_type': 'SERVICE',
                'country': 'US',
                'registration_status': 'REGISTERED',
                'preferred_currency_code': 'USD',
                'preferred_currency_name': 'US Dollar'
            }
        )
        if created:
            print(f"✓ Created business 'Dott support' with ID: {business.id}")
        else:
            print(f"✓ Found existing business 'Dott support' with ID: {business.id}")
            # Update owner_id if needed
            if str(business.owner_id) != str(user.id):
                business.owner_id = user.id
                business.save()
                print(f"  - Updated owner_id to {user.id}")
        
        # 3. Update user fields
        user.role = 'OWNER'
        user.has_business = True
        user.business_id = str(business.id)
        user.tenant_id = str(business.id)  # In this system, tenant_id = business_id
        user.save()
        print(f"✓ Updated user:")
        print(f"  - Role: OWNER")
        print(f"  - Has Business: True")
        print(f"  - Business ID: {business.id}")
        print(f"  - Tenant ID: {business.id}")
        
        # 4. Create or update UserProfile
        profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'business_id': str(business.id),
                'tenant_id': str(business.id),
                'onboarding_completed': True,
                'subscription_plan': 'enterprise',
                'selected_plan': 'enterprise',
                'country': 'US',
                'industry': 'Technology'
            }
        )
        
        if not created:
            # Update existing profile
            profile.business_id = str(business.id)
            profile.tenant_id = str(business.id)
            profile.onboarding_completed = True
            profile.subscription_plan = 'enterprise'
            profile.selected_plan = 'enterprise'
            profile.save()
            print(f"✓ Updated existing UserProfile")
        else:
            print(f"✓ Created new UserProfile")
        
        # 5. Create or update Employee record
        employee, created = Employee.objects.get_or_create(
            user=user,
            defaults={
                'first_name': 'Support',
                'last_name': 'Team',
                'email': email,
                'role': 'OWNER',
                'user_role': 'OWNER',
                'business_id': str(business.id),
                'tenant_id': str(business.id),
                'is_active': True,
                'is_owner': True
            }
        )
        
        if not created:
            # Update existing employee
            employee.role = 'OWNER'
            employee.user_role = 'OWNER'
            employee.is_owner = True
            employee.business_id = str(business.id)
            employee.tenant_id = str(business.id)
            employee.save()
            print(f"✓ Updated existing Employee record")
        else:
            print(f"✓ Created new Employee record")
        
        print(f"\n✓ All fixes applied successfully!")
        
def main():
    parser = argparse.ArgumentParser(description='Diagnose and fix support@dottapps.com user')
    parser.add_argument('--fix', action='store_true', help='Apply fixes (without this flag, only diagnose)')
    args = parser.parse_args()
    
    # Run diagnosis
    issues = diagnose_support_user()
    
    if issues:
        print(f"\n{'='*60}")
        print(f"ISSUES FOUND ({len(issues)}):")
        print(f"{'='*60}")
        for i, issue in enumerate(issues, 1):
            print(f"{i}. {issue}")
        
        if args.fix:
            print(f"\n{'='*60}")
            print("APPLYING FIXES...")
            print(f"{'='*60}")
            fix_support_user()
            
            # Re-run diagnosis to verify
            print(f"\n{'='*60}")
            print("VERIFYING FIXES...")
            print(f"{'='*60}")
            remaining_issues = diagnose_support_user()
            
            if not remaining_issues:
                print(f"\n✅ ALL ISSUES RESOLVED!")
            else:
                print(f"\n⚠️  Some issues remain:")
                for issue in remaining_issues:
                    print(f"  - {issue}")
        else:
            print(f"\n💡 To fix these issues, run:")
            print(f"   python scripts/fix_support_user_complete.py --fix")
    else:
        print(f"\n✅ No issues found! User is properly configured.")

if __name__ == '__main__':
    main()