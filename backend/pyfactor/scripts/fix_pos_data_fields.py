#!/usr/bin/env python
"""
Fix POS data fields for existing records that might be missing required fields.
This ensures all customers and products have required fields populated.
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from crm.models import Customer
from inventory.models import Product
from django.db import transaction

def fix_customers():
    """Ensure all customers have required fields"""
    print("\n=== Fixing Customer Records ===")
    
    customers = Customer.all_objects.all()
    fixed_count = 0
    
    for customer in customers:
        needs_save = False
        
        # Ensure account_number exists
        if not customer.account_number:
            import random
            import string
            prefix = "C"
            random_suffix = ''.join(random.choices('0123456789', k=5))
            customer.account_number = f"{prefix}{random_suffix}"
            
            # Ensure uniqueness within tenant
            while Customer.all_objects.filter(
                tenant_id=customer.tenant_id, 
                account_number=customer.account_number
            ).exclude(id=customer.id).exists():
                random_suffix = ''.join(random.choices('0123456789', k=5))
                customer.account_number = f"{prefix}{random_suffix}"
            
            needs_save = True
            print(f"  - Generated account_number for customer {customer.id}: {customer.account_number}")
        
        # Ensure business_name or names exist
        if not customer.business_name and not customer.first_name and not customer.last_name:
            customer.business_name = f"Customer {customer.account_number or customer.id}"
            needs_save = True
            print(f"  - Set default business_name for customer {customer.id}")
        
        if needs_save:
            customer.save()
            fixed_count += 1
    
    print(f"Fixed {fixed_count} customer records")
    return fixed_count

def fix_products():
    """Ensure all products have required fields"""
    print("\n=== Fixing Product Records ===")
    
    products = Product.all_objects.all()
    fixed_count = 0
    
    for product in products:
        needs_save = False
        
        # Ensure name exists
        if not product.name:
            product.name = f"Product {product.sku or product.id}"
            needs_save = True
            print(f"  - Set default name for product {product.id}")
        
        # Ensure price exists
        if product.price is None:
            product.price = Decimal('0.00')
            needs_save = True
            print(f"  - Set default price for product {product.id}: {product.name}")
        
        # Ensure quantity exists
        if product.quantity is None:
            product.quantity = 0
            needs_save = True
            print(f"  - Set default quantity for product {product.id}: {product.name}")
        
        # Ensure SKU exists
        if not product.sku:
            import random
            import string
            # Generate a unique SKU
            product.sku = f"SKU-{product.id.hex[:8].upper()}"
            needs_save = True
            print(f"  - Generated SKU for product {product.id}: {product.sku}")
        
        # Ensure inventory_type is set
        if not product.inventory_type:
            product.inventory_type = 'product'
            needs_save = True
            print(f"  - Set default inventory_type for product {product.id}")
        
        # Ensure material_type is set
        if not product.material_type:
            product.material_type = 'consumable'
            needs_save = True
            print(f"  - Set default material_type for product {product.id}")
        
        # Ensure pricing_model is set
        if not product.pricing_model:
            product.pricing_model = 'direct'
            needs_save = True
            print(f"  - Set default pricing_model for product {product.id}")
        
        if needs_save:
            product.save()
            fixed_count += 1
    
    print(f"Fixed {fixed_count} product records")
    return fixed_count

def main():
    """Main function to fix all POS data fields"""
    print("\n" + "="*50)
    print("POS Data Fields Fix Script")
    print("="*50)
    
    try:
        with transaction.atomic():
            customer_count = fix_customers()
            product_count = fix_products()
            
            print("\n" + "="*50)
            print("Summary:")
            print(f"  - Fixed {customer_count} customer records")
            print(f"  - Fixed {product_count} product records")
            print("="*50 + "\n")
            
            # Get counts for verification
            total_customers = Customer.all_objects.count()
            total_products = Product.all_objects.count()
            
            print("Total records in database:")
            print(f"  - Customers: {total_customers}")
            print(f"  - Products: {total_products}")
            
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()