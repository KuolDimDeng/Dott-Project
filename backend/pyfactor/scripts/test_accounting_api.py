#!/usr/bin/env python
"""
Test the accounting standards API endpoint
"""
import os
import sys
import django
import requests
from django.contrib.auth import get_user_model

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.session_service import SessionService

User = get_user_model()

def test_api():
    # Get a test user
    user = User.objects.get(email='support@dottapps.com')
    
    # Create a session
    session_service = SessionService()
    session_data = session_service.create_session(user)
    session_id = session_data['session_id']
    
    print(f"Created session: {session_id}")
    
    # Test URLs
    base_url = 'http://localhost:8000'
    
    urls_to_test = [
        '/users/api/business/settings',  # without trailing slash
        '/users/api/business/settings/', # with trailing slash
    ]
    
    headers = {
        'Cookie': f'sid={session_id}',
        'Content-Type': 'application/json'
    }
    
    for url in urls_to_test:
        full_url = base_url + url
        print(f"\nTesting: {full_url}")
        
        try:
            # Test GET
            response = requests.get(full_url, headers=headers)
            print(f"GET Status: {response.status_code}")
            if response.status_code == 200:
                print(f"Response: {response.json()}")
            else:
                print(f"Error: {response.text}")
                
            # Test PATCH
            data = {'accounting_standard': 'GAAP'}
            response = requests.patch(full_url, json=data, headers=headers)
            print(f"PATCH Status: {response.status_code}")
            if response.status_code == 200:
                print(f"Response: {response.json()}")
            else:
                print(f"Error: {response.text}")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == '__main__':
    test_api()