#!/usr/bin/env python
"""Add mock customers and supplies data for testing"""

import os
import sys
import django
from decimal import Decimal

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from crm.models import Customer
from inventory.models import Product
from users.models import User
from django.utils import timezone

def main():
    print("=== Adding Mock Data ===")
    
    # Get the user and their tenant
    user = User.objects.filter(email='support@dottapps.com').first()
    if not user or not user.business_id:
        print("Error: User not found or no business_id")
        return
    
    tenant_id = user.business_id
    print(f"Adding data for tenant: {tenant_id}")
    print()
    
    # Create 2 customers
    print("Creating customers...")
    
    customer1 = Customer.objects.create(
        tenant_id=tenant_id,
        business_name="ABC Construction LLC",
        first_name="John",
        last_name="Smith",
        email="john@abcconstruction.com",
        phone="+1-555-123-4567",
        street="123 Main Street",
        city="Denver",
        billing_state="CO",
        postcode="80202",
        billing_country="USA",
        notes="Regular customer, prefers morning appointments"
    )
    print(f"✓ Created customer: {customer1.business_name}")
    
    customer2 = Customer.objects.create(
        tenant_id=tenant_id,
        business_name="Green Valley Landscaping",
        first_name="Sarah",
        last_name="Johnson",
        email="sarah@greenvalleylandscape.com",
        phone="+1-555-987-6543",
        street="456 Oak Avenue",
        city="Boulder",
        billing_state="CO",
        postcode="80301",
        billing_country="USA",
        notes="Commercial client, monthly service contract"
    )
    print(f"✓ Created customer: {customer2.business_name}")
    
    print()
    
    # Create 2 supplies/materials
    print("Creating supplies/materials...")
    
    supply1 = Product.objects.create(
        tenant_id=tenant_id,
        name="Standard Paint - White (1 Gallon)",
        description="High-quality interior/exterior white paint",
        sku="PAINT-WHITE-1G",
        inventory_type="supply",
        material_type="consumable",
        price=Decimal("35.99"),
        cost=Decimal("25.00"),
        quantity=50,
        unit="gallons",
        markup_percentage=Decimal("20.00"),
        is_billable=True,
        is_active=True,
        reorder_level=10
    )
    print(f"✓ Created supply: {supply1.name}")
    
    supply2 = Product.objects.create(
        tenant_id=tenant_id,
        name="Paint Brush Set - Professional",
        description="Set of 5 professional paint brushes (various sizes)",
        sku="BRUSH-SET-PRO",
        inventory_type="supply",
        material_type="reusable",
        price=Decimal("45.00"),
        cost=Decimal("30.00"),
        quantity=25,
        unit="sets",
        markup_percentage=Decimal("25.00"),
        is_billable=True,
        is_active=True,
        reorder_level=5
    )
    print(f"✓ Created supply: {supply2.name}")
    
    print()
    print("=== Mock Data Added Successfully ===")
    
    # Verify the data
    print()
    print("Verification:")
    customer_count = Customer.all_objects.filter(tenant_id=tenant_id).count()
    supply_count = Product.all_objects.filter(tenant_id=tenant_id, inventory_type='supply').count()
    print(f"Total customers for tenant: {customer_count}")
    print(f"Total supplies for tenant: {supply_count}")

if __name__ == '__main__':
    main()