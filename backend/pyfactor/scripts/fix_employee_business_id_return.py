#!/usr/bin/env python3
"""
Fix script to ensure employee creation returns the correct data and business_id is properly handled
"""
import os
import sys
import django

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from hr.models import Employee
from users.models import Business
from onboarding.models import OnboardingProgress

User = get_user_model()

def fix_employee_business_id():
    print("\n" + "="*80)
    print("FIXING EMPLOYEE BUSINESS_ID ISSUE")
    print("="*80 + "\n")
    
    # Step 1: Check all users and ensure they have correct business_id
    print("1. CHECKING USERS AND THEIR BUSINESS_ID:")
    print("-" * 50)
    
    users_fixed = 0
    users = User.objects.all()
    
    for user in users:
        if not user.business_id:
            # Try to find business_id from OnboardingProgress or Business model
            onboarding = OnboardingProgress.objects.filter(user=user).first()
            business = Business.objects.filter(owner=user).first()
            
            if onboarding and onboarding.business:
                user.business_id = onboarding.business.id
                user.save()
                users_fixed += 1
                print(f"  ✅ Fixed user {user.email} - set business_id to {user.business_id}")
            elif business:
                user.business_id = business.id
                user.save()
                users_fixed += 1
                print(f"  ✅ Fixed user {user.email} - set business_id to {user.business_id}")
            else:
                print(f"  ⚠️  User {user.email} has no business_id and no business found")
        else:
            print(f"  ✓ User {user.email} already has business_id: {user.business_id}")
    
    print(f"\nFixed {users_fixed} users")
    
    # Step 2: Check employees and ensure their business_id matches their user's business_id
    print("\n2. CHECKING EMPLOYEES AND THEIR BUSINESS_ID:")
    print("-" * 50)
    
    employees_fixed = 0
    employees = Employee.objects.all()
    
    for emp in employees:
        if emp.user and emp.user.business_id:
            if str(emp.business_id) != str(emp.user.business_id):
                print(f"  ⚠️  Employee {emp.email} business_id mismatch:")
                print(f"     Employee business_id: {emp.business_id}")
                print(f"     User business_id: {emp.user.business_id}")
                emp.business_id = emp.user.business_id
                emp.save()
                employees_fixed += 1
                print(f"  ✅ Fixed employee {emp.email} - set business_id to {emp.business_id}")
        elif not emp.user:
            # Employee without user - check if we can find a matching user by email
            user = User.objects.filter(email=emp.email).first()
            if user and user.business_id:
                if str(emp.business_id) != str(user.business_id):
                    print(f"  ⚠️  Employee {emp.email} (no user link) business_id mismatch")
                    emp.business_id = user.business_id
                    emp.user = user
                    emp.save()
                    employees_fixed += 1
                    print(f"  ✅ Fixed employee {emp.email} - linked to user and set business_id")
    
    print(f"\nFixed {employees_fixed} employees")
    
    # Step 3: Verify the fix
    print("\n3. VERIFICATION:")
    print("-" * 50)
    
    for user in User.objects.filter(business_id__isnull=False):
        employee_count = Employee.objects.filter(business_id=user.business_id).count()
        print(f"  User {user.email} (business_id: {user.business_id}): {employee_count} employees")
    
    print("\n✅ Fix completed!")

if __name__ == "__main__":
    fix_employee_business_id()