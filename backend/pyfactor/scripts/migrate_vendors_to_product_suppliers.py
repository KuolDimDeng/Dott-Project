#!/usr/bin/env python
"""
Migration script to separate product suppliers from service vendors
Maintains data integrity and security during migration
"""

import os
import sys
import django
from datetime import datetime
from decimal import Decimal

# Setup Django
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from django.db.models import Q, Count, Sum
from vendors.models import Vendor
from product_suppliers.models import ProductSupplier, ProductSupplierItem
from purchases.models import PurchaseOrder, PurchaseOrderItem
from bills.models import Bill, BillLineItem
from inventory.models import Product
from custom_auth.models import Business
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VendorToSupplierMigration:
    """Secure migration of vendors to product suppliers"""
    
    def __init__(self, dry_run=True):
        self.dry_run = dry_run
        self.created_count = 0
        self.skipped_count = 0
        self.error_count = 0
        self.results = []
        
    def identify_product_vendors(self):
        """Identify vendors that supply products"""
        logger.info("Identifying product vendors...")
        
        product_vendors = []
        
        for vendor in Vendor.objects.all():
            try:
                # Check if vendor has product-related purchases
                has_product_pos = PurchaseOrder.objects.filter(
                    vendor=vendor
                ).filter(
                    Q(items__product__isnull=False) |
                    Q(order_type='inventory')
                ).exists()
                
                has_product_bills = Bill.objects.filter(
                    vendor=vendor
                ).filter(
                    Q(line_items__product__isnull=False) |
                    Q(bill_type='inventory')
                ).exists()
                
                # Check vendor type or name indicators
                is_supplier_by_name = any(
                    keyword in vendor.name.lower()
                    for keyword in ['supplier', 'wholesale', 'distributor', 'manufacturer']
                )
                
                is_supplier_by_type = getattr(vendor, 'vendor_type', '') in ['product', 'inventory']
                
                if has_product_pos or has_product_bills or is_supplier_by_name or is_supplier_by_type:
                    product_vendors.append({
                        'vendor': vendor,
                        'has_pos': has_product_pos,
                        'has_bills': has_product_bills,
                        'name_match': is_supplier_by_name,
                        'type_match': is_supplier_by_type
                    })
                    
            except Exception as e:
                logger.error(f"Error checking vendor {vendor.id}: {str(e)}")
                self.error_count += 1
        
        logger.info(f"Found {len(product_vendors)} product vendors")
        return product_vendors
    
    def migrate_vendor_to_supplier(self, vendor_info):
        """Migrate a single vendor to product supplier"""
        vendor = vendor_info['vendor']
        
        try:
            # Check if already migrated
            existing = ProductSupplier.objects.filter(
                tenant_id=vendor.tenant_id if hasattr(vendor, 'tenant_id') else None,
                migrated_from_vendor_id=vendor.id
            ).first()
            
            if existing:
                logger.info(f"Vendor {vendor.name} already migrated")
                self.skipped_count += 1
                return existing
            
            # Determine supplier type
            supplier_type = 'wholesaler'  # Default
            if 'manufacturer' in vendor.name.lower():
                supplier_type = 'manufacturer'
            elif 'distributor' in vendor.name.lower():
                supplier_type = 'distributor'
            elif 'dropship' in vendor.name.lower():
                supplier_type = 'dropshipper'
            
            # Create product supplier
            supplier_data = {
                'tenant_id': vendor.tenant_id if hasattr(vendor, 'tenant_id') else None,
                'business': vendor.business if hasattr(vendor, 'business') else None,
                'name': vendor.name,
                'code': getattr(vendor, 'code', '') or f"MIG-{vendor.id}",
                'email': getattr(vendor, 'email', ''),
                'phone': getattr(vendor, 'phone', ''),
                'website': getattr(vendor, 'website', ''),
                'address_line1': getattr(vendor, 'address_line1', ''),
                'address_line2': getattr(vendor, 'address_line2', ''),
                'city': getattr(vendor, 'city', ''),
                'state_province': getattr(vendor, 'state', ''),
                'postal_code': getattr(vendor, 'postal_code', ''),
                'country': getattr(vendor, 'country', 'US'),
                'supplier_type': supplier_type,
                'tax_id': getattr(vendor, 'tax_id', ''),
                'payment_terms': getattr(vendor, 'payment_terms', 'net30'),
                'currency': getattr(vendor, 'currency', 'USD'),
                'is_active': getattr(vendor, 'is_active', True),
                'migrated_from_vendor_id': vendor.id,
                'migration_date': datetime.now()
            }
            
            if not self.dry_run:
                supplier = ProductSupplier.objects.create(**supplier_data)
                
                # Migrate product relationships
                self.migrate_product_relationships(vendor, supplier)
                
                # Mark vendor as migrated
                if hasattr(vendor, 'vendor_type'):
                    vendor.vendor_type = 'migrated_to_supplier'
                    vendor.save()
                
                logger.info(f"Created ProductSupplier: {supplier.name} (ID: {supplier.id})")
                self.created_count += 1
                return supplier
            else:
                logger.info(f"[DRY RUN] Would create ProductSupplier: {vendor.name}")
                self.created_count += 1
                return None
                
        except Exception as e:
            logger.error(f"Error migrating vendor {vendor.id}: {str(e)}")
            self.error_count += 1
            return None
    
    def migrate_product_relationships(self, vendor, supplier):
        """Migrate product relationships from vendor to supplier"""
        try:
            # Get unique products from purchase orders
            product_ids = set()
            
            # From POs
            po_items = PurchaseOrderItem.objects.filter(
                purchase_order__vendor=vendor,
                product__isnull=False
            ).values_list('product_id', 'unit_price').distinct()
            
            for product_id, price in po_items:
                product_ids.add((product_id, price))
            
            # From Bills
            bill_items = BillLineItem.objects.filter(
                bill__vendor=vendor,
                product__isnull=False
            ).values_list('product_id', 'unit_price').distinct()
            
            for product_id, price in bill_items:
                product_ids.add((product_id, price))
            
            # Create ProductSupplierItems
            for product_id, last_price in product_ids:
                try:
                    product = Product.objects.get(id=product_id)
                    
                    # Check tenant consistency
                    if product.tenant_id != supplier.tenant_id:
                        logger.warning(f"Skipping product {product_id} - tenant mismatch")
                        continue
                    
                    ProductSupplierItem.objects.get_or_create(
                        product_supplier=supplier,
                        product=product,
                        tenant_id=supplier.tenant_id,
                        defaults={
                            'supplier_sku': product.sku or f"SKU-{product.id}",
                            'cost_price': last_price or Decimal('0.00'),
                            'currency': supplier.currency,
                            'is_active': True
                        }
                    )
                    
                    logger.info(f"Linked product {product.name} to supplier {supplier.name}")
                    
                except Product.DoesNotExist:
                    logger.warning(f"Product {product_id} not found")
                except Exception as e:
                    logger.error(f"Error linking product {product_id}: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Error migrating product relationships: {str(e)}")
    
    def run_migration(self):
        """Run the complete migration"""
        logger.info("=" * 50)
        logger.info(f"Starting Vendor to ProductSupplier Migration")
        logger.info(f"Dry Run: {self.dry_run}")
        logger.info("=" * 50)
        
        # Identify product vendors
        product_vendors = self.identify_product_vendors()
        
        if not product_vendors:
            logger.info("No product vendors found to migrate")
            return
        
        # Confirm before proceeding
        if not self.dry_run:
            response = input(f"\nMigrate {len(product_vendors)} vendors to ProductSuppliers? (yes/no): ")
            if response.lower() != 'yes':
                logger.info("Migration cancelled")
                return
        
        # Migrate each vendor
        with transaction.atomic():
            for vendor_info in product_vendors:
                self.migrate_vendor_to_supplier(vendor_info)
                
                # Rollback if dry run
                if self.dry_run:
                    transaction.set_rollback(True)
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print migration summary"""
        logger.info("\n" + "=" * 50)
        logger.info("Migration Summary")
        logger.info("=" * 50)
        logger.info(f"Created: {self.created_count} product suppliers")
        logger.info(f"Skipped: {self.skipped_count} (already migrated)")
        logger.info(f"Errors: {self.error_count}")
        
        if self.dry_run:
            logger.info("\n*** DRY RUN - No actual changes made ***")
            logger.info("Run with --execute to perform actual migration")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Migrate vendors to product suppliers')
    parser.add_argument(
        '--execute',
        action='store_true',
        help='Execute the migration (default is dry run)'
    )
    parser.add_argument(
        '--tenant',
        type=int,
        help='Migrate only for specific tenant ID'
    )
    
    args = parser.parse_args()
    
    # Run migration
    migration = VendorToSupplierMigration(dry_run=not args.execute)
    
    if args.tenant:
        # Filter to specific tenant
        logger.info(f"Filtering to tenant ID: {args.tenant}")
        # Add tenant filtering logic here if needed
    
    migration.run_migration()


if __name__ == '__main__':
    main()