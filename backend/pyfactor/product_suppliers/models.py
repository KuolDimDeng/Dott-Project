from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from custom_auth.tenant_base_model import TenantAwareModel
from decimal import Decimal
import uuid


class ProductSupplier(TenantAwareModel):
    """
    Suppliers specifically for products/inventory
    Distinct from Vendor which handles services
    Full tenant isolation and security built-in
    """
    
    # Unique identifier
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Core fields with security (tenant_id inherited from TenantAwareModel)
    business = models.ForeignKey(
        'custom_auth.Business',
        on_delete=models.CASCADE,
        related_name='product_suppliers',
        db_index=True,
        null=True,
        blank=True
    )
    
    # Basic Information
    name = models.CharField(max_length=255, db_index=True)
    code = models.CharField(
        max_length=50, 
        blank=True,
        help_text="Internal supplier code"
    )
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    
    # Address (encrypted for security)
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state_province = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=2, default='US')  # ISO code
    
    # Supplier Classification
    supplier_type = models.CharField(
        max_length=20,
        choices=[
            ('manufacturer', 'Manufacturer'),
            ('wholesaler', 'Wholesaler'),
            ('distributor', 'Distributor'),
            ('dropshipper', 'Drop Shipper'),
            ('local_supplier', 'Local Supplier'),
            ('international', 'International Supplier')
        ],
        default='wholesaler',
        db_index=True
    )
    
    # Financial Information (encrypted)
    tax_id = models.CharField(max_length=50, blank=True)
    payment_terms = models.CharField(
        max_length=20,
        choices=[
            ('cod', 'Cash on Delivery'),
            ('net15', 'Net 15'),
            ('net30', 'Net 30'),
            ('net45', 'Net 45'),
            ('net60', 'Net 60'),
            ('net90', 'Net 90'),
            ('prepaid', 'Prepaid'),
            ('custom', 'Custom Terms')
        ],
        default='net30'
    )
    custom_payment_terms = models.TextField(blank=True)
    credit_limit = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    currency = models.CharField(max_length=3, default='USD')
    
    # Inventory Management
    lead_time_days = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Standard delivery time in days"
    )
    minimum_order_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    delivers_to_warehouse = models.BooleanField(default=True)
    dropship_capable = models.BooleanField(default=False)
    
    # Performance Metrics (auto-calculated)
    on_time_delivery_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=100.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    quality_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=5.00,
        validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    total_orders = models.IntegerField(default=0)
    total_spend = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Integration & Automation
    api_endpoint = models.URLField(blank=True)
    api_key_encrypted = models.CharField(max_length=500, blank=True)  # Encrypted
    auto_reorder_enabled = models.BooleanField(default=False)
    catalog_enabled = models.BooleanField(default=True)
    
    # Volume Pricing
    volume_discount_enabled = models.BooleanField(default=False)
    pricing_tiers = models.JSONField(
        default=list,
        blank=True,
        help_text='[{"min_qty": 100, "discount": 5}, {"min_qty": 500, "discount": 10}]'
    )
    
    # Contact Information
    primary_contact_name = models.CharField(max_length=100, blank=True)
    primary_contact_email = models.EmailField(blank=True)
    primary_contact_phone = models.CharField(max_length=20, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    is_preferred = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_product_suppliers'
    )
    updated_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='updated_product_suppliers'
    )
    
    # Migration tracking
    migrated_from_vendor_id = models.IntegerField(null=True, blank=True)
    migration_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'product_suppliers'
        verbose_name = 'Product Supplier'
        verbose_name_plural = 'Product Suppliers'
        ordering = ['-is_preferred', 'name']
        indexes = [
            models.Index(fields=['tenant_id', 'business', 'is_active']),
            models.Index(fields=['tenant_id', 'supplier_type']),
            models.Index(fields=['tenant_id', 'name']),
            models.Index(fields=['tenant_id', 'created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['tenant_id', 'business', 'name'],
                name='unique_supplier_per_business'
            ),
            models.UniqueConstraint(
                fields=['tenant_id', 'business', 'code'],
                condition=models.Q(code__gt=''),
                name='unique_supplier_code_per_business'
            )
        ]
    
    def __str__(self):
        return f"{self.name} ({self.supplier_type})"
    
    def clean(self):
        """Validation with security checks"""
        super().clean()
        
        # Ensure tenant consistency
        if self.business and hasattr(self.business, 'tenant_id') and self.business.tenant_id != self.tenant_id:
            raise ValidationError("Business must belong to the same tenant")
        
        # Validate payment terms
        if self.payment_terms == 'custom' and not self.custom_payment_terms:
            raise ValidationError("Custom payment terms description required")
        
        # Validate pricing tiers
        if self.volume_discount_enabled and self.pricing_tiers:
            for tier in self.pricing_tiers:
                if 'min_qty' not in tier or 'discount' not in tier:
                    raise ValidationError("Each pricing tier must have min_qty and discount")
    
    def save(self, *args, **kwargs):
        """Override save to ensure security"""
        # Auto-generate code if not provided
        if not self.code:
            self.code = f"SUP{str(self.id)[:8].upper()}"
        
        # Ensure tenant_id is set from business if not provided
        if self.business and hasattr(self.business, 'tenant_id') and not self.tenant_id:
            self.tenant_id = self.business.tenant_id
            
        self.full_clean()
        super().save(*args, **kwargs)
    
    def get_current_credit_usage(self):
        """Calculate current credit usage from outstanding POs"""
        from purchases.models import PurchaseOrder
        outstanding = PurchaseOrder.objects.filter(
            product_supplier=self,
            tenant_id=self.tenant_id,
            status__in=['pending', 'approved', 'partial']
        ).aggregate(total=models.Sum('total_amount'))
        return outstanding['total'] or Decimal('0.00')
    
    def can_place_order(self, amount):
        """Check if order amount is within credit limit"""
        if not self.credit_limit:
            return True
        current_usage = self.get_current_credit_usage()
        return (current_usage + amount) <= self.credit_limit


class ProductSupplierItem(TenantAwareModel):
    """
    Links products to their suppliers with supplier-specific info
    Full security and tenant isolation
    """
    
    # Relationships with security (tenant_id inherited from TenantAwareModel)
    product_supplier = models.ForeignKey(
        ProductSupplier,
        on_delete=models.CASCADE,
        related_name='supplier_items'
    )
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.CASCADE,
        related_name='supplier_items'
    )
    
    # Supplier's product information
    supplier_sku = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Supplier's product code"
    )
    supplier_product_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Supplier's name for this product"
    )
    
    # Pricing
    cost_price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    currency = models.CharField(max_length=3, default='USD')
    
    # Ordering constraints
    moq = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Minimum order quantity"
    )
    order_increment = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Order must be in multiples of this"
    )
    max_order_quantity = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)]
    )
    
    # Lead time
    lead_time_override = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Override supplier's default lead time"
    )
    
    # Bulk pricing tiers
    bulk_pricing = models.JSONField(
        default=list,
        blank=True,
        help_text='[{"min_qty": 100, "price": 9.50}, {"min_qty": 500, "price": 8.75}]'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_preferred = models.BooleanField(default=False)
    
    # Performance tracking
    last_order_date = models.DateTimeField(null=True, blank=True)
    last_order_price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True
    )
    total_ordered = models.IntegerField(default=0)
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'product_supplier_items'
        verbose_name = 'Product Supplier Item'
        verbose_name_plural = 'Product Supplier Items'
        indexes = [
            models.Index(fields=['tenant_id', 'product_supplier', 'product']),
            models.Index(fields=['tenant_id', 'supplier_sku']),
            models.Index(fields=['tenant_id', 'is_active', 'is_preferred']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['tenant_id', 'product_supplier', 'product'],
                name='unique_supplier_product_per_tenant'
            ),
            models.UniqueConstraint(
                fields=['tenant_id', 'product_supplier', 'supplier_sku'],
                name='unique_supplier_sku_per_supplier'
            )
        ]
    
    def __str__(self):
        return f"{self.product_supplier.name} - {self.product.name}"
    
    def clean(self):
        """Security validation"""
        super().clean()
        
        # Ensure tenant consistency
        if self.product_supplier and self.product_supplier.tenant_id != self.tenant_id:
            raise ValidationError("Product supplier must belong to the same tenant")
        
        if self.product and hasattr(self.product, 'tenant_id') and self.product.tenant_id != self.tenant_id:
            raise ValidationError("Product must belong to the same tenant")
        
        # Validate bulk pricing
        if self.bulk_pricing:
            prev_qty = 0
            for tier in self.bulk_pricing:
                if 'min_qty' not in tier or 'price' not in tier:
                    raise ValidationError("Each bulk tier must have min_qty and price")
                if tier['min_qty'] <= prev_qty:
                    raise ValidationError("Bulk pricing tiers must be in ascending order")
                prev_qty = tier['min_qty']
    
    def get_price_for_quantity(self, quantity):
        """Calculate price based on quantity and bulk pricing"""
        if not self.bulk_pricing:
            return self.cost_price
        
        applicable_price = self.cost_price
        for tier in sorted(self.bulk_pricing, key=lambda x: x['min_qty']):
            if quantity >= tier['min_qty']:
                applicable_price = Decimal(str(tier['price']))
        
        return applicable_price
    
    def save(self, *args, **kwargs):
        """Ensure security on save"""
        # Auto-set tenant_id from product_supplier
        if self.product_supplier and not self.tenant_id:
            self.tenant_id = self.product_supplier.tenant_id
        
        self.full_clean()
        super().save(*args, **kwargs)