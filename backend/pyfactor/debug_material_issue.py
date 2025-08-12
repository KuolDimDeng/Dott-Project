#!/usr/bin/env python3
"""
Debug script for material creation and retrieval issue.
This script tests the material creation process to identify the root cause.
"""
import os
import sys
import django
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from inventory.models_materials import Material
from custom_auth.rls import set_tenant_context, get_current_tenant_id, clear_tenant_context
from custom_auth.models import Tenant

User = get_user_model()

def debug_material_issue():
    """Debug the material creation and retrieval issue"""
    print("🔍 DEBUG: Material Creation and Retrieval Issue")
    print("=" * 60)
    
    # Step 1: Find a test user with business_id
    test_user = User.objects.filter(business_id__isnull=False).first()
    if not test_user:
        print("❌ No user with business_id found. Creating test scenario impossible.")
        return
    
    print(f"✅ Found test user: {test_user.email}")
    print(f"   User ID: {test_user.id}")
    print(f"   Business ID: {test_user.business_id}")
    
    # Step 2: Set tenant context manually
    tenant_id = str(test_user.business_id)
    print(f"\n🎯 Setting tenant context to: {tenant_id}")
    
    success = set_tenant_context(tenant_id)
    if success:
        current_tenant = get_current_tenant_id()
        print(f"✅ Tenant context set successfully: {current_tenant}")
    else:
        print("❌ Failed to set tenant context")
        return
    
    # Step 3: Check existing materials for this tenant
    print(f"\n📊 Checking existing materials for tenant {tenant_id}:")
    
    # Using all_objects (bypasses tenant filtering)
    all_materials = Material.all_objects.filter(tenant_id=tenant_id)
    print(f"   Materials found with all_objects: {all_materials.count()}")
    for mat in all_materials[:3]:
        print(f"     - {mat.name} (SKU: {mat.sku}, ID: {mat.id})")
    
    # Using tenant-aware objects
    tenant_materials = Material.objects.all()
    print(f"   Materials found with tenant objects: {tenant_materials.count()}")
    for mat in tenant_materials[:3]:
        print(f"     - {mat.name} (SKU: {mat.sku}, ID: {mat.id})")
    
    # Step 4: Create a test material
    print(f"\n🏗️ Creating test material...")
    
    test_material_data = {
        'name': 'Debug Test Screwdriver',
        'sku': 'DBG-TEST-001',
        'description': 'Test material for debugging',
        'material_type': 'tool',
        'unit': 'piece',
        'quantity_in_stock': 10,
        'unit_cost': 15.99,
        'tenant_id': tenant_id  # Explicit tenant assignment
    }
    
    try:
        # Create material directly using model
        test_material = Material(**test_material_data)
        test_material.save()
        
        print(f"✅ Test material created successfully!")
        print(f"   ID: {test_material.id}")
        print(f"   Name: {test_material.name}")
        print(f"   SKU: {test_material.sku}")
        print(f"   Tenant ID: {test_material.tenant_id}")
        
    except Exception as e:
        print(f"❌ Error creating test material: {e}")
        return
    
    # Step 5: Try to retrieve the material immediately
    print(f"\n🔍 Retrieving test material immediately after creation...")
    
    # Try with all_objects
    try:
        retrieved_all = Material.all_objects.get(id=test_material.id)
        print(f"✅ Found with all_objects: {retrieved_all.name} (tenant: {retrieved_all.tenant_id})")
    except Material.DoesNotExist:
        print("❌ NOT found with all_objects")
    except Exception as e:
        print(f"❌ Error with all_objects: {e}")
    
    # Try with tenant objects
    try:
        retrieved_tenant = Material.objects.get(id=test_material.id)
        print(f"✅ Found with tenant objects: {retrieved_tenant.name}")
    except Material.DoesNotExist:
        print("❌ NOT found with tenant objects")
    except Exception as e:
        print(f"❌ Error with tenant objects: {e}")
    
    # Step 6: List all materials again to see if the new one appears
    print(f"\n📋 Listing all materials after creation:")
    
    all_materials_after = Material.all_objects.filter(tenant_id=tenant_id)
    print(f"   Total materials with all_objects: {all_materials_after.count()}")
    for mat in all_materials_after:
        print(f"     - {mat.name} (SKU: {mat.sku}, ID: {mat.id})")
    
    tenant_materials_after = Material.objects.all()
    print(f"   Total materials with tenant objects: {tenant_materials_after.count()}")
    for mat in tenant_materials_after:
        print(f"     - {mat.name} (SKU: {mat.sku}, ID: {mat.id})")
    
    # Step 7: Check RLS context is still valid
    print(f"\n🔧 Final RLS context check:")
    final_tenant = get_current_tenant_id()
    print(f"   Current tenant context: {final_tenant}")
    
    # Clean up - delete test material
    print(f"\n🗑️ Cleaning up test material...")
    try:
        test_material.delete()
        print("✅ Test material deleted")
    except Exception as e:
        print(f"❌ Error deleting test material: {e}")
    
    # Clear tenant context
    clear_tenant_context()
    print("✅ Tenant context cleared")
    
    print("\n" + "=" * 60)
    print("🏁 DEBUG COMPLETE")

if __name__ == "__main__":
    debug_material_issue()