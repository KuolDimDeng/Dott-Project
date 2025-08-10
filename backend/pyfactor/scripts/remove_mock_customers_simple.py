#!/usr/bin/env python
"""Remove mock customers created earlier"""

import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from crm.models import Customer
from users.models import User
from django.db import connection

def main():
    print("=== Removing Mock Customers ===")
    
    # Get the user and their tenant
    user = User.objects.filter(email='support@dottapps.com').first()
    if not user or not user.business_id:
        print("Error: User not found or no business_id")
        return
    
    tenant_id = user.business_id
    print(f"Looking for mock customers in tenant: {tenant_id}")
    print()
    
    # Find the mock customers by their specific names
    mock_customer_names = ["ABC Construction LLC", "Green Valley Landscaping"]
    
    for name in mock_customer_names:
        try:
            customer = Customer.all_objects.filter(
                tenant_id=tenant_id,
                business_name=name
            ).first()
            
            if customer:
                print(f"Found customer: {name}")
                print(f"  ID: {customer.id}")
                print(f"  Email: {customer.email}")
                
                # Try to delete using raw SQL to avoid foreign key issues
                with connection.cursor() as cursor:
                    cursor.execute(
                        "DELETE FROM crm_customer WHERE id = %s AND tenant_id = %s",
                        [str(customer.id), str(tenant_id)]
                    )
                    print(f"✓ Deleted: {name}")
            else:
                print(f"Customer not found: {name}")
                
        except Exception as e:
            print(f"✗ Error deleting {name}: {e}")
    
    print()
    print("=== Verification ===")
    
    # Check remaining customers
    remaining = Customer.all_objects.filter(tenant_id=tenant_id)
    print(f"Remaining customers for tenant: {remaining.count()}")
    for customer in remaining:
        print(f"  - {customer.business_name or f'{customer.first_name} {customer.last_name}'}")

if __name__ == '__main__':
    main()