#!/usr/bin/env python
"""
Diagnose tenant ID issues
"""
import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import BusinessSettings
from django.db import connection

User = get_user_model()

def diagnose():
    print("=== Diagnosing Tenant ID Issues ===\n")
    
    # Check users
    users_with_tenants = User.objects.exclude(tenant_id__isnull=True).exclude(tenant_id='')
    
    print(f"Users with tenant_id: {users_with_tenants.count()}\n")
    
    for user in users_with_tenants[:5]:  # Check first 5
        print(f"User: {user.email}")
        print(f"  tenant_id: {user.tenant_id}")
        print(f"  tenant_id type: {type(user.tenant_id)}")
        print(f"  tenant_id value: '{user.tenant_id}'")
        
        # Check if tenant exists
        if hasattr(user, 'tenant'):
            print(f"  tenant object: {user.tenant}")
            if user.tenant:
                print(f"  tenant.id: {user.tenant.id}")
                print(f"  tenant.owner_id: {user.tenant.owner_id}")
        print()
    
    # Check existing BusinessSettings
    print("\n=== Existing BusinessSettings ===")
    bs_count = BusinessSettings.objects.count()
    print(f"Total BusinessSettings: {bs_count}\n")
    
    if bs_count > 0:
        for bs in BusinessSettings.objects.all()[:5]:
            print(f"BusinessSettings:")
            print(f"  tenant_id: {bs.tenant_id}")
            print(f"  business_name: {bs.business_name}")
            print()
    
    # Check raw database to see what's in tenant_id field
    print("\n=== Raw Database Check ===")
    with connection.cursor() as cursor:
        cursor.execute("SELECT id, email, tenant_id FROM custom_auth_user WHERE tenant_id IS NOT NULL LIMIT 5")
        rows = cursor.fetchall()
        print("Raw user data (id, email, tenant_id):")
        for row in rows:
            print(f"  {row}")
    
    # Check what happens when we try to create BusinessSettings
    print("\n=== Testing BusinessSettings Creation ===")
    test_user = users_with_tenants.first()
    if test_user:
        print(f"Testing with user: {test_user.email}")
        print(f"Tenant ID: {test_user.tenant_id} (type: {type(test_user.tenant_id)})")
        
        # Try to create BusinessSettings
        try:
            # Check if already exists
            existing = BusinessSettings.objects.filter(tenant_id=test_user.tenant_id).first()
            if existing:
                print(f"BusinessSettings already exists for this tenant")
            else:
                # Try to create
                bs = BusinessSettings(
                    tenant_id=test_user.tenant_id,
                    business_name=f"Test for {test_user.email}",
                    business_type='RETAIL',
                    country='US',
                    preferred_currency_code='USD',
                    preferred_currency_symbol='$'
                )
                print(f"Created BusinessSettings object (not saved)")
                print(f"  tenant_id on object: {bs.tenant_id}")
                print(f"  Will now try to save...")
                bs.save()
                print("✅ Successfully saved!")
                # Clean up
                bs.delete()
                print("  (Deleted test record)")
        except Exception as e:
            print(f"❌ Error creating BusinessSettings: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    diagnose()