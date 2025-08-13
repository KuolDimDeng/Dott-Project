"""
Django management command to verify and force fix duplicate SKUs
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.core.cache import cache
from inventory.models import Product
from users.models import User
import redis
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Verify and force fix duplicate SKUs, clearing all caches'

    def handle(self, *args, **options):
        try:
            # Find the user
            user = User.objects.filter(email='kuoldimdeng@outlook.com').first()
            if not user:
                self.stdout.write(self.style.ERROR('User not found: kuoldimdeng@outlook.com'))
                return
            
            self.stdout.write(self.style.SUCCESS(f'Found user: {user.email}'))
            self.stdout.write(f'Tenant ID: {user.tenant_id}')
            
            if not user.tenant_id:
                self.stdout.write(self.style.ERROR('User has no tenant_id'))
                return
            
            # Get ALL products for this user
            all_products = Product.objects.filter(
                tenant_id=user.tenant_id
            ).order_by('created_at')
            
            self.stdout.write(f'\n=== CURRENT STATE ===')
            self.stdout.write(f'Total products: {all_products.count()}')
            
            for p in all_products:
                stock = getattr(p, 'stock_quantity', None) or getattr(p, 'quantity', 0)
                self.stdout.write(f'  ID: {p.id}')
                self.stdout.write(f'  Name: {p.name}')
                self.stdout.write(f'  SKU: {p.sku}')
                self.stdout.write(f'  Price: ${p.price}')
                self.stdout.write(f'  Stock: {stock}')
                self.stdout.write(f'  Created: {p.created_at}')
                self.stdout.write('  ---')
            
            # Find products with duplicate SKUs
            from django.db.models import Count
            duplicate_skus = Product.objects.filter(
                tenant_id=user.tenant_id
            ).values('sku').annotate(
                count=Count('id')
            ).filter(count__gt=1)
            
            if duplicate_skus:
                self.stdout.write(self.style.WARNING(f'\n=== DUPLICATE SKUS FOUND ==='))
                
                for sku_info in duplicate_skus:
                    sku = sku_info['sku']
                    count = sku_info['count']
                    self.stdout.write(f'SKU "{sku}" has {count} products')
                    
                    # Get all products with this SKU
                    duplicates = Product.objects.filter(
                        tenant_id=user.tenant_id,
                        sku=sku
                    ).order_by('created_at')
                    
                    # Fix the duplicates
                    with transaction.atomic():
                        for i, product in enumerate(duplicates):
                            if i > 0:  # Skip the first one
                                # Generate unique SKU
                                new_sku = f"{sku}{i+5}"
                                self.stdout.write(f'  Updating product {i+1}: {product.name}')
                                self.stdout.write(f'    Old SKU: {product.sku}')
                                self.stdout.write(f'    New SKU: {new_sku}')
                                
                                # Force update bypassing any signals
                                Product.objects.filter(id=product.id).update(sku=new_sku)
                                self.stdout.write(self.style.SUCCESS(f'    ✅ Updated!'))
            else:
                self.stdout.write(self.style.SUCCESS('\n✅ No duplicate SKUs found!'))
            
            # Clear Django cache
            try:
                cache.clear()
                self.stdout.write(self.style.SUCCESS('\n✅ Django cache cleared'))
            except Exception as e:
                self.stdout.write(f'Warning: Could not clear Django cache: {e}')
            
            # Clear Redis cache
            try:
                if hasattr(settings, 'REDIS_URL') and settings.REDIS_URL:
                    r = redis.from_url(settings.REDIS_URL)
                    # Only clear product-related keys, not sessions
                    keys = r.keys('product:*')
                    if keys:
                        r.delete(*keys)
                        self.stdout.write(self.style.SUCCESS(f'✅ Cleared {len(keys)} product cache keys from Redis'))
                    else:
                        self.stdout.write('No product cache keys found in Redis')
            except Exception as e:
                self.stdout.write(f'Warning: Could not clear Redis cache: {e}')
            
            # Verify the final state
            self.stdout.write(self.style.SUCCESS('\n=== FINAL STATE ==='))
            final_products = Product.objects.filter(
                tenant_id=user.tenant_id
            ).order_by('created_at')
            
            for p in final_products:
                stock = getattr(p, 'stock_quantity', None) or getattr(p, 'quantity', 0)
                self.stdout.write(f'  {p.name}: SKU={p.sku}, Price=${p.price}, Stock={stock}')
            
            self.stdout.write(self.style.SUCCESS('\n✅ Verification complete!'))
            self.stdout.write('\nIf products still show duplicates in the UI:')
            self.stdout.write('1. Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)')
            self.stdout.write('2. Clear browser cache and cookies')
            self.stdout.write('3. Log out and log back in')
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))
            import traceback
            self.stdout.write(traceback.format_exc())