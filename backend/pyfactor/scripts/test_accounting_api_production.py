#!/usr/bin/env python
"""
Test the accounting standards API endpoint in production
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
from users.models import BusinessDetails
import json

User = get_user_model()

def test_api():
    # Get support user
    user = User.objects.get(email='support@dottapps.com')
    
    # Create test client
    client = Client()
    client.force_login(user)
    
    print(f"Testing as user: {user.email}")
    
    # Check current business details
    try:
        bd = BusinessDetails.objects.get(business__user=user)
        print(f"\nCurrent BusinessDetails:")
        print(f"  Country: {bd.country}")
        print(f"  Accounting Standard: {bd.accounting_standard}")
        print(f"  Inventory Method: {bd.inventory_valuation_method}")
    except BusinessDetails.DoesNotExist:
        print("\nNo BusinessDetails found!")
        return
    
    # Test the API endpoint
    url = '/api/business/settings/'  # This is the correct URL path
    
    print(f"\n{'='*60}")
    print(f"Testing: {url}")
    
    # Test GET
    print("\nGET Request:")
    response = client.get(url)
    print(f"Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    
    if response.status_code == 200:
        try:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        except:
            print(f"Raw content: {response.content.decode()}")
    else:
        print(f"Content: {response.content.decode()}")
        
    # Test PATCH
    print("\nPATCH Request:")
    response = client.patch(
        url, 
        data=json.dumps({'accounting_standard': 'GAAP'}),
        content_type='application/json'
    )
    print(f"Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    
    if response.status_code == 200:
        try:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        except:
            print(f"Raw content: {response.content.decode()}")
    else:
        print(f"Content: {response.content.decode()}")

if __name__ == '__main__':
    test_api()