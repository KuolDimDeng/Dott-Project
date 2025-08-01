#!/usr/bin/env python
"""
Script to check employee record linking for support@dottapps.com
"""
import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from hr.models import Employee
from users.models import UserProfile

User = get_user_model()

def check_employee_link():
    email = 'support@dottapps.com'
    
    print(f"\n🔍 Checking employee record for: {email}")
    print("=" * 60)
    
    # Check if user exists
    try:
        user = User.objects.get(email=email)
        print(f"✅ User found:")
        print(f"   - ID: {user.id}")
        print(f"   - Email: {user.email}")
        print(f"   - Name: {user.name}")
        print(f"   - Business ID: {getattr(user, 'business_id', 'Not set')}")
        print(f"   - Tenant ID: {getattr(user, 'tenant_id', 'Not set')}")
    except User.DoesNotExist:
        print(f"❌ User not found: {email}")
        return
    
    # Check UserProfile
    try:
        profile = UserProfile.objects.get(user=user)
        print(f"\n✅ UserProfile found:")
        print(f"   - Business ID: {profile.business_id}")
        print(f"   - Role: {getattr(profile, 'role', 'Not set')}")
        print(f"   - User Role: {getattr(profile, 'user_role', 'Not set')}")
    except UserProfile.DoesNotExist:
        print(f"\n❌ UserProfile not found for user")
    
    # Check if employee record exists
    try:
        # Try direct query
        employee = Employee.objects.get(user=user)
        print(f"\n✅ Employee record found (direct query):")
        print(f"   - ID: {employee.id}")
        print(f"   - Employee Number: {employee.employee_number}")
        print(f"   - Business ID: {employee.business_id}")
        print(f"   - First Name: {employee.first_name}")
        print(f"   - Last Name: {employee.last_name}")
        print(f"   - Email: {employee.email}")
        print(f"   - Is Active: {getattr(employee, 'is_active', getattr(employee, 'active', 'Not set'))}")
        print(f"   - Department: {employee.department}")
        print(f"   - Position: {employee.position}")
        print(f"   - Supervisor: {employee.supervisor}")
        print(f"   - Hourly Rate: {getattr(employee, 'hourly_rate', 'Not set')}")
        print(f"   - Pay Rate: {getattr(employee, 'pay_rate', 'Not set')}")
    except Employee.DoesNotExist:
        print(f"\n❌ Employee record NOT found with user link")
        
        # Check if employee exists by email
        try:
            employees_by_email = Employee.objects.filter(email=email)
            if employees_by_email.exists():
                print(f"\n⚠️  Found {employees_by_email.count()} employee(s) with email {email}:")
                for emp in employees_by_email:
                    print(f"   - ID: {emp.id}")
                    print(f"   - Employee Number: {emp.employee_number}")
                    print(f"   - Business ID: {emp.business_id}")
                    print(f"   - User Link: {emp.user_id if emp.user_id else 'NOT LINKED'}")
                    print(f"   - Is Active: {emp.is_active}")
                    print(f"   ---")
                    
                    # Try to fix the link if not set
                    if not emp.user_id:
                        print(f"   🔧 Attempting to link employee {emp.employee_number} to user...")
                        emp.user = user
                        emp.save()
                        print(f"   ✅ Employee linked to user successfully!")
            else:
                print(f"\n❌ No employee records found with email {email}")
        except Exception as e:
            print(f"\n❌ Error checking employees by email: {e}")
    
    # Check using related name
    try:
        employee_profile = user.employee_profile
        print(f"\n✅ Employee found via user.employee_profile:")
        print(f"   - ID: {employee_profile.id}")
        print(f"   - Employee Number: {employee_profile.employee_number}")
    except Exception as e:
        print(f"\n❌ No employee_profile relation: {e}")
    
    # List all employees in the business
    if hasattr(user, 'business_id') or (hasattr(user, 'tenant_id')):
        business_id = getattr(user, 'business_id', None) or getattr(user, 'tenant_id', None)
        if business_id:
            print(f"\n📋 All employees in business {business_id}:")
            employees = Employee.objects.filter(business_id=business_id)
            for emp in employees[:5]:  # Show first 5
                print(f"   - {emp.employee_number}: {emp.first_name} {emp.last_name} ({emp.email}) - User: {emp.user_id or 'None'}")

if __name__ == "__main__":
    check_employee_link()