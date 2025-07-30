#!/usr/bin/env python3
"""
Debug script to test material creation and retrieval issue.
This simulates the material creation process to identify why materials don't persist.
"""

import os
import sys
import django
import logging
import uuid

# Add the project root to Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Setup Django
django.setup()

from django.contrib.auth import get_user_model
from inventory.models_materials import Material
from custom_auth.rls import set_tenant_context, get_current_tenant_id, clear_tenant_context
from custom_auth.models import User, Tenant

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_material_creation():
    """Test the material creation process with debugging"""
    
    logger.info("🧪 === MATERIAL CREATION DEBUG TEST START ===")
    
    # Step 1: Find a test user with business
    try:
        # Look for any user with a business_id
        test_user = User.objects.filter(business_id__isnull=False).first()
        
        if not test_user:
            logger.error("❌ No test user found with business_id")
            return False
            
        logger.info(f"✅ Found test user: {test_user.email} (ID: {test_user.id})")
        logger.info(f"✅ User business_id: {test_user.business_id}")
        
    except Exception as e:
        logger.error(f"❌ Error finding test user: {e}")
        return False
    
    # Step 2: Set tenant context
    try:
        tenant_id = str(test_user.business_id)
        logger.info(f"🏢 Setting tenant context to: {tenant_id}")
        
        success = set_tenant_context(tenant_id)
        if not success:
            logger.error("❌ Failed to set tenant context")
            return False
            
        # Verify tenant context
        try:
            current_tenant = get_current_tenant_id()
            logger.info(f"🏢 Current tenant after setting: {current_tenant}")
            
            if current_tenant and str(current_tenant) != tenant_id:
                logger.error(f"❌ Tenant context mismatch! Expected: {tenant_id}, Got: {current_tenant}")
                return False
        except Exception as tenant_error:
            logger.error(f"❌ Error getting current tenant: {tenant_error}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            # Continue anyway for debugging
            
    except Exception as e:
        logger.error(f"❌ Error setting tenant context: {e}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return False
    
    # Step 3: Create test material
    try:
        logger.info("📦 Creating test material...")
        
        # Create material data
        material_data = {
            'name': 'Debug Test Screwdriver',
            'sku': f'DEBUG-{uuid.uuid4().hex[:8].upper()}',
            'description': 'Test material for debugging creation issue',
            'material_type': 'tool',
            'quantity_in_stock': 10,
            'unit': 'unit',
            'unit_cost': 25.99,
            'reorder_level': 5,
            'is_active': True,
        }
        
        logger.info(f"📦 Material data: {material_data}")
        
        # Create the material
        material = Material(**material_data)
        logger.info(f"📦 Material instance created: {material}")
        logger.info(f"📦 Material tenant_id before save: {material.tenant_id}")
        
        # Save the material
        material.save()
        
        logger.info(f"✅ Material saved with ID: {material.id}")
        logger.info(f"✅ Material tenant_id after save: {material.tenant_id}")
        
    except Exception as e:
        logger.error(f"❌ Error creating material: {e}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return False
    
    # Step 4: Test retrieval with all_objects
    try:
        logger.info("🔍 Testing retrieval with all_objects...")
        
        # Find using all_objects (bypasses tenant filtering)
        material_all = Material.all_objects.filter(id=material.id).first()
        
        if material_all:
            logger.info(f"✅ Material found in all_objects: {material_all.name}")
            logger.info(f"✅ Material tenant_id: {material_all.tenant_id}")
        else:
            logger.error("❌ Material NOT found in all_objects!")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error retrieving with all_objects: {e}")
        return False
    
    # Step 5: Test retrieval with tenant-aware objects
    try:
        logger.info("🔍 Testing retrieval with tenant-aware objects...")
        
        # Find using tenant-aware objects
        material_tenant = Material.objects.filter(id=material.id).first()
        
        if material_tenant:
            logger.info(f"✅ Material found in tenant objects: {material_tenant.name}")
        else:
            logger.error("❌ Material NOT found in tenant objects!")
            logger.error(f"❌ This indicates the tenant filtering issue!")
            
            # Debug: Check what the tenant manager is filtering by
            from custom_auth.rls import get_current_tenant_id
            current_tenant_for_manager = get_current_tenant_id()
            logger.error(f"❌ Current tenant for manager: {current_tenant_for_manager}")
            logger.error(f"❌ Material tenant_id: {material_all.tenant_id}")
            logger.error(f"❌ Tenant match: {str(current_tenant_for_manager) == str(material_all.tenant_id)}")
            
    except Exception as e:
        logger.error(f"❌ Error retrieving with tenant objects: {e}")
        return False
    
    # Step 6: Test direct query with manual tenant filter
    try:
        logger.info("🔍 Testing direct query with manual tenant filter...")
        
        # Query with explicit tenant filter
        manual_query = Material.all_objects.filter(
            id=material.id,
            tenant_id=test_user.business_id
        ).first()
        
        if manual_query:
            logger.info(f"✅ Material found with manual tenant filter: {manual_query.name}")
        else:
            logger.error("❌ Material NOT found with manual tenant filter!")
            
    except Exception as e:
        logger.error(f"❌ Error with manual tenant filter: {e}")
        return False
    
    # Step 7: Clean up
    try:
        logger.info("🧹 Cleaning up test material...")
        material.delete()
        logger.info("✅ Test material deleted")
        
        # Clear tenant context
        clear_tenant_context()
        logger.info("✅ Tenant context cleared")
        
    except Exception as e:
        logger.error(f"❌ Error during cleanup: {e}")
    
    logger.info("🧪 === MATERIAL CREATION DEBUG TEST END ===")
    return True

def check_database_status():
    """Check database and RLS status"""
    
    logger.info("📊 === DATABASE STATUS CHECK START ===")
    
    # Count materials in database
    try:
        total_materials = Material.all_objects.count()
        logger.info(f"📊 Total materials in database: {total_materials}")
        
        # Show first few materials
        for material in Material.all_objects.all()[:5]:
            logger.info(f"📊 Material: {material.name} (tenant_id: {material.tenant_id})")
            
    except Exception as e:
        logger.error(f"❌ Error checking materials: {e}")
    
    # Check users with business
    try:
        users_with_business = User.objects.filter(business_id__isnull=False).count()
        logger.info(f"📊 Users with business_id: {users_with_business}")
        
    except Exception as e:
        logger.error(f"❌ Error checking users: {e}")
    
    # Check tenant context
    try:
        current_tenant = get_current_tenant_id()
        logger.info(f"📊 Current tenant context: {current_tenant}")
        
    except Exception as e:
        logger.error(f"❌ Error checking tenant context: {e}")
    
    logger.info("📊 === DATABASE STATUS CHECK END ===")

if __name__ == '__main__':
    print("🚀 Starting Material Creation Debug Test")
    
    # First check database status
    check_database_status()
    
    # Then run the creation test
    test_material_creation()
    
    print("✅ Debug test completed")