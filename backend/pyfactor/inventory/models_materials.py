"""
Materials model for inventory management.
Materials are items used to create products or provide services.
They are distinct from products which are sold to customers.
"""
import uuid
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.utils import timezone
from custom_auth.models import TenantAwareModel, TenantManager
from audit.mixins import AuditMixin


class Material(AuditMixin, TenantAwareModel):
    """
    Material model for supplies, raw materials, and tools used in production or services.
    This is separate from Product model which represents finished goods for sale.
    """
    MATERIAL_TYPE_CHOICES = [
        ('raw_material', 'Raw Material'),
        ('consumable', 'Consumable Supply'),
        ('tool', 'Tool/Equipment'),
        ('part', 'Part/Component'),
        ('packaging', 'Packaging Material'),
        ('other', 'Other'),
    ]
    
    UNIT_CHOICES = [
        # Weight units
        ('kg', 'Kilogram'),
        ('g', 'Gram'),
        ('lb', 'Pound'),
        ('oz', 'Ounce'),
        # Volume units
        ('l', 'Liter'),
        ('ml', 'Milliliter'),
        ('gal', 'Gallon'),
        ('fl_oz', 'Fluid Ounce'),
        # Length units
        ('m', 'Meter'),
        ('cm', 'Centimeter'),
        ('ft', 'Feet'),
        ('in', 'Inch'),
        # Count units
        ('unit', 'Unit'),
        ('piece', 'Piece'),
        ('box', 'Box'),
        ('pack', 'Pack'),
        ('roll', 'Roll'),
        ('sheet', 'Sheet'),
        # Other
        ('custom', 'Custom Unit'),
    ]
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, db_index=True)
    sku = models.CharField(
        max_length=100, 
        unique=True, 
        db_index=True,
        help_text="Stock Keeping Unit - unique identifier for this material"
    )
    description = models.TextField(blank=True, null=True)
    material_type = models.CharField(
        max_length=20, 
        choices=MATERIAL_TYPE_CHOICES,
        default='consumable',
        db_index=True
    )
    
    # Inventory Information
    quantity_in_stock = models.DecimalField(
        max_digits=12, 
        decimal_places=3,
        default=0,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Current quantity in stock"
    )
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='unit')
    custom_unit = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text="Custom unit name if 'custom' is selected"
    )
    reorder_level = models.DecimalField(
        max_digits=12, 
        decimal_places=3,
        default=10,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Minimum quantity before reordering"
    )
    reorder_quantity = models.DecimalField(
        max_digits=12, 
        decimal_places=3,
        default=0,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Quantity to order when stock is low"
    )
    
    # Cost Information
    unit_cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Cost per unit from supplier"
    )
    last_purchase_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Price from last purchase"
    )
    average_cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Weighted average cost"
    )
    
    # Billing Information (for materials that can be billed to customers)
    is_billable = models.BooleanField(
        default=False,
        help_text="Can this material be billed to customers when used?"
    )
    markup_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Markup percentage when billing to customers"
    )
    billing_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Price when billing to customers (auto-calculated if markup is set)"
    )
    
    # Supplier Information
    supplier = models.ForeignKey(
        'Supplier', 
        on_delete=models.SET_NULL, 
        null=True,
        blank=True,
        related_name='materials'
    )
    supplier_sku = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text="Supplier's SKU for this material"
    )
    lead_time_days = models.IntegerField(
        default=0,
        help_text="Lead time in days from supplier"
    )
    
    # Storage Information
    location = models.ForeignKey(
        'Location', 
        on_delete=models.SET_NULL, 
        null=True,
        blank=True,
        related_name='materials'
    )
    storage_requirements = models.TextField(
        blank=True, 
        null=True,
        help_text="Special storage requirements (temperature, humidity, etc.)"
    )
    
    # Tracking Information
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    last_used_date = models.DateTimeField(blank=True, null=True)
    last_purchase_date = models.DateTimeField(blank=True, null=True)
    
    # Notes
    notes = models.TextField(blank=True, null=True)
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        db_table = 'inventory_material'
        ordering = ['name']
        indexes = [
            models.Index(fields=['tenant_id', 'sku']),
            models.Index(fields=['tenant_id', 'material_type']),
            models.Index(fields=['tenant_id', 'is_active']),
            models.Index(fields=['tenant_id', 'supplier']),
            models.Index(fields=['quantity_in_stock', 'reorder_level']),
        ]
        unique_together = [['tenant_id', 'sku']]
    
    def __str__(self):
        return f"{self.name} ({self.sku})"
    
    def save(self, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"💾 [Material.save] === MATERIAL SAVE START ===")
        logger.info(f"💾 [Material.save] Material: {self.name} (ID: {self.id})")
        logger.info(f"💾 [Material.save] Current tenant_id: {self.tenant_id}")
        
        # Auto-calculate billing price if markup is set
        if self.is_billable and self.markup_percentage > 0:
            markup_multiplier = 1 + (self.markup_percentage / 100)
            self.billing_price = self.unit_cost * markup_multiplier
        
        # Ensure custom_unit is set if unit is 'custom'
        if self.unit == 'custom' and not self.custom_unit:
            self.unit = 'unit'  # Default to 'unit' if custom not specified
        
        logger.info(f"💾 [Material.save] Calling super().save()")
        super().save(*args, **kwargs)
        
        logger.info(f"💾 [Material.save] After save - tenant_id: {self.tenant_id}")
        logger.info(f"💾 [Material.save] === MATERIAL SAVE END ===")
    
    @property
    def display_unit(self):
        """Return the display name for the unit"""
        if self.unit == 'custom' and self.custom_unit:
            return self.custom_unit
        return self.get_unit_display()
    
    @property
    def stock_value(self):
        """Calculate total value of stock"""
        return self.quantity_in_stock * self.unit_cost
    
    @property
    def is_low_stock(self):
        """Check if material is below reorder level"""
        return self.quantity_in_stock <= self.reorder_level
    
    def use_material(self, quantity, notes=None):
        """
        Use material from stock and create a transaction record.
        Returns True if successful, raises exception if insufficient stock.
        """
        if quantity > self.quantity_in_stock:
            raise ValueError(f"Insufficient stock. Available: {self.quantity_in_stock}, Requested: {quantity}")
        
        self.quantity_in_stock -= quantity
        self.last_used_date = timezone.now()
        self.save()
        
        # Create transaction record
        MaterialTransaction.objects.create(
            material=self,
            transaction_type='use',
            quantity=quantity,
            notes=notes or f"Material used",
            balance_after=self.quantity_in_stock
        )
        
        return True
    
    def add_stock(self, quantity, unit_cost=None, notes=None):
        """
        Add material to stock and create a transaction record.
        Optionally update unit cost and average cost.
        """
        old_quantity = self.quantity_in_stock
        self.quantity_in_stock += quantity
        
        # Update costs if provided
        if unit_cost is not None:
            self.last_purchase_price = unit_cost
            self.last_purchase_date = timezone.now()
            
            # Calculate weighted average cost
            if old_quantity > 0 and self.average_cost:
                total_value = (old_quantity * self.average_cost) + (quantity * unit_cost)
                self.average_cost = total_value / self.quantity_in_stock
            else:
                self.average_cost = unit_cost
            
            # Update unit cost to latest purchase price
            self.unit_cost = unit_cost
        
        self.save()
        
        # Create transaction record
        MaterialTransaction.objects.create(
            material=self,
            transaction_type='purchase',
            quantity=quantity,
            unit_cost=unit_cost,
            notes=notes or f"Stock added",
            balance_after=self.quantity_in_stock
        )
        
        return True


