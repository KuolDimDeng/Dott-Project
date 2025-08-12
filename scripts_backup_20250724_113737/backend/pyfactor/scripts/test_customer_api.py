#!/usr/bin/env python
"""
Test script to verify customer API is working correctly
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from crm.models import Customer
from custom_auth.models import Tenant
from crm.views.secure_customer_viewset import SecureCustomerViewSet
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request

User = get_user_model()

def test_customer_api():
    print("=== Customer API Test ===\n")
    
    # Get the user
    user = User.objects.filter(email='kdeng@dottapps.com').first()
    if not user:
        print("ERROR: User kdeng@dottapps.com not found")
        return
    
    print(f"User found: {user.email}")
    print(f"User tenant_id: {user.tenant_id}")
    print(f"User is_active: {user.is_active}")
    
    # Check if customer exists
    customer = Customer.objects.filter(tenant_id=user.tenant_id).first()
    if customer:
        print(f"\nCustomer found in database:")
        print(f"  - ID: {customer.id}")
        print(f"  - Name: {customer.first_name} {customer.last_name}")
        print(f"  - Business: {customer.business_name}")
        print(f"  - Tenant ID: {customer.tenant_id}")
    else:
        print(f"\nNo customers found for tenant {user.tenant_id}")
    
    # Test the viewset
    print("\n\nTesting SecureCustomerViewSet:")
    factory = APIRequestFactory()
    request = factory.get('/api/crm/customers/')
    request.user = user
    
    # Create viewset instance
    viewset = SecureCustomerViewSet()
    viewset.request = request
    
    # Get queryset
    try:
        queryset = viewset.get_queryset()
        print(f"Viewset queryset count: {queryset.count()}")
        print(f"Viewset SQL: {queryset.query}")
        
        # List results
        for customer in queryset:
            print(f"\nViewset returned customer:")
            print(f"  - ID: {customer.id}")
            print(f"  - Name: {customer.first_name} {customer.last_name}")
            print(f"  - Business: {customer.business_name}")
    except Exception as e:
        print(f"ERROR in viewset: {e}")
    
    # Direct query test
    print("\n\nDirect query test:")
    direct_customers = Customer.objects.filter(tenant_id=user.tenant_id)
    print(f"Direct query count: {direct_customers.count()}")
    for c in direct_customers:
        print(f"  - {c.id}: {c.first_name} {c.last_name} ({c.business_name})")

if __name__ == "__main__":
    test_customer_api()