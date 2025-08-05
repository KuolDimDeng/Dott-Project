# Inventory Valuation Methods based on Accounting Standards
from django.core.exceptions import ValidationError
from decimal import Decimal
from django.db import models, transaction as db_transaction
from django.utils import timezone

class InventoryValuationMethod:
    """Handles inventory valuation based on accounting standards"""
    
    FIFO = 'FIFO'
    LIFO = 'LIFO'
    WEIGHTED_AVERAGE = 'WEIGHTED_AVERAGE'
    
    @classmethod
    def get_allowed_methods(cls, accounting_standard):
        """Return allowed inventory valuation methods based on accounting standard"""
        if accounting_standard == 'GAAP':
            return [
                (cls.FIFO, 'First In, First Out (FIFO)'),
                (cls.LIFO, 'Last In, First Out (LIFO)'),
                (cls.WEIGHTED_AVERAGE, 'Weighted Average'),
            ]
        else:  # IFRS
            return [
                (cls.FIFO, 'First In, First Out (FIFO)'),
                (cls.WEIGHTED_AVERAGE, 'Weighted Average'),
            ]
    
    @classmethod
    def validate_method(cls, method, accounting_standard):
        """Validate if the inventory method is allowed under the accounting standard"""
        allowed_methods = [m[0] for m in cls.get_allowed_methods(accounting_standard)]
        if method not in allowed_methods:
            raise ValidationError(
                f"Inventory valuation method '{method}' is not allowed under {accounting_standard}. "
                f"Allowed methods: {', '.join(allowed_methods)}"
            )
        return True


class InventoryLayer(models.Model):
    """
    Tracks individual inventory purchases for FIFO/LIFO calculations.
    Only used when FIFO or LIFO methods are selected.
    """
    material = models.ForeignKey('inventory.Material', on_delete=models.CASCADE, related_name='inventory_layers')
    purchase_date = models.DateTimeField(default=timezone.now)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    remaining_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True, help_text='Purchase order or reference number')
    
    class Meta:
        ordering = ['purchase_date']  # For FIFO
        indexes = [
            models.Index(fields=['material', 'purchase_date']),
            models.Index(fields=['material', '-purchase_date']),  # For LIFO
        ]
    
    def __str__(self):
        return f"{self.material.name} - {self.quantity} @ {self.unit_cost} ({self.purchase_date})"


class InventoryValuation:
    """Handles different inventory valuation calculations"""
    
    @staticmethod
    def calculate_fifo_cost(material, quantity_to_consume):
        """Calculate cost using FIFO method"""
        total_cost = Decimal('0')
        remaining_to_consume = quantity_to_consume
        
        # Get layers ordered by date (oldest first)
        layers = material.inventory_layers.filter(
            remaining_quantity__gt=0
        ).order_by('purchase_date')
        
        with db_transaction.atomic():
            for layer in layers:
                if remaining_to_consume <= 0:
                    break
                
                consume_from_layer = min(layer.remaining_quantity, remaining_to_consume)
                cost_from_layer = consume_from_layer * layer.unit_cost
                
                total_cost += cost_from_layer
                layer.remaining_quantity -= consume_from_layer
                layer.save()
                
                remaining_to_consume -= consume_from_layer
        
        if remaining_to_consume > 0:
            raise ValidationError(f"Insufficient inventory. Need {remaining_to_consume} more units.")
        
        return total_cost / quantity_to_consume if quantity_to_consume > 0 else Decimal('0')
    
    @staticmethod
    def calculate_lifo_cost(material, quantity_to_consume):
        """Calculate cost using LIFO method"""
        total_cost = Decimal('0')
        remaining_to_consume = quantity_to_consume
        
        # Get layers ordered by date (newest first)
        layers = material.inventory_layers.filter(
            remaining_quantity__gt=0
        ).order_by('-purchase_date')
        
        with db_transaction.atomic():
            for layer in layers:
                if remaining_to_consume <= 0:
                    break
                
                consume_from_layer = min(layer.remaining_quantity, remaining_to_consume)
                cost_from_layer = consume_from_layer * layer.unit_cost
                
                total_cost += cost_from_layer
                layer.remaining_quantity -= consume_from_layer
                layer.save()
                
                remaining_to_consume -= consume_from_layer
        
        if remaining_to_consume > 0:
            raise ValidationError(f"Insufficient inventory. Need {remaining_to_consume} more units.")
        
        return total_cost / quantity_to_consume if quantity_to_consume > 0 else Decimal('0')
    
    @staticmethod
    def calculate_weighted_average_cost(material, quantity_to_consume):
        """Calculate cost using weighted average method"""
        # This is already implemented in the Material model
        return material.average_cost or material.unit_cost
    
    @classmethod
    def get_unit_cost(cls, material, quantity, method):
        """Get unit cost based on valuation method"""
        if method == InventoryValuationMethod.FIFO:
            return cls.calculate_fifo_cost(material, quantity)
        elif method == InventoryValuationMethod.LIFO:
            return cls.calculate_lifo_cost(material, quantity)
        else:  # WEIGHTED_AVERAGE
            return cls.calculate_weighted_average_cost(material, quantity)
    
    @classmethod
    def record_purchase(cls, material, quantity, unit_cost, method, reference=''):
        """Record a purchase based on valuation method"""
        if method in [InventoryValuationMethod.FIFO, InventoryValuationMethod.LIFO]:
            # Create inventory layer for FIFO/LIFO
            InventoryLayer.objects.create(
                material=material,
                quantity=quantity,
                remaining_quantity=quantity,
                unit_cost=unit_cost,
                reference=reference
            )
        
        # Update material quantity and average cost
        material.add_stock(quantity, unit_cost)