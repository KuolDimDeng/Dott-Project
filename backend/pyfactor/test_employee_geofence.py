#!/usr/bin/env python
"""Test EmployeeGeofence model and API endpoint"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from hr.models import EmployeeGeofence, Employee, Geofence
from users.models import User
from django.db import connection

def test_employee_geofence():
    print("Testing EmployeeGeofence model...")
    
    # Check if table exists
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'hr_employeegeofence'
        """)
        result = cursor.fetchone()
        if result:
            print("✅ Table hr_employeegeofence exists")
        else:
            print("❌ Table hr_employeegeofence does NOT exist")
            print("Run migrations: python manage.py migrate hr")
            return
    
    # Try to query the table
    try:
        count = EmployeeGeofence.objects.count()
        print(f"✅ EmployeeGeofence query successful. Count: {count}")
    except Exception as e:
        print(f"❌ Error querying EmployeeGeofence: {e}")
        return
    
    # Check for test user
    try:
        user = User.objects.get(email='support@dottapps.com')
        print(f"✅ Found user: {user.email} (business_id: {user.business_id})")
        
        # Check for geofences
        geofences = Geofence.objects.filter(business_id=user.business_id)
        print(f"✅ Found {geofences.count()} geofences")
        
        # Check for employees
        employees = Employee.objects.filter(business_id=user.business_id)
        print(f"✅ Found {employees.count()} employees")
        
        # Check for assignments
        assignments = EmployeeGeofence.objects.filter(business_id=user.business_id)
        print(f"✅ Found {assignments.count()} employee-geofence assignments")
        
        # List assignments
        for assignment in assignments:
            print(f"  - Employee: {assignment.employee.first_name} {assignment.employee.last_name} -> Geofence: {assignment.geofence.name}")
            
    except User.DoesNotExist:
        print("❌ User support@dottapps.com not found")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_employee_geofence()