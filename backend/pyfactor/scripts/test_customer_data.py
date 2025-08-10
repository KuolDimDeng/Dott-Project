#!/usr/bin/env python
"""Test script to check customer data and tenant filtering"""

import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from crm.models import Customer
from inventory.models import Product
from users.models import User
from custom_auth.rls import set_tenant_context, get_current_tenant_id

def main():
    print("=== Testing Customer and Product Data ===")
    print()
    
    # First, let's see what users we have
    user = User.objects.filter(email='support@dottapps.com').first()
    if user:
        print(f"Found user: {user.email}")
        print(f"User business_id: {user.business_id}")
        print(f"User tenant_id: {getattr(user, 'tenant_id', 'Not set')}")
        print()
        
        # Set tenant context
        if user.business_id:
            print(f"Setting tenant context to: {user.business_id}")
            set_tenant_context(str(user.business_id))
            print(f"Current tenant context: {get_current_tenant_id()}")
            print()
    
    # Check all customers (bypass tenant filtering)
    print("=== All Customers (all_objects) ===")
    all_customers = Customer.all_objects.all()
    print(f"Total customers in database: {all_customers.count()}")
    
    for i, customer in enumerate(all_customers[:10]):
        print(f"{i+1}. {customer.business_name or f'{customer.first_name} {customer.last_name}'}")
        print(f"   - ID: {customer.id}")
        print(f"   - Tenant ID: {customer.tenant_id}")
        print(f"   - Email: {customer.email}")
    
    print()
    
    # Check filtered customers
    print("=== Filtered Customers (objects) ===")
    filtered_customers = Customer.objects.all()
    print(f"Customers with tenant filtering: {filtered_customers.count()}")
    
    print()
    
    # Check customers for specific tenant
    if user and user.business_id:
        print(f"=== Customers for tenant {user.business_id} ===")
        tenant_customers = Customer.all_objects.filter(tenant_id=user.business_id)
        print(f"Customers for this tenant: {tenant_customers.count()}")
        
        for i, customer in enumerate(tenant_customers[:5]):
            print(f"{i+1}. {customer.business_name or f'{customer.first_name} {customer.last_name}'}")
    
    print()
    
    # Check products/supplies
    print("=== All Supplies (all_objects) ===")
    all_supplies = Product.all_objects.filter(inventory_type='supply', is_active=True)
    print(f"Total supplies in database: {all_supplies.count()}")
    
    for i, supply in enumerate(all_supplies[:10]):
        print(f"{i+1}. {supply.name}")
        print(f"   - ID: {supply.id}")
        print(f"   - Tenant ID: {supply.tenant_id}")
        print(f"   - SKU: {supply.sku}")
    
    print()
    
    # Check filtered supplies
    print("=== Filtered Supplies (objects) ===")
    filtered_supplies = Product.objects.filter(inventory_type='supply', is_active=True)
    print(f"Supplies with tenant filtering: {filtered_supplies.count()}")
    
    print()
    
    # Check supplies for specific tenant
    if user and user.business_id:
        print(f"=== Supplies for tenant {user.business_id} ===")
        tenant_supplies = Product.all_objects.filter(tenant_id=user.business_id, inventory_type='supply', is_active=True)
        print(f"Supplies for this tenant: {tenant_supplies.count()}")
        
        for i, supply in enumerate(tenant_supplies[:5]):
            print(f"{i+1}. {supply.name}")

if __name__ == '__main__':
    main()