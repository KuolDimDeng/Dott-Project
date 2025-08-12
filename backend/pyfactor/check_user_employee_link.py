#!/usr/bin/env python
"""Check if user has employee record and link if needed"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from users.models import User
from hr.models import Employee
from django.db import transaction as db_transaction

def check_and_link_employee():
    print("\n=== Checking User-Employee Link ===")
    
    try:
        # Get the user
        user = User.objects.get(email='support@dottapps.com')
        print(f"✅ Found user: {user.email}")
        print(f"   - User ID: {user.id}")
        print(f"   - Business ID: {user.business_id}")
        print(f"   - Tenant ID: {user.tenant_id}")
        print(f"   - Role: {user.role}")
        
        # Check if user has employee linked
        if hasattr(user, 'employee') and user.employee:
            print(f"\n✅ User already has employee linked!")
            print(f"   - Employee ID: {user.employee.id}")
            print(f"   - Employee Name: {user.employee.first_name} {user.employee.last_name}")
            print(f"   - Employee Email: {user.employee.email}")
            return user.employee
        else:
            print(f"\n⚠️  User does not have employee linked")
            
        # Look for employee record with same email
        employees = Employee.objects.filter(
            email=user.email,
            business_id=user.business_id
        )
        
        print(f"\n🔍 Found {employees.count()} employee records with email {user.email}")
        
        if employees.exists():
            employee = employees.first()
            print(f"\n✅ Found existing employee record:")
            print(f"   - Employee ID: {employee.id}")
            print(f"   - Employee Name: {employee.first_name} {employee.last_name}")
            print(f"   - Employee Email: {employee.email}")
            print(f"   - User Link: {employee.user_id}")
            
            if not employee.user_id:
                # Link the employee to the user
                with db_transaction.atomic():
                    employee.user = user
                    employee.save()
                    print(f"\n✅ Successfully linked employee to user!")
                    return employee
            elif employee.user_id != user.id:
                print(f"\n❌ Employee is linked to a different user (ID: {employee.user_id})")
            else:
                print(f"\n✅ Employee is already correctly linked to user")
                return employee
        else:
            print(f"\n❌ No employee record found for {user.email}")
            print(f"\n💡 Creating employee record for business owner...")
            
            # Create employee record
            with db_transaction.atomic():
                employee = Employee.objects.create(
                    user=user,
                    business_id=user.business_id,
                    first_name=user.first_name or 'Business',
                    last_name=user.last_name or 'Owner',
                    email=user.email,
                    role='ADMIN',  # Business owners should have ADMIN role in employee table
                    status='ACTIVE',
                    employee_type='FULL_TIME'
                )
                print(f"\n✅ Created employee record:")
                print(f"   - Employee ID: {employee.id}")
                print(f"   - Linked to User ID: {user.id}")
                return employee
                
    except User.DoesNotExist:
        print(f"\n❌ User support@dottapps.com not found!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_and_link_employee()