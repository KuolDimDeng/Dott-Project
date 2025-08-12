#!/usr/bin/env python3
"""
Script to update existing products and customers with default values for new fields.

This script populates:
- Products: is_tax_exempt=False, tax_category='standard'  
- Customers: billing_county='Layton', shipping_county='Layton', is_tax_exempt=False
"""

import os
import sys
import django

# Add the project root to Python path
sys.path.append('/app')  # Production path
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')  # Local path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from inventory.models import Product
from crm.models import Customer
from django.db import transaction, connection
from django.db.models import Q

def check_column_exists(table_name, column_name):
    """Check if a column exists in a table"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s AND column_name = %s
        """, [table_name, column_name])
        return cursor.fetchone() is not None

def update_products():
    """Update existing products with default tax values"""
    print("🔄 Updating existing products with default tax values...")
    
    # Check if columns exist
    if not check_column_exists('inventory_product', 'is_tax_exempt'):
        print("⚠️  Column 'is_tax_exempt' does not exist in inventory_product table")
        print("   Migration may not have been applied yet. Skipping product updates.")
        return
    
    if not check_column_exists('inventory_product', 'tax_category'):
        print("⚠️  Column 'tax_category' does not exist in inventory_product table")
        print("   Migration may not have been applied yet. Skipping product updates.")
        return
    
    # Find products that need updating (missing tax fields)
    products_to_update = Product.objects.filter(
        Q(is_tax_exempt__isnull=True) | Q(tax_category__isnull=True) | Q(tax_category='')
    )
    
    count = products_to_update.count()
    print(f"Found {count} products to update")
    
    if count == 0:
        print("✅ No products need updating")
        return
    
    # Update in batches
    batch_size = 100
    updated = 0
    
    with transaction.atomic():
        for i in range(0, count, batch_size):
            batch = products_to_update[i:i+batch_size]
            
            for product in batch:
                # Set default values only if they're null/empty
                if product.is_tax_exempt is None:
                    product.is_tax_exempt = False
                if not product.tax_category:
                    product.tax_category = 'standard'
                
                product.save(update_fields=['is_tax_exempt', 'tax_category'])
                updated += 1
                
                if updated % 50 == 0:
                    print(f"Updated {updated}/{count} products...")
    
    print(f"✅ Successfully updated {updated} products")
    print("   - is_tax_exempt: False")
    print("   - tax_category: 'standard'")

def update_customers():
    """Update existing customers with default county and tax exemption values"""
    print("🔄 Updating existing customers with default values...")
    
    # Check if columns exist
    if not check_column_exists('crm_customer', 'billing_county'):
        print("⚠️  Column 'billing_county' does not exist in crm_customer table")
        print("   Migration may not have been applied yet. Skipping customer updates.")
        return
    
    if not check_column_exists('crm_customer', 'shipping_county'):
        print("⚠️  Column 'shipping_county' does not exist in crm_customer table")
        print("   Migration may not have been applied yet. Skipping customer updates.")
        return
    
    if not check_column_exists('crm_customer', 'is_tax_exempt'):
        print("⚠️  Column 'is_tax_exempt' does not exist in crm_customer table")
        print("   Migration may not have been applied yet. Skipping customer updates.")
        return
    
    # Find customers that need updating (missing county or tax exemption fields)
    customers_to_update = Customer.objects.filter(
        Q(billing_county__isnull=True) |
        Q(billing_county='') |
        Q(shipping_county__isnull=True) |
        Q(shipping_county='') |
        Q(is_tax_exempt__isnull=True)
    )
    
    count = customers_to_update.count()
    print(f"Found {count} customers to update")
    
    if count == 0:
        print("✅ No customers need updating")
        return
    
    # Update in batches
    batch_size = 100
    updated = 0
    
    with transaction.atomic():
        for i in range(0, count, batch_size):
            batch = customers_to_update[i:i+batch_size]
            
            for customer in batch:
                # Set default values only if they're null/empty
                if not customer.billing_county:
                    customer.billing_county = 'Layton'
                if not customer.shipping_county:
                    customer.shipping_county = 'Layton'
                if customer.is_tax_exempt is None:
                    customer.is_tax_exempt = False
                
                customer.save(update_fields=['billing_county', 'shipping_county', 'is_tax_exempt'])
                updated += 1
                
                if updated % 50 == 0:
                    print(f"Updated {updated}/{count} customers...")
    
    print(f"✅ Successfully updated {updated} customers")
    print("   - billing_county: 'Layton'")
    print("   - shipping_county: 'Layton'")
    print("   - is_tax_exempt: False")

def main():
    """Main function to run all updates"""
    print("🚀 Starting update of existing records with default values...")
    print("=" * 60)
    
    try:
        # Update products first
        update_products()
        print()
        
        # Update customers
        update_customers()
        print()
        
        print("=" * 60)
        print("✅ All updates completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during update: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()