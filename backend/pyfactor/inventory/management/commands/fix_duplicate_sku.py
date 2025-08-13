"""
Django management command to fix duplicate SKUs for products
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from inventory.models import Product
from users.models import User
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Fix duplicate SKU by adding 6 to one of the duplicate products'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-email',
            type=str,
            default='kuoldimdeng@outlook.com',
            help='Email of the user whose products to fix'
        )
        parser.add_argument(
            '--sku',
            type=str,
            default='Test1234545',
            help='The duplicate SKU to fix'
        )

    def handle(self, *args, **options):
        user_email = options['user_email']
        duplicate_sku = options['sku']
        
        try:
            # Find the user
            user = User.objects.filter(email=user_email).first()
            if not user:
                self.stdout.write(self.style.ERROR(f'User not found: {user_email}'))
                return
            
            self.stdout.write(self.style.SUCCESS(f'Found user: {user.email}'))
            
            if not user.tenant_id:
                self.stdout.write(self.style.ERROR('User has no tenant_id'))
                return
            
            # Get products with duplicate SKU
            products = Product.objects.filter(
                tenant_id=user.tenant_id,
                sku=duplicate_sku
            ).order_by('created_at')
            
            self.stdout.write(f'Found {products.count()} products with SKU {duplicate_sku}')
            
            if products.count() < 2:
                self.stdout.write(self.style.WARNING('No duplicates found to fix'))
                return
            
            # Update the second product's SKU by adding 6
            with transaction.atomic():
                second_product = products[1]
                new_sku = f"{duplicate_sku}6"
                
                self.stdout.write(f'Updating product "{second_product.name}" (ID: {second_product.id})')
                self.stdout.write(f'  Old SKU: {second_product.sku}')
                self.stdout.write(f'  New SKU: {new_sku}')
                
                second_product.sku = new_sku
                second_product.save()
                
                self.stdout.write(self.style.SUCCESS(f'✅ Successfully updated SKU to {new_sku}'))
                
                # Verify the fix
                self.stdout.write('\nVerifying all products for this user:')
                all_products = Product.objects.filter(
                    tenant_id=user.tenant_id
                ).order_by('created_at')
                
                for p in all_products:
                    # Use the correct field name for stock quantity
                    stock = getattr(p, 'quantity_in_stock', None) or getattr(p, 'stock_quantity', None) or getattr(p, 'quantity', 0)
                    self.stdout.write(f'  - {p.name}: SKU={p.sku}, Price=${p.price}, Stock={stock}')
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error fixing duplicate SKU: {str(e)}'))
            import traceback
            self.stdout.write(traceback.format_exc())