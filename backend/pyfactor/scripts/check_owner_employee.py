#!/usr/bin/env python
import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User
from hr.models import Employee

# Check support@dottapps.com
try:
    user = User.objects.get(email='support@dottapps.com')
    print(f"User found: {user.email}")
    print(f"  Role: {user.role}")
    print(f"  Business ID: {user.business_id}")
    print(f"  Name: {user.first_name} {user.last_name}")
    
    # Check for employee record
    employee = Employee.objects.filter(user=user).first()
    if employee:
        print(f"\nEmployee record EXISTS:")
        print(f"  Employee ID: {employee.id}")
        print(f"  Job Title: {employee.job_title}")
        print(f"  Department: {employee.department}")
        print(f"  Status: {employee.status}")
        print(f"  Hire Date: {employee.hire_date}")
        print(f"  Hourly Rate: ${employee.hourly_rate}")
        print(f"  Salary: ${employee.salary}")
        print(f"  Can Approve Timesheets: {employee.can_approve_timesheets}")
        
        # Check if assigned to geofence
        from hr.models import EmployeeGeofence
        geofences = EmployeeGeofence.objects.filter(employee=employee, is_active=True)
        if geofences:
            print(f"\nAssigned to {geofences.count()} geofence(s):")
            for eg in geofences:
                print(f"  - {eg.geofence.name} (Required for clock in: {eg.geofence.require_for_clock_in})")
        else:
            print("\nNo geofences assigned")
    else:
        print("\nNO employee record found for this user")
        
except User.DoesNotExist:
    print("User support@dottapps.com not found")
except Exception as e:
    print(f"Error: {str(e)}")

# Check all owners
print("\n" + "="*50)
print("Checking all OWNER users:")
owners = User.objects.filter(role='OWNER')
for owner in owners:
    has_employee = Employee.objects.filter(user=owner).exists()
    print(f"  {owner.email}: {'HAS' if has_employee else 'MISSING'} employee record")