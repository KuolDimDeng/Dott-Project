#!/usr/bin/env python3
"""
Debug script to investigate employee business_id issue
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
from users.models import Business, Tenant
from onboarding.models import OnboardingProgress
from uuid import UUID

User = get_user_model()

def debug_employee_issue():
    print("\n" + "="*80)
    print("DEBUGGING EMPLOYEE BUSINESS_ID ISSUE")
    print("="*80 + "\n")
    
    # Check all employees
    print("1. ALL EMPLOYEES IN DATABASE:")
    print("-" * 50)
    employees = Employee.objects.all()
    for emp in employees:
        print(f"  Employee: {emp.first_name} {emp.last_name}")
        print(f"    ID: {emp.id}")
        print(f"    Business ID: {emp.business_id}")
        print(f"    Email: {emp.email}")
        print(f"    Employee Number: {emp.employee_number}")
        print()
    
    if not employees:
        print("  No employees found in database!")
    
    # Check all users and their business_id
    print("\n2. ALL USERS AND THEIR BUSINESS IDs:")
    print("-" * 50)
    users = User.objects.all()
    for user in users:
        print(f"  User: {user.email}")
        print(f"    User ID: {user.id}")
        print(f"    Business ID: {user.business_id}")
        print(f"    Role: {getattr(user, 'role', 'N/A')}")
        
        # Check if user has associated business
        try:
            business = Business.objects.filter(owner=user).first()
            if business:
                print(f"    Business Name: {business.name}")
                print(f"    Business Type: {business.business_type}")
        except:
            pass
        
        # Check onboarding progress
        try:
            onboarding = OnboardingProgress.objects.filter(user=user).first()
            if onboarding:
                print(f"    Onboarding Status: {onboarding.onboarding_status}")
                print(f"    Onboarding Completed: {onboarding.onboarding_completed}")
                if onboarding.business:
                    print(f"    Onboarding Business ID: {onboarding.business.id}")
        except:
            pass
        
        print()
    
    # Check for any mismatches
    print("\n3. CHECKING FOR BUSINESS_ID MISMATCHES:")
    print("-" * 50)
    
    for user in users:
        if user.business_id:
            # Check if any employees have this business_id
            matching_employees = Employee.objects.filter(business_id=user.business_id)
            print(f"  User {user.email} (business_id: {user.business_id}):")
            print(f"    Matching employees: {matching_employees.count()}")
            
            if matching_employees.count() == 0:
                print(f"    ⚠️  WARNING: User has business_id but no employees found!")
            
            # Check if user's business_id matches their Business object
            business = Business.objects.filter(owner=user).first()
            if business and str(business.id) != str(user.business_id):
                print(f"    ⚠️  WARNING: User business_id ({user.business_id}) doesn't match Business.id ({business.id})!")
    
    # Check for orphaned employees
    print("\n4. CHECKING FOR ORPHANED EMPLOYEES:")
    print("-" * 50)
    
    all_user_business_ids = set(str(u.business_id) for u in users if u.business_id)
    for emp in employees:
        if str(emp.business_id) not in all_user_business_ids:
            print(f"  ⚠️  Employee {emp.email} has business_id {emp.business_id} which doesn't match any user!")
    
    # Raw SQL check
    print("\n5. RAW SQL CHECK:")
    print("-" * 50)
    from django.db import connection
    
    with connection.cursor() as cursor:
        # Check hr_employee table
        cursor.execute("SELECT id, business_id, email, first_name, last_name FROM hr_employee")
        rows = cursor.fetchall()
        print(f"  Found {len(rows)} employees in hr_employee table")
        for row in rows[:5]:  # Show first 5
            print(f"    {row}")
        
        # Check auth_user table
        cursor.execute("SELECT id, email, business_id FROM auth_user WHERE business_id IS NOT NULL")
        rows = cursor.fetchall()
        print(f"\n  Found {len(rows)} users with business_id in auth_user table")
        for row in rows[:5]:  # Show first 5
            print(f"    {row}")

if __name__ == "__main__":
    debug_employee_issue()