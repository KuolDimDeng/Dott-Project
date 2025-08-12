#!/usr/bin/env python
"""Test geofence employee assignment functionality"""

import os
import sys
import django
import json

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from hr.models import EmployeeGeofence, Employee, Geofence
from users.models import User
from django.utils import timezone

def test_assign_employee():
    print("\n=== Testing Geofence Employee Assignment ===")
    
    try:
        # Get the user
        user = User.objects.get(email='support@dottapps.com')
        business_id = user.business_id
        print(f"✅ User: {user.email}")
        print(f"✅ Business ID: {business_id}")
        
        # Get the Main geofence
        geofence = Geofence.objects.filter(
            business_id=business_id,
            name='Main'
        ).first()
        
        if not geofence:
            print("❌ 'Main' geofence not found")
            return
            
        print(f"\n📍 Found geofence: {geofence.name} (ID: {geofence.id})")
        
        # Get first employee
        employee = Employee.objects.filter(business_id=business_id).first()
        
        if not employee:
            print("❌ No employees found")
            return
            
        print(f"👤 Found employee: {employee.first_name} {employee.last_name} (ID: {employee.id})")
        
        # Check current assignments
        print("\n🔍 Current assignments:")
        current = EmployeeGeofence.objects.filter(
            geofence=geofence,
            business_id=business_id
        )
        print(f"   Count: {current.count()}")
        
        # Try to assign the employee
        print(f"\n🚀 Assigning employee to geofence...")
        
        # First, clear existing assignments
        current.delete()
        
        # Create new assignment
        assignment = EmployeeGeofence.objects.create(
            employee=employee,
            geofence=geofence,
            business_id=business_id,
            assigned_by=user
        )
        
        print(f"✅ Assignment created: {assignment.id}")
        print(f"   Employee: {assignment.employee.first_name} {assignment.employee.last_name}")
        print(f"   Geofence: {assignment.geofence.name}")
        print(f"   Assigned at: {assignment.assigned_at}")
        
        # Verify it was saved
        verify = EmployeeGeofence.objects.filter(
            id=assignment.id
        ).first()
        
        if verify:
            print("\n✅ Assignment successfully saved and verified in database!")
        else:
            print("\n❌ Assignment not found in database!")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_assign_employee()