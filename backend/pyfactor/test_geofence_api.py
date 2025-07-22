#!/usr/bin/env python
"""
Test script to check geofence API endpoint
"""
import os
import sys
import django
import requests
from django.contrib.auth import get_user_model

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from hr.models import Geofence
from users.models import UserSession

def test_geofence_api():
    """Test the geofence API endpoint"""
    
    # Get a test user session
    User = get_user_model()
    
    try:
        # Get the support user
        user = User.objects.get(email='support@dottapps.com')
        print(f"✓ Found user: {user.email}")
        print(f"  Business ID: {user.business_id}")
        print(f"  Tenant ID: {user.tenant_id}")
        
        # Check for active sessions
        sessions = UserSession.objects.filter(user=user, is_active=True).order_by('-created_at')
        if sessions.exists():
            session = sessions.first()
            print(f"✓ Found active session: {session.session_id}")
        else:
            print("✗ No active session found")
            return
        
        # Check geofences in database
        all_geofences = Geofence.objects.all()
        user_geofences = Geofence.objects.filter(business_id=user.business_id)
        
        print(f"\n📊 Database Status:")
        print(f"  Total geofences: {all_geofences.count()}")
        print(f"  User's geofences: {user_geofences.count()}")
        
        if all_geofences.exists():
            print(f"\n📍 Sample geofences:")
            for g in all_geofences[:3]:
                print(f"  - {g.name} (Business: {g.business_id}, Active: {g.is_active})")
        
        # Test the API endpoint
        print(f"\n🌐 Testing API endpoint...")
        
        # Use local Django test client
        from django.test import Client
        client = Client()
        
        # Set session
        from django.contrib.auth import login
        client.force_login(user)
        
        # Make request
        response = client.get('/api/hr/geofences/')
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  Response: {data}")
        else:
            print(f"  Error: {response.content}")
            
    except User.DoesNotExist:
        print("✗ User support@dottapps.com not found")
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_geofence_api()