#!/usr/bin/env python
"""Check employee-geofence assignments in the database"""

import os
import sys
import django
from datetime import datetime, timedelta
from django.utils import timezone

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from hr.models import EmployeeGeofence, Employee, Geofence
from users.models import User

def check_assignments():
    print("\n=== Checking Employee-Geofence Assignments ===")
    print(f"Current time: {timezone.now()}")
    
    try:
        # Get the user
        user = User.objects.get(email='support@dottapps.com')
        business_id = user.business_id
        print(f"\n✅ User: {user.email}")
        print(f"✅ Business ID: {business_id}")
        
        # Get the Main geofence
        main_geofence = Geofence.objects.filter(
            business_id=business_id,
            name='Main'
        ).first()
        
        if main_geofence:
            print(f"\n📍 Geofence 'Main' found:")
            print(f"   ID: {main_geofence.id}")
            print(f"   Created: {main_geofence.created_at}")
            
            # Check ALL assignments for this geofence
            all_assignments = EmployeeGeofence.objects.filter(
                geofence=main_geofence
            )
            print(f"\n📊 Total assignments for 'Main' geofence: {all_assignments.count()}")
            
            # Check recent assignments (last hour)
            one_hour_ago = timezone.now() - timedelta(hours=1)
            recent_assignments = EmployeeGeofence.objects.filter(
                geofence=main_geofence,
                assigned_at__gte=one_hour_ago
            )
            print(f"📊 Assignments in last hour: {recent_assignments.count()}")
            
            # List all assignments
            if all_assignments.exists():
                print("\n✅ Current assignments:")
                for assignment in all_assignments:
                    print(f"   - Employee: {assignment.employee.first_name} {assignment.employee.last_name}")
                    print(f"     ID: {assignment.employee.id}")
                    print(f"     Assigned at: {assignment.assigned_at}")
                    print(f"     Assigned by: {assignment.assigned_by.email if assignment.assigned_by else 'Unknown'}")
                    print()
            else:
                print("\n❌ No employees assigned to this geofence")
        else:
            print("\n❌ Geofence 'Main' not found")
        
        # Check ALL assignments for this business
        print("\n=== All Employee-Geofence Assignments for Business ===")
        all_business_assignments = EmployeeGeofence.objects.filter(
            business_id=business_id
        ).select_related('employee', 'geofence', 'assigned_by')
        
        print(f"Total assignments: {all_business_assignments.count()}")
        
        if all_business_assignments.exists():
            for assignment in all_business_assignments:
                print(f"\n- Geofence: {assignment.geofence.name}")
                print(f"  Employee: {assignment.employee.first_name} {assignment.employee.last_name}")
                print(f"  Assigned at: {assignment.assigned_at}")
                
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_assignments()