class MaterialTransaction(models.Model):
    """
    Track all material movements (purchases, usage, adjustments)
    """
    TRANSACTION_TYPE_CHOICES = [
        ('purchase', 'Purchase'),
        ('use', 'Used in Job/Service'),
        ('return', 'Returned to Supplier'),
        ('adjustment', 'Inventory Adjustment'),
        ('transfer', 'Transfer between Locations'),
        ('waste', 'Waste/Damage'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    material = models.ForeignKey(
        Material, 
        on_delete=models.CASCADE, 
        related_name='transactions'
    )
    transaction_type = models.CharField(
        max_length=20, 
        choices=TRANSACTION_TYPE_CHOICES
    )
    quantity = models.DecimalField(
        max_digits=12, 
        decimal_places=3,
        help_text="Quantity involved in transaction (positive for additions, negative for removals)"
    )
    unit_cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Cost per unit for this transaction"
    )
    total_cost = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Total cost of this transaction"
    )
    balance_after = models.DecimalField(
        max_digits=12, 
        decimal_places=3,
        help_text="Stock balance after this transaction"
    )
    
    # Reference fields
    job = models.ForeignKey(
        'jobs.Job', 
        on_delete=models.SET_NULL, 
        null=True,
        blank=True,
        related_name='material_transactions',
        help_text="Job this material was used for"
    )
    purchase_order = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text="Purchase order reference"
    )
    
    # Tracking
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        'custom_auth.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='material_transactions_created'
    )
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'inventory_material_transaction'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['material', 'created_at']),
            models.Index(fields=['transaction_type', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.material.name} ({self.quantity})"
    
    def save(self, *args, **kwargs):
        # Calculate total cost if not provided
        if self.unit_cost and not self.total_cost:
            self.total_cost = abs(self.quantity) * self.unit_cost
        
        super().save(*args, **kwargs)