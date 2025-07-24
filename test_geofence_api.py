#!/usr/bin/env python3
"""
Test the geofence API directly to debug the 400/500 errors
"""
import os
import sys
import django
import json

# Add the project root to the Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from hr.models import Geofence
from django.contrib.auth import get_user_model

User = get_user_model()

def test_geofence_creation():
    """Test creating a geofence directly"""
    print("=== Testing Geofence Creation ===")
    
    # Get a test user
    try:
        user = User.objects.get(email='support@dottapps.com')
        print(f"✓ Found user: {user.email}")
        print(f"  Business ID: {user.business_id}")
        print(f"  Has business_id: {bool(user.business_id)}")
    except User.DoesNotExist:
        print("✗ User not found")
        return
    
    # Test data
    test_data = {
        'name': 'Test Geofence Direct',
        'description': 'Created via direct test',
        'location_type': 'OFFICE',
        'shape_type': 'CIRCLE',
        'center_latitude': 37.7749,
        'center_longitude': -122.4194,
        'radius_meters': 100,
        'require_for_clock_in': True,
        'require_for_clock_out': False,
        'auto_clock_out_on_exit': False,
        'alert_on_unexpected_exit': False,
        'business_id': user.business_id,
        'created_by': user,
        'is_active': True
    }
    
    print("\nCreating geofence with data:")
    for key, value in test_data.items():
        print(f"  {key}: {value}")
    
    try:
        # Create geofence
        geofence = Geofence.objects.create(**test_data)
        print(f"\n✓ Geofence created successfully!")
        print(f"  ID: {geofence.id}")
        print(f"  Name: {geofence.name}")
        print(f"  Business ID: {geofence.business_id}")
        print(f"  Is Active: {geofence.is_active}")
        
        # Verify it exists
        count = Geofence.objects.filter(business_id=user.business_id).count()
        print(f"\n✓ Total geofences for business: {count}")
        
    except Exception as e:
        print(f"\n✗ Error creating geofence: {str(e)}")
        print(f"  Error type: {type(e)}")
        import traceback
        traceback.print_exc()

def list_all_geofences():
    """List all geofences in the database"""
    print("\n\n=== All Geofences in Database ===")
    
    all_geofences = Geofence.objects.all()
    print(f"Total geofences: {all_geofences.count()}")
    
    for i, g in enumerate(all_geofences):
        print(f"\n[{i}] Geofence:")
        print(f"  ID: {g.id}")
        print(f"  Name: {g.name}")
        print(f"  Business ID: {g.business_id}")
        print(f"  Location Type: {g.location_type}")
        print(f"  Is Active: {g.is_active}")
        print(f"  Created: {g.created_at}")
        print(f"  Created By: {g.created_by.email if g.created_by else 'Unknown'}")

def test_serializer():
    """Test the serializer to see what might be failing"""
    print("\n\n=== Testing Serializer ===")
    
    from hr.serializers import GeofenceSerializer
    from rest_framework.test import APIRequestFactory
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    user = User.objects.get(email='support@dottapps.com')
    
    # Create a mock request
    factory = APIRequestFactory()
    request = factory.post('/api/hr/geofences/')
    request.user = user
    
    # Test data (mimicking what frontend sends)
    test_data = {
        'name': 'Test Serializer',
        'description': '',
        'location_type': 'OFFICE',
        'shape_type': 'CIRCLE',
        'center_latitude': '37.7749',  # String like frontend
        'center_longitude': '-122.4194',  # String like frontend
        'radius_meters': 100,
        'require_for_clock_in': True,
        'require_for_clock_out': False,
        'auto_clock_out_on_exit': False,
        'alert_on_unexpected_exit': False,
        'is_active': True
    }
    
    print("Test data:")
    print(json.dumps(test_data, indent=2))
    
    # Test serializer
    serializer = GeofenceSerializer(data=test_data, context={'request': request})
    
    if serializer.is_valid():
        print("\n✓ Serializer validation passed!")
        print("Validated data:")
        print(json.dumps(serializer.validated_data, indent=2, default=str))
    else:
        print("\n✗ Serializer validation failed!")
        print("Errors:")
        print(json.dumps(serializer.errors, indent=2))

if __name__ == "__main__":
    print("Running geofence API tests...\n")
    
    # Run tests
    test_geofence_creation()
    list_all_geofences()
    test_serializer()
    
    print("\n\nTests complete!")