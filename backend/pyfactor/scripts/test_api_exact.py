#!/usr/bin/env python
"""
Test the exact API call as the frontend makes it
"""
import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
import json

User = get_user_model()

def test_exact_api():
    # Get support user
    user = User.objects.get(email='support@dottapps.com')
    
    # Create test client
    client = Client()
    client.force_login(user)
    
    print(f"Testing as user: {user.email}\n")
    
    # Exact URL the frontend calls
    url = '/api/business/settings/'
    
    # Test GET request
    print("=== GET Request ===")
    response = client.get(url)
    print(f"Status: {response.status_code}")
    print(f"Content-Type: {response.get('Content-Type')}")
    
    if response.status_code == 200:
        # Check if it's JSON
        if 'application/json' in response.get('Content-Type', ''):
            data = response.json()
            print(f"JSON Response: {json.dumps(data, indent=2)}")
        else:
            # It's not JSON - show raw content
            content = response.content.decode()
            print(f"Non-JSON Response (first 500 chars):")
            print(content[:500])
            if 'DOCTYPE' in content:
                print("\n⚠️  WARNING: Backend returned HTML instead of JSON!")
    else:
        print(f"Error Response: {response.content.decode()}")
    
    # Test PATCH request
    print("\n=== PATCH Request ===")
    patch_data = {'accounting_standard': 'GAAP'}
    response = client.patch(
        url,
        data=json.dumps(patch_data),
        content_type='application/json'
    )
    print(f"Status: {response.status_code}")
    print(f"Content-Type: {response.get('Content-Type')}")
    
    if response.status_code == 200:
        if 'application/json' in response.get('Content-Type', ''):
            data = response.json()
            print(f"JSON Response: {json.dumps(data, indent=2)}")
        else:
            content = response.content.decode()
            print(f"Non-JSON Response (first 500 chars):")
            print(content[:500])
    else:
        print(f"Error Response: {response.content.decode()}")

if __name__ == '__main__':
    test_exact_api()