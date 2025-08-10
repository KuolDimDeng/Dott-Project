#!/usr/bin/env python
"""
Fix Monica Deng's business_id to match her tenant_id
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

def fix_monica():
    """Fix Monica's business_id"""
    print("\n" + "="*80)
    print("FIXING MONICA DENG'S BUSINESS_ID")
    print("="*80)
    
    try:
        # Find Monica's user
        monica = User.objects.get(email='jubacargovillage@outlook.com')
        print(f"\n✅ Found user: {monica.email}")
        print(f"   - Current Business ID: {monica.business_id}")
        print(f"   - Tenant ID: {monica.tenant_id}")
        
        # Monica has a tenant_id, use that as business_id
        if monica.tenant_id and not monica.business_id:
            monica.business_id = monica.tenant_id
            monica.save()
            print(f"\n✅ FIXED: Set Monica's business_id to {monica.tenant_id}")
            
            # Also check/create her tenant record
            try:
                tenant = Tenant.objects.get(id=monica.tenant_id)
                print(f"✅ Found existing tenant: {tenant.name}")
            except Tenant.DoesNotExist:
                # Create tenant record
                tenant = Tenant.objects.create(
                    id=monica.tenant_id,
                    owner_id=monica.id,
                    name="Juba Cargo Village",
                    schema_name=f"tenant_{str(monica.tenant_id).replace('-', '_')}"
                )
                print(f"✅ Created tenant record: {tenant.name}")
            
            # Update or create Employee record
            employee, created = Employee.objects.get_or_create(
                user=monica,
                defaults={
                    'email': monica.email,
                    'first_name': monica.first_name,
                    'last_name': monica.last_name,
                    'business_id': monica.business_id,
                    'tenant_id': monica.tenant_id,
                    'employee_number': f"EMP{monica.id:04d}"
                }
            )
            
            if created:
                print(f"✅ Created employee record for Monica")
            else:
                # Update existing employee
                employee.business_id = monica.business_id
                employee.tenant_id = monica.tenant_id
                employee.save()
                print(f"✅ Updated employee record with correct business_id")
            
            print(f"\n📊 Final configuration:")
            print(f"   - User Business ID: {monica.business_id}")
            print(f"   - User Tenant ID: {monica.tenant_id}")
            print(f"   - Employee Business ID: {employee.business_id}")
            print(f"   - Employee Tenant ID: {employee.tenant_id}")
            
            # Check how many employees Monica should see now
            monica_employees = Employee.objects.filter(business_id=monica.business_id)
            all_employees = Employee.objects.all()
            
            print(f"\n📊 Employee counts:")
            print(f"   - Employees in Monica's business: {monica_employees.count()}")
            print(f"   - Total employees in database: {all_employees.count()}")
            
            if monica_employees.count() == 1:
                print(f"\n✅ SUCCESS: Monica now sees only her own employee record!")
            elif monica_employees.count() == 0:
                print(f"\n⚠️ WARNING: Monica sees no employees (might need to create some)")
            else:
                print(f"\n⚠️ Monica sees {monica_employees.count()} employees")
                for emp in monica_employees[:5]:
                    print(f"   - {emp.email} (Business: {emp.business_id})")
        
    except User.DoesNotExist:
        print("\n❌ User jubacargovillage@outlook.com not found!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
    
    print("\n" + "="*80)
    print("FIX COMPLETE")
    print("="*80)

if __name__ == '__main__':
    fix_monica()