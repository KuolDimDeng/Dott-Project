#!/usr/bin/env python
"""
Test the accounting standards API endpoint using Django test client
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
from django.urls import reverse

User = get_user_model()

def test_api():
    # Get a test user
    user = User.objects.get(email='support@dottapps.com')
    
    # Create test client
    client = Client()
    client.force_login(user)
    
    print(f"Testing as user: {user.email}")
    
    # Test with reverse URL lookup
    try:
        url = reverse('business_settings')
        print(f"\nReverse URL lookup 'business_settings': {url}")
    except Exception as e:
        print(f"Error with reverse: {e}")
    
    # Test URLs directly
    urls_to_test = [
        '/users/api/business/settings',  # without trailing slash
        '/users/api/business/settings/', # with trailing slash
    ]
    
    for url in urls_to_test:
        print(f"\n{'='*60}")
        print(f"Testing: {url}")
        
        # Test GET
        print("\nGET Request:")
        response = client.get(url)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
        elif response.status_code == 301:
            print(f"Redirect to: {response.headers.get('Location')}")
        else:
            print(f"Content: {response.content.decode()}")
            
        # Test PATCH
        print("\nPATCH Request:")
        response = client.patch(
            url, 
            data={'accounting_standard': 'GAAP'},
            content_type='application/json'
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
        elif response.status_code == 301:
            print(f"Redirect to: {response.headers.get('Location')}")
        else:
            print(f"Content: {response.content.decode()}")

if __name__ == '__main__':
    test_api()