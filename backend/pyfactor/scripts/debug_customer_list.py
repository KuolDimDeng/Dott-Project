#!/usr/bin/env python
"""
Debug script to check customer data and tenant associations
Run this on the backend server to diagnose customer listing issues
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from crm.models import Customer
from django.db import connection

User = get_user_model()

def debug_customer_data():
    print("=== Customer Data Debug ===\n")
    
    # Check total customers in database
    total_customers = Customer.objects.count()
    print(f"Total customers in database: {total_customers}")
    
    # List all customers with their tenant IDs
    print("\nAll customers:")
    for customer in Customer.objects.all():
        print(f"  - ID: {customer.id}, Name: {customer.first_name} {customer.last_name}, "
              f"Email: {customer.email}, Tenant: {customer.tenant_id}")
    
    # Check user tenant associations
    print("\n\nUser tenant associations:")
    for user in User.objects.filter(email__in=['kdeng@dottapps.com']):
        print(f"\nUser: {user.email}")
        print(f"  - User ID: {user.id}")
        print(f"  - Tenant ID: {getattr(user, 'tenant_id', 'NOT SET')}")
        print(f"  - Is Active: {user.is_active}")
        print(f"  - Onboarding Completed: {getattr(user, 'onboarding_completed', 'NOT SET')}")
        
        # Check if user's tenant matches any customer's tenant
        if hasattr(user, 'tenant_id') and user.tenant_id:
            user_customers = Customer.objects.filter(tenant_id=user.tenant_id)
            print(f"  - Customers for this tenant: {user_customers.count()}")
            for customer in user_customers:
                print(f"    - {customer.first_name} {customer.last_name} ({customer.email})")
    
    # Check if there are any tenant mismatches
    print("\n\nChecking for tenant mismatches:")
    customers_with_tenants = Customer.objects.values_list('tenant_id', flat=True).distinct()
    users_with_tenants = User.objects.exclude(tenant_id__isnull=True).values_list('tenant_id', flat=True).distinct()
    
    print(f"Unique tenant IDs in customers: {list(customers_with_tenants)}")
    print(f"Unique tenant IDs in users: {list(users_with_tenants)}")
    
    # Test the query that the viewset would use
    print("\n\nTesting SecureCustomerViewSet query:")
    test_user = User.objects.filter(email='kdeng@dottapps.com').first()
    if test_user and hasattr(test_user, 'tenant_id') and test_user.tenant_id:
        print(f"Simulating query for user {test_user.email} with tenant {test_user.tenant_id}")
        customers = Customer.objects.filter(tenant_id=test_user.tenant_id)
        print(f"Query result count: {customers.count()}")
        print(f"Raw SQL: {customers.query}")

if __name__ == "__main__":
    debug_customer_data()