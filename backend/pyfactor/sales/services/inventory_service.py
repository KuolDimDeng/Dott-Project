"""
Inventory Management Service for POS Operations
Handles stock reduction, validation, and low stock alerts.
"""

from decimal import Decimal
from django.db import transaction as db_transaction
from django.core.exceptions import ValidationError
from inventory.models import Product
from pyfactor.logging_config import get_logger

logger = get_logger()


class InventoryService:
    """
    Service class for managing inventory operations during POS transactions.
    """
    
    @staticmethod
    def validate_stock_availability(items, allow_backorders=False):
        """
        Validate that all products have sufficient stock.
        
        Args:
            items: List of dicts with 'item', 'quantity', 'type', 'is_backorder' keys
            allow_backorders: If True, allows negative inventory for backorder items
            
        Returns:
            List of validation errors (empty if all valid)
            
        Raises:
            ValidationError: If stock is insufficient and backorders not allowed
        """
        errors = []
        backorder_info = []
        
        for item_data in items:
            if item_data['type'] == 'product':
                product = item_data['item']
                requested_qty = item_data['quantity']
                is_backorder = item_data.get('is_backorder', False)
                
                # Check if product tracks inventory
                if hasattr(product, 'quantity'):
                    available_qty = product.quantity or 0
                    
                    if available_qty < requested_qty:
                        if allow_backorders or is_backorder:
                            # Track backorder info but don't error
                            backorder_qty = requested_qty - available_qty
                            backorder_info.append({
                                'product_id': str(product.id),
                                'product_name': product.name,
                                'available': available_qty,
                                'requested': requested_qty,
                                'backorder_quantity': backorder_qty,
                                'is_full_backorder': available_qty == 0
                            })
                            logger.info(f"Backorder allowed for {product.name}: {backorder_qty} units")
                        else:
                            errors.append({
                                'product_id': str(product.id),
                                'product_name': product.name,
                                'available': available_qty,
                                'requested': requested_qty,
                                'error': f"Insufficient stock for {product.name}. Available: {available_qty}, Requested: {requested_qty}"
                            })
        
        if errors:
            error_messages = [error['error'] for error in errors]
            raise ValidationError('; '.join(error_messages))
        
        return backorder_info  # Return backorder info instead of errors
    
    @staticmethod
    def reduce_stock(items, transaction_ref=None, allow_negative=False):
        """
        Reduce stock quantities for products in the transaction.
        
        Args:
            items: List of validated item data
            transaction_ref: Reference to the POS transaction (for logging)
            allow_negative: If True, allows negative inventory for backorders
            
        Returns:
            Dict with updated product quantities and backorder info
            
        Raises:
            ValidationError: If stock reduction fails
        """
        updated_products = {}
        backorder_items = []
        
        try:
            with db_transaction.atomic():
                for item_data in items:
                    if item_data['type'] == 'product':
                        product = item_data['item']
                        quantity_to_reduce = item_data['quantity']
                        is_backorder = item_data.get('is_backorder', False)
                        
                        # Lock the product row for update to prevent race conditions
                        product = Product.objects.select_for_update().get(pk=product.pk)
                        
                        # Check if product tracks inventory
                        if hasattr(product, 'quantity'):
                            old_quantity = product.quantity or 0
                            
                            # Calculate backorder quantity if needed
                            backorder_qty = 0
                            if old_quantity < quantity_to_reduce:
                                if not (allow_negative or is_backorder):
                                    raise ValidationError(
                                        f"Insufficient stock for {product.name}. "
                                        f"Available: {old_quantity}, Requested: {quantity_to_reduce}"
                                    )
                                backorder_qty = quantity_to_reduce - old_quantity
                                backorder_items.append({
                                    'product': product,
                                    'backorder_quantity': backorder_qty,
                                    'total_requested': quantity_to_reduce
                                })
                            
                            # Reduce the stock (can go negative for backorders)
                            new_quantity = old_quantity - quantity_to_reduce
                            product.quantity = new_quantity
                            product.save()
                            
                            # Track the change
                            updated_products[str(product.id)] = {
                                'product_name': product.name,
                                'old_quantity': old_quantity,
                                'new_quantity': new_quantity,
                                'quantity_reduced': quantity_to_reduce
                            }
                            
                            logger.info(
                                f"Stock reduced for product {product.name} (ID: {product.id}). "
                                f"Old: {old_quantity}, New: {new_quantity}, Reduced: {quantity_to_reduce}. "
                                f"Backorder: {backorder_qty if backorder_qty > 0 else 'No'}. "
                                f"Transaction: {transaction_ref}"
                            )
                
                return {
                    'updated_products': updated_products,
                    'backorder_items': backorder_items
                }
                
        except Exception as e:
            logger.error(f"Error reducing stock for transaction {transaction_ref}: {str(e)}")
            raise ValidationError(f"Failed to reduce stock: {str(e)}")
    
    @staticmethod
    def restore_stock(items, transaction_ref=None):
        """
        Restore stock quantities (for refunds/voids).
        
        Args:
            items: List of item data to restore
            transaction_ref: Reference to the transaction (for logging)
            
        Returns:
            Dict with restored product quantities
        """
        restored_products = {}
        
        try:
            with db_transaction.atomic():
                for item_data in items:
                    if item_data['type'] == 'product':
                        product = item_data['item']
                        quantity_to_restore = item_data['quantity']
                        
                        # Lock the product row for update
                        product = Product.objects.select_for_update().get(pk=product.pk)
                        
                        # Check if product tracks inventory
                        if hasattr(product, 'quantity'):
                            old_quantity = product.quantity or 0
                            new_quantity = old_quantity + quantity_to_restore
                            
                            product.quantity = new_quantity
                            product.save()
                            
                            # Track the change
                            restored_products[str(product.id)] = {
                                'product_name': product.name,
                                'old_quantity': old_quantity,
                                'new_quantity': new_quantity,
                                'quantity_restored': quantity_to_restore
                            }
                            
                            logger.info(
                                f"Stock restored for product {product.name} (ID: {product.id}). "
                                f"Old: {old_quantity}, New: {new_quantity}, Restored: {quantity_to_restore}. "
                                f"Transaction: {transaction_ref}"
                            )
                
                return restored_products
                
        except Exception as e:
            logger.error(f"Error restoring stock for transaction {transaction_ref}: {str(e)}")
            raise ValidationError(f"Failed to restore stock: {str(e)}")
    
    @staticmethod
    def check_low_stock_alerts(items, low_stock_threshold=None):
        """
        Check for products that are now at or below low stock thresholds.
        
        Args:
            items: List of item data that were processed
            low_stock_threshold: Global threshold (default: 10)
            
        Returns:
            List of products with low stock alerts
        """
        if low_stock_threshold is None:
            low_stock_threshold = 10
        
        low_stock_products = []
        
        for item_data in items:
            if item_data['type'] == 'product':
                product = item_data['item']
                
                if hasattr(product, 'quantity'):
                    current_quantity = product.quantity or 0
                    product_threshold = getattr(product, 'reorder_level', low_stock_threshold)
                    
                    if current_quantity <= product_threshold:
                        low_stock_products.append({
                            'product_id': str(product.id),
                            'product_name': product.name,
                            'current_quantity': current_quantity,
                            'threshold': product_threshold,
                            'sku': getattr(product, 'sku', ''),
                            'needs_reorder': current_quantity <= product_threshold
                        })
        
        if low_stock_products:
            logger.warning(f"Low stock alert for {len(low_stock_products)} products: {[p['product_name'] for p in low_stock_products]}")
        
        return low_stock_products
    
    @staticmethod
    def get_stock_summary(product_ids):
        """
        Get current stock levels for specified products.
        
        Args:
            product_ids: List of product IDs
            
        Returns:
            Dict with product stock information
        """
        try:
            products = Product.objects.filter(id__in=product_ids)
            stock_summary = {}
            
            for product in products:
                stock_summary[str(product.id)] = {
                    'product_name': product.name,
                    'sku': getattr(product, 'sku', ''),
                    'current_quantity': getattr(product, 'quantity', 0),
                    'reorder_level': getattr(product, 'reorder_level', 10),
                    'is_low_stock': (getattr(product, 'quantity', 0) or 0) <= (getattr(product, 'reorder_level', 10) or 10)
                }
            
            return stock_summary
            
        except Exception as e:
            logger.error(f"Error getting stock summary: {str(e)}")
            return {}
    
    @staticmethod
    def validate_product_availability(product_id):
        """
        Validate that a product exists and is available for sale.
        
        Args:
            product_id: Product UUID
            
        Returns:
            Product instance if valid
            
        Raises:
            ValidationError: If product is not available
        """
        try:
            product = Product.objects.get(pk=product_id)
            
            # Check if product is active
            if hasattr(product, 'is_active') and not product.is_active:
                raise ValidationError(f"Product {product.name} is not active")
            
            return product
            
        except Product.DoesNotExist:
            raise ValidationError(f"Product with ID {product_id} does not exist")