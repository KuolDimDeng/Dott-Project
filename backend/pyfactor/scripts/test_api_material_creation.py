#!/usr/bin/env python3
"""
Test script to simulate API material creation and identify tenant context issues.
This will help us understand why materials aren't persisting through API calls.
"""

import os
import sys
import django
import logging
import uuid
import json

# Add the project root to Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Setup Django
django.setup()

from django.test import RequestFactory, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient, APIRequestFactory
from inventory.models_materials import Material
from inventory.views_materials import MaterialViewSet
from custom_auth.models import User
from custom_auth.rls import set_tenant_context, get_current_tenant_id, clear_tenant_context

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_api_material_creation():
    """Test material creation through the API"""
    
    logger.info("🌐 === API MATERIAL CREATION TEST START ===")
    
    # Step 1: Find a test user
    try:
        test_user = User.objects.filter(business_id__isnull=False).first()
        if not test_user:
            logger.error("❌ No test user found with business_id")
            return False
            
        logger.info(f"✅ Found test user: {test_user.email} (business_id: {test_user.business_id})")
        
    except Exception as e:
        logger.error(f"❌ Error finding test user: {e}")
        return False
    
    # Step 2: Create API client and authenticate
    try:
        client = APIClient()
        
        # For this test, we'll manually set the user
        client.force_authenticate(user=test_user)
        logger.info(f"✅ API client authenticated as: {test_user.email}")
        
    except Exception as e:
        logger.error(f"❌ Error setting up API client: {e}")
        return False
    
    # Step 3: Prepare material data
    material_data = {
        'name': 'API Test Drill',
        'description': 'Test material created via API',
        'material_type': 'tool',
        'quantity_in_stock': 15,
        'unit': 'unit',
        'unit_cost': 49.99,
        'reorder_level': 3,
        'is_active': True,
    }
    
    logger.info(f"📦 Material data: {material_data}")
    
    # Step 4: Make API request to create material
    try:
        logger.info("🌐 Making POST request to create material...")
        
        # Set headers that would normally be set by frontend
        headers = {
            'X-Tenant-ID': str(test_user.business_id),
            'Content-Type': 'application/json',
        }
        
        response = client.post(
            '/api/inventory/materials/',
            data=material_data,
            format='json',
            **headers
        )
        
        logger.info(f"🌐 API Response Status: {response.status_code}")
        logger.info(f"🌐 API Response Data: {response.data}")
        
        if response.status_code == 201:
            created_material_id = response.data.get('id')
            logger.info(f"✅ Material created via API with ID: {created_material_id}")
            
            # Step 5: Verify the material was saved
            try:
                # Check using all_objects
                material_all = Material.all_objects.filter(id=created_material_id).first()
                if material_all:
                    logger.info(f"✅ API-created material found in all_objects: {material_all.name}")
                    logger.info(f"✅ API-created material tenant_id: {material_all.tenant_id}")
                else:
                    logger.error("❌ API-created material NOT found in all_objects!")
                    return False
                
                # Step 6: Test retrieval via API
                logger.info("🌐 Testing material retrieval via API...")
                
                get_response = client.get(
                    '/api/inventory/materials/',
                    **headers
                )
                
                logger.info(f"🌐 GET Response Status: {get_response.status_code}")
                
                if get_response.status_code == 200:
                    materials = get_response.data.get('results', [])
                    logger.info(f"🌐 Retrieved {len(materials)} materials via API")
                    
                    # Check if our created material is in the list
                    found_material = None
                    for material in materials:
                        if material.get('id') == created_material_id:
                            found_material = material
                            break
                    
                    if found_material:
                        logger.info(f"✅ API-created material found in GET response: {found_material['name']}")
                    else:
                        logger.error("❌ API-created material NOT found in GET response!")
                        logger.error("❌ This indicates the API retrieval filtering issue!")
                        
                        # Debug: Log all returned materials
                        for material in materials:
                            logger.error(f"❌ Returned material: {material['name']} (ID: {material['id']})")
                        
                        return False
                else:
                    logger.error(f"❌ GET request failed with status: {get_response.status_code}")
                    return False
                
                # Step 7: Clean up
                logger.info("🧹 Cleaning up API-created material...")
                delete_response = client.delete(
                    f'/api/inventory/materials/{created_material_id}/',
                    **headers
                )
                
                if delete_response.status_code == 204:
                    logger.info("✅ API-created material deleted successfully")
                else:
                    logger.warning(f"⚠️ Delete failed with status: {delete_response.status_code}")
                
            except Exception as e:
                logger.error(f"❌ Error verifying API-created material: {e}")
                import traceback
                logger.error(f"❌ Traceback: {traceback.format_exc()}")
                return False
                
        else:
            logger.error(f"❌ Material creation failed via API: {response.status_code}")
            logger.error(f"❌ Error response: {response.data}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error making API request: {e}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return False
    
    logger.info("🌐 === API MATERIAL CREATION TEST END ===")
    return True

def test_viewset_directly():
    """Test the MaterialViewSet directly without going through middleware"""
    
    logger.info("🎯 === DIRECT VIEWSET TEST START ===")
    
    # Step 1: Find test user
    try:
        test_user = User.objects.filter(business_id__isnull=False).first()
        if not test_user:
            logger.error("❌ No test user found")
            return False
            
        logger.info(f"✅ Found test user: {test_user.email}")
        
    except Exception as e:
        logger.error(f"❌ Error finding test user: {e}")
        return False
    
    # Step 2: Set tenant context manually
    try:
        tenant_id = str(test_user.business_id)
        set_tenant_context(tenant_id)
        logger.info(f"🏢 Set tenant context to: {tenant_id}")
        
    except Exception as e:
        logger.error(f"❌ Error setting tenant context: {e}")
        return False
    
    # Step 3: Create request factory and simulate request
    try:
        factory = APIRequestFactory()
        
        material_data = {
            'name': 'Direct ViewSet Test Material',
            'material_type': 'tool',
            'quantity_in_stock': 5,
            'unit': 'unit',
            'unit_cost': 19.99,
            'reorder_level': 2,
            'is_active': True,
        }
        
        # Create POST request
        request = factory.post(
            '/api/inventory/materials/',
            data=material_data,
            format='json'
        )
        
        # Set the user on the request
        request.user = test_user
        
        logger.info(f"🎯 Created request with user: {request.user.email}")
        
        # Step 4: Call ViewSet directly
        viewset = MaterialViewSet()
        viewset.request = request
        
        # Call create method
        response = viewset.create(request)
        
        logger.info(f"🎯 ViewSet response status: {response.status_code}")
        logger.info(f"🎯 ViewSet response data: {response.data}")
        
        if response.status_code == 201:
            created_id = response.data.get('id')
            logger.info(f"✅ Direct ViewSet creation successful: {created_id}")
            
            # Test retrieval
            get_request = factory.get('/api/inventory/materials/')
            get_request.user = test_user
            viewset.request = get_request
            
            materials = viewset.get_queryset()
            material_count = materials.count()
            
            logger.info(f"🎯 Direct ViewSet retrieved {material_count} materials")
            
            # Check if our material is in the queryset
            created_material = materials.filter(id=created_id).first()
            if created_material:
                logger.info(f"✅ Direct ViewSet found created material: {created_material.name}")
            else:
                logger.error("❌ Direct ViewSet did NOT find created material!")
                return False
            
            # Clean up
            Material.all_objects.filter(id=created_id).delete()
            logger.info("✅ Direct ViewSet test material cleaned up")
            
            clear_tenant_context()
            
        else:
            logger.error(f"❌ Direct ViewSet creation failed: {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error in direct ViewSet test: {e}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return False
    
    logger.info("🎯 === DIRECT VIEWSET TEST END ===")
    return True

if __name__ == '__main__':
    print("🚀 Starting API Material Creation Tests")
    
    # Test 1: API request simulation
    print("\n📊 Test 1: API Request Simulation")
    api_success = test_api_material_creation()
    
    # Test 2: Direct ViewSet call
    print("\n📊 Test 2: Direct ViewSet Call")
    viewset_success = test_viewset_directly()
    
    print(f"\n✅ API Test Result: {'PASS' if api_success else 'FAIL'}")
    print(f"✅ ViewSet Test Result: {'PASS' if viewset_success else 'FAIL'}")
    
    if api_success and viewset_success:
        print("🎉 Both tests passed - API material creation is working!")
    else:
        print("❌ Some tests failed - there may be an API issue")