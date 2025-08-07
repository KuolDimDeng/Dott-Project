#!/usr/bin/env python3
"""Test tenant tax settings endpoint."""

import os
import sys
import django
import requests

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from taxes.views.simple_tenant_settings import get_tenant_tax_settings
from rest_framework.test import APIRequestFactory

User = get_user_model()

def test_tenant_settings():
    """Test the tenant tax settings endpoint."""
    
    print("=" * 80)
    print("Testing Tenant Tax Settings Endpoint")
    print("=" * 80)
    
    # Get a test user
    user = User.objects.filter(email='support@dottapps.com').first()
    if not user:
        print("❌ Test user not found")
        return
    
    print(f"✅ Found test user: {user.email}")
    
    # Create request factory
    factory = APIRequestFactory()
    
    # Test the endpoint
    request = factory.get('/api/taxes/tenant-settings/')
    request.user = user
    
    try:
        response = get_tenant_tax_settings(request)
        data = response.data
        
        print(f"✅ Endpoint response successful!")
        print(f"   Status: {response.status_code}")
        print(f"   Settings:")
        settings = data.get('settings', {})
        print(f"     Country: {settings.get('country')}")
        print(f"     Country Name: {settings.get('country_name')}")
        print(f"     Tax Rate: {settings.get('sales_tax_rate', 0) * 100}%")
        print(f"     Source: {data.get('source')}")
        
    except Exception as e:
        print(f"❌ Error testing endpoint: {str(e)}")
    
    print("\n" + "=" * 80)
    print("Test Complete")
    print("=" * 80)

if __name__ == '__main__':
    test_tenant_settings()