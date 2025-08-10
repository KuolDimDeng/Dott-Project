#!/usr/bin/env python3
"""
Test script to debug location update JSON parse error
"""

import os
import sys
import django
import json

# Add the backend directory to Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def test_location_update():
    """Test location update with new fields"""
    from inventory.models import Location
    from inventory.serializers import LocationSerializer
    from custom_auth.models import Tenant
    from django.contrib.auth import get_user_model
    
    print("🔍 Testing Location Update with New Fields")
    print("=" * 60)
    
    try:
        # Get a test tenant
        User = get_user_model()
        test_user = User.objects.filter(email='support@dottapps.com').first()
        if not test_user:
            print("❌ Test user not found")
            return
            
        # Get tenant from user's tenant_id
        tenant_id = test_user.tenant_id if hasattr(test_user, 'tenant_id') else None
        if not tenant_id:
            print("❌ User has no tenant_id")
            return
        print(f"✅ Using tenant: {tenant_id}")
        
        # Get or create a test location
        location = Location.objects.filter(tenant_id=tenant_id).first()
        if not location:
            location = Location.objects.create(
                name="Test Warehouse",
                tenant_id=tenant_id,
                is_active=True
            )
            print(f"✅ Created test location: {location.name}")
        else:
            print(f"✅ Found existing location: {location.name}")
        
        # Print current location data
        print("\n📋 Current location data:")
        serializer = LocationSerializer(location)
        print(json.dumps(serializer.data, indent=2, default=str))
        
        # Update with new fields
        print("\n🔄 Updating location with new fields...")
        update_data = {
            'name': location.name,
            'description': location.description,
            'address': location.address,
            'street_address': '123 Main Street',
            'street_address_2': 'Suite 100',
            'city': 'San Francisco',
            'state_province': 'CA',
            'postal_code': '94105',
            'country': 'US',
            'latitude': 37.7749,
            'longitude': -122.4194,
            'is_active': True
        }
        
        # Test serializer with update data
        serializer = LocationSerializer(location, data=update_data, partial=True)
        if serializer.is_valid():
            print("✅ Serializer validation passed")
            updated_location = serializer.save()
            
            # Print updated data
            print("\n📋 Updated location data:")
            updated_serializer = LocationSerializer(updated_location)
            print(json.dumps(updated_serializer.data, indent=2, default=str))
            
            # Test the response format
            print("\n📄 Response format (what frontend receives):")
            response_data = updated_serializer.data
            response_json = json.dumps(response_data, default=str)
            print(response_json)
            
            # Verify JSON is parseable
            try:
                parsed = json.loads(response_json)
                print("\n✅ JSON is valid and parseable")
            except json.JSONDecodeError as e:
                print(f"\n❌ JSON parse error: {e}")
                
        else:
            print(f"❌ Serializer validation failed: {serializer.errors}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_location_update()