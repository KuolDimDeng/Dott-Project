#!/usr/bin/env python
"""Remove all mock customers and supplies data"""

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

def main():
    print("=== Removing Mock Data ===")
    
    # Get the user and their tenant
    user = User.objects.filter(email='support@dottapps.com').first()
    if not user or not user.business_id:
        print("Error: User not found or no business_id")
        return
    
    tenant_id = user.business_id
    print(f"Removing data for tenant: {tenant_id}")
    print()
    
    # Remove customers for this tenant
    print("Removing customers...")
    customers = Customer.all_objects.filter(tenant_id=tenant_id)
    customer_count = customers.count()
    
    if customer_count > 0:
        print(f"Found {customer_count} customers to remove:")
        for customer in customers:
            print(f"  - {customer.business_name or f'{customer.first_name} {customer.last_name}'}")
        
        # Delete customers one by one to avoid cascade issues
        for customer in customers:
            try:
                customer.delete()
                print(f"  ✓ Deleted: {customer.business_name or f'{customer.first_name} {customer.last_name}'}")
            except Exception as e:
                print(f"  ✗ Error deleting customer: {e}")
        
        print(f"✓ Customer removal complete")
    else:
        print("No customers found to remove")
    
    print()
    
    # Remove supplies for this tenant
    print("Removing supplies/materials...")
    supplies = Product.all_objects.filter(tenant_id=tenant_id, inventory_type='supply')
    supply_count = supplies.count()
    
    if supply_count > 0:
        print(f"Found {supply_count} supplies to remove:")
        for supply in supplies:
            print(f"  - {supply.name}")
        
        supplies.delete()
        print(f"✓ Removed {supply_count} supplies")
    else:
        print("No supplies found to remove")
    
    print()
    print("=== Mock Data Removal Complete ===")
    
    # Verify the data is gone
    print()
    print("Verification:")
    remaining_customers = Customer.all_objects.filter(tenant_id=tenant_id).count()
    remaining_supplies = Product.all_objects.filter(tenant_id=tenant_id, inventory_type='supply').count()
    print(f"Remaining customers for tenant: {remaining_customers}")
    print(f"Remaining supplies for tenant: {remaining_supplies}")

if __name__ == '__main__':
    main()