#!/usr/bin/env python
"""
Check Monica Deng's business_id and tenant configuration
"""
import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from hr.models import Employee
from custom_auth.models import Tenant

User = get_user_model()

def check_monica():
    """Check Monica's user and business configuration"""
    print("\n" + "="*80)
    print("CHECKING MONICA DENG'S CONFIGURATION")
    print("="*80)
    
    # Find Monica's user
    try:
        monica = User.objects.get(email='jubacargovillage@outlook.com')
        print(f"\n✅ Found user: {monica.email}")
        print(f"   - ID: {monica.id}")
        print(f"   - Name: {monica.first_name} {monica.last_name}")
        print(f"   - Business ID: {monica.business_id}")
        print(f"   - Tenant ID: {getattr(monica, 'tenant_id', 'NOT SET')}")
        print(f"   - Created: {getattr(monica, 'created_at', 'N/A')}")
        
        # Check if business_id is None
        if not monica.business_id:
            print("\n🚨 CRITICAL: Monica has NO business_id!")
            print("   This means she will see ALL employees from ALL businesses!")
            
            # Try to find her tenant
            try:
                tenant = Tenant.objects.get(owner=monica)
                print(f"\n✅ Found Monica's tenant: {tenant.name}")
                print(f"   - Tenant ID: {tenant.id}")
                print(f"   - Country: {tenant.country}")
                
                # Fix Monica's business_id
                monica.business_id = tenant.id
                monica.save()
                print(f"\n✅ FIXED: Set Monica's business_id to {tenant.id}")
            except Tenant.DoesNotExist:
                print("\n❌ Monica has no tenant record!")
                
                # Create a tenant for Monica
                tenant = Tenant.objects.create(
                    owner=monica,
                    name="Juba Cargo Village",
                    country="SS",  # South Sudan
                    business_name="Juba Cargo Village"
                )
                print(f"\n✅ Created tenant for Monica: {tenant.id}")
                
                monica.business_id = tenant.id
                monica.save()
                print(f"✅ Set Monica's business_id to {tenant.id}")
        
        # Check employees for Monica's business
        if monica.business_id:
            employees = Employee.objects.filter(business_id=monica.business_id)
            print(f"\n📊 Employees in Monica's business: {employees.count()}")
            
            # Check all employees (for comparison)
            all_employees = Employee.objects.all()
            print(f"📊 Total employees in database: {all_employees.count()}")
            
            # Check if Monica has an employee record
            try:
                monica_employee = Employee.objects.get(user=monica)
                print(f"\n✅ Monica has an employee record:")
                print(f"   - Employee ID: {monica_employee.id}")
                print(f"   - Business ID: {monica_employee.business_id}")
                print(f"   - Tenant ID: {monica_employee.tenant_id}")
            except Employee.DoesNotExist:
                print("\n❌ Monica does not have an employee record")
                
    except User.DoesNotExist:
        print("\n❌ User jubacargovillage@outlook.com not found!")
    
    print("\n" + "="*80)
    print("CHECK COMPLETE")
    print("="*80)

if __name__ == '__main__':
    check_monica()