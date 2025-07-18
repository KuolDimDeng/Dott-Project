#!/usr/bin/env python
"""
Script to check employee-user linking for support@dottapps.com
"""
import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth.models import User
from hr.models import Employee


def check_employee_user_link():
    """Check the employee-user relationship for support@dottapps.com"""
    
    print("=== EMPLOYEE-USER LINK CHECK ===")
    
    # Find the user
    try:
        user = User.objects.get(email='support@dottapps.com')
        print(f"✅ Found user: {user.id} - {user.email}")
        print(f"   - Username: {user.username}")
        print(f"   - First name: {user.first_name}")
        print(f"   - Last name: {user.last_name}")
        
        # Check for tenant_id attribute
        if hasattr(user, 'tenant_id'):
            print(f"   - tenant_id: {user.tenant_id}")
        else:
            print("   - ❌ No tenant_id attribute")
            
        if hasattr(user, 'business_id'):
            print(f"   - business_id: {user.business_id}")
    except User.DoesNotExist:
        print("❌ User support@dottapps.com not found!")
        return
    
    print("\n--- Checking Employee Records ---")
    
    # Check by user_id
    emp_by_user = Employee.objects.filter(user_id=user.id).first()
    if emp_by_user:
        print(f"✅ Found employee by user_id: {emp_by_user.id}")
        print(f"   - Name: {emp_by_user.first_name} {emp_by_user.last_name}")
        print(f"   - Email: {emp_by_user.email}")
        print(f"   - Business ID: {emp_by_user.business_id}")
    else:
        print("❌ No employee found by user_id")
    
    # Check by email
    emps_by_email = Employee.objects.filter(email='support@dottapps.com')
    print(f"\n🔍 Employees with email support@dottapps.com: {emps_by_email.count()}")
    
    for emp in emps_by_email:
        print(f"\n   Employee {emp.id}:")
        print(f"   - Name: {emp.first_name} {emp.last_name}")
        print(f"   - User ID: {emp.user_id}")
        print(f"   - Business ID: {emp.business_id}")
        print(f"   - Department: {emp.department}")
        print(f"   - Position: {emp.position}")
        print(f"   - Status: {emp.status}")
        
        # Check if this employee should be linked to the user
        if not emp.user_id:
            print(f"   - ⚠️  This employee is NOT linked to any user")
            print(f"   - 💡 Should be linked to user {user.id}")
        elif emp.user_id == user.id:
            print(f"   - ✅ Correctly linked to user {user.id}")
        else:
            print(f"   - ❌ Linked to different user: {emp.user_id}")
    
    # Show all employees in the same business
    if hasattr(user, 'tenant_id') and user.tenant_id:
        print(f"\n--- All Employees in Business {user.tenant_id} ---")
        business_employees = Employee.objects.filter(business_id=user.tenant_id)[:10]
        for emp in business_employees:
            print(f"   - {emp.id}: {emp.email} ({emp.first_name} {emp.last_name})")


if __name__ == "__main__":
    check_employee_user_link()