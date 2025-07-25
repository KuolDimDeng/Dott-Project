#/Users/kuoldeng/projectx/backend/pyfactor/inventory/models.py
import uuid
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.utils import timezone
from django.utils.text import slugify
import random
import string
from io import BytesIO
from barcode import Code128
from barcode.writer import ImageWriter
from .managers import OptimizedProductManager
from custom_auth.models import TenantAwareModel, TenantManager
from audit.mixins import AuditMixin

class InventoryItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, db_index=True)
    sku = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    quantity = models.IntegerField(default=0, db_index=True)
    reorder_level = models.IntegerField(default=10)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    category = models.ForeignKey('Category', on_delete=models.SET_NULL, null=True, related_name='items')
    supplier = models.ForeignKey('Supplier', on_delete=models.SET_NULL, null=True, related_name='items')
    location = models.ForeignKey('Location', on_delete=models.SET_NULL, null=True, related_name='items')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['name', 'sku']),
            models.Index(fields=['quantity', 'reorder_level']),
            models.Index(fields=['category', 'supplier']),
        ]

    def __str__(self):
        return f"{self.name} ({self.sku})"

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Supplier(AuditMixin, TenantAwareModel):
    """
    Supplier model for inventory suppliers.
    This model is tenant-aware and will be filtered by the current tenant.
    """
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    # Add tenant-aware manager
    objects = TenantManager()
    # Add all_objects manager to access all suppliers across tenants if needed
    all_objects = models.Manager()
    
    def __str__(self):
        return self.name
        
    class Meta:
        db_table = 'inventory_supplier'
        indexes = [
            models.Index(fields=['tenant_id', 'name']),
        ]

class Location(AuditMixin, TenantAwareModel):
    """
    Location model for inventory locations.
    This model is tenant-aware and will be filtered by the current tenant.
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    
    # Legacy single address field - kept for backwards compatibility
    address = models.TextField(blank=True, null=True)
    
    # Structured address fields
    street_address = models.CharField(max_length=255, blank=True, null=True)
    street_address_2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state_province = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=2, blank=True, null=True)  # ISO 2-letter code
    
    # Geolocation fields for map integration
    latitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=7, blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Add tenant-aware manager
    objects = TenantManager()
    # Add all_objects manager to access all locations across tenants if needed
    all_objects = models.Manager()

    def __str__(self):
        return self.name
    
    @property
    def full_address(self):
        """Return formatted full address"""
        parts = []
        if self.street_address:
            parts.append(self.street_address)
        if self.street_address_2:
            parts.append(self.street_address_2)
        if self.city:
            parts.append(self.city)
        if self.state_province:
            parts.append(self.state_province)
        if self.postal_code:
            parts.append(self.postal_code)
        if self.country:
            parts.append(self.country)
        return ', '.join(filter(None, parts))
    
    def save(self, *args, **kwargs):
        # Auto-populate the legacy address field from structured fields
        if not self.address and any([self.street_address, self.city, self.state_province]):
            self.address = self.full_address
        super().save(*args, **kwargs)
    
    class Meta:
        db_table = 'inventory_location'
        indexes = [
            models.Index(fields=['tenant_id', 'name']),
        ]

class InventoryTransaction(models.Model):
    TRANSACTION_TYPES = (
        ('IN', 'Stock In'),
        ('OUT', 'Stock Out'),
        ('ADJUST', 'Adjustment'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=6, choices=TRANSACTION_TYPES)
    quantity = models.IntegerField()
    date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.item.name} ({self.quantity})"

class CustomChargePlan(models.Model):
    name = models.CharField(max_length=100)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    UNIT_CHOICES = [
        ('kg', 'Kilogram'),
        ('unit', 'Per Unit'),
        ('hour', 'Per Hour'),
        ('day', 'Per Day'),
        ('week', 'Per Week'),
        ('month', 'Per Month'),
        ('custom', 'Custom'),
    ]
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES)
    custom_unit = models.CharField(max_length=50, blank=True, null=True)
    PERIOD_CHOICES = [
        ('hour', 'Hour'),
        ('day', 'Day'),
        ('week', 'Week'),
        ('month', 'Month'),
        ('custom', 'Custom'),
    ]
    period = models.CharField(max_length=10, choices=PERIOD_CHOICES)
    custom_period = models.CharField(max_length=50, blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        unit = self.custom_unit if self.unit == 'custom' else self.get_unit_display()
        period = self.custom_period if self.period == 'custom' else self.get_period_display()
        return f"{self.name}: {self.quantity} {unit} per {period} for {self.price}"

class Item(TenantAwareModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_for_sale = models.BooleanField(default=True)
    is_for_rent = models.BooleanField(default=False)
    salestax = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    height = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    width = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    height_unit = models.CharField(max_length=10, choices=[('cm', 'Centimeter'), ('m', 'Meter'), ('in', 'Inch')], default='cm')
    width_unit = models.CharField(max_length=10, choices=[('cm', 'Centimeter'), ('m', 'Meter'), ('in', 'Inch')], default='cm')
    weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    weight_unit = models.CharField(max_length=10, choices=[('kg', 'Kilogram'), ('lb', 'Pound'), ('g', 'Gram')], default='kg')
    charge_period = models.CharField(max_length=10, choices=[('hour', 'Hour'), ('day', 'Day'), ('month', 'Month'), ('year', 'Year')], default='day')
    charge_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    custom_charge_plans = models.ManyToManyField(CustomChargePlan, blank=True)

    class Meta:
        abstract = True

    def __str__(self):
        return self.name

    def clean(self):
        if self.price < 0:
            raise ValidationError('Price must be non-negative.')

    @property
    def days_in_stock(self):
        return (timezone.now() - self.created_at).days

    @classmethod
    def generate_unique_code(cls, name, field):
        import time
        import random
        import string
        from django.utils.text import slugify
        
        # Create a base from the name
        base = slugify(name)[:20]
        
        # Add timestamp for uniqueness
        timestamp = int(time.time())
        
        # Add random string
        random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        
        # Combine to create a unique code
        return f"{base}_{timestamp}_{random_str}"

class Product(AuditMixin, TenantAwareModel):
    """
    Product model for inventory items.
    This model is tenant-aware and will be filtered by the current tenant.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    sku = models.CharField(max_length=50, blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    quantity = models.IntegerField(default=0)
    supplier = models.ForeignKey('Supplier', on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    location = models.ForeignKey('Location', on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    # Add tenant-aware manager
    objects = TenantManager()
    # Add all_objects manager to access all products across tenants if needed
    all_objects = models.Manager()
    
    def save(self, *args, **kwargs):
        # Auto-generate SKU if not provided
        if not self.sku:
            # Get the current year
            from datetime import datetime
            year = datetime.now().year
            
            # Count existing products for this tenant to generate sequence
            count = Product.objects.filter(tenant_id=self.tenant_id).count() + 1
            
            # Generate SKU in format: PROD-YYYY-NNNN
            self.sku = f"PROD-{year}-{count:04d}"
            
            # Ensure uniqueness (in case of race conditions)
            original_sku = self.sku
            counter = 1
            while Product.objects.filter(tenant_id=self.tenant_id, sku=self.sku).exists():
                self.sku = f"{original_sku}-{counter}"
                counter += 1
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name
        
    class Meta:
        db_table = 'inventory_product'
        indexes = [
            models.Index(fields=['tenant_id', 'name']),
            models.Index(fields=['tenant_id', 'sku']),
        ]

class Service(Item):
    service_code = models.CharField(max_length=50, unique=True, editable=False, db_index=True)
    duration = models.DurationField(null=True, blank=True)
    is_recurring = models.BooleanField(default=False, db_index=True)
    
    # Use TenantManager for tenant isolation
    objects = TenantManager()
    
    # Add the optimized manager
    from .service_managers import OptimizedServiceManager
    optimized = OptimizedServiceManager()

    class Meta:
        db_table = 'inventory_service'
        indexes = [
            models.Index(fields=['tenant_id', 'name']),
            models.Index(fields=['tenant_id', 'service_code']),
            models.Index(fields=['is_recurring']),
            models.Index(fields=['is_for_sale', 'price']),
            models.Index(fields=['created_at']),
            # Add index for common filter combinations
            models.Index(fields=['is_for_sale', 'is_recurring']),
        ]
        app_label = 'inventory'

    def save(self, *args, **kwargs):
        import logging
        import time
        logger = logging.getLogger(__name__)
        
        start_time = time.time()
        
        # Log the current database connection and schema
        from django.db import connection
        
        # Get optimized connection for the current schema
        with connection.cursor() as cursor:
            cursor.execute('SHOW search_path')
            current_schema = cursor.fetchone()[0]
            logger.debug(f"Saving service in schema: {current_schema}, using connection: {connection.alias}")
        
        # Generate service code if needed
        if not self.service_code:
            self.service_code = self.generate_unique_code(self.name, 'service_code')
        
        try:
            # Use the current connection with optimized schema handling
            # Remove explicit 'default' connection to use the tenant's connection
            
            # Use a transaction for atomicity
            from django.db import transaction
            with transaction.atomic():
                super().save(*args, **kwargs)
                
            logger.debug(f"Successfully saved service {self.name} with ID {self.id} in {time.time() - start_time:.4f}s")
        except Exception as e:
            logger.error(f"Error saving service: {str(e)}", exc_info=True)
            raise
        
    @classmethod
    def generate_unique_code(cls, name, field):
        import time
        import random
        import string
        from django.utils.text import slugify
        
        # Create a base from the name
        base = slugify(name)[:20]
        
        # Add timestamp for uniqueness
        timestamp = int(time.time())
        
        # Add random string
        random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        
        # Combine to create a unique code
        return f"{base}_{timestamp}_{random_str}"
        
    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        instance._state.db = db
        return instance

class ProductTypeFields(models.Model):
    """Store dynamic fields for products based on business type"""
    product = models.OneToOneField('Product', on_delete=models.CASCADE, related_name='type_fields')
    
    # Common fields many businesses might use
    category = models.CharField(max_length=100, blank=True, null=True)
    subcategory = models.CharField(max_length=100, blank=True, null=True)
    
    # Fields for various business types
    # E-commerce fields
    material = models.CharField(max_length=100, blank=True, null=True)
    brand = models.CharField(max_length=100, blank=True, null=True)
    condition = models.CharField(max_length=50, blank=True, null=True)
    
    # Food/beverage fields
    ingredients = models.TextField(blank=True, null=True)
    allergens = models.TextField(blank=True, null=True)
    nutritional_info = models.TextField(blank=True, null=True)
    
    # Apparel fields
    size = models.CharField(max_length=20, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, null=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    
    # Trucking/vehicle fields
    vehicle_type = models.CharField(max_length=100, blank=True, null=True)
    load_capacity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Store additional fields that don't fit the predefined ones
    extra_fields = models.JSONField(default=dict, blank=True)
    
    class Meta:
        verbose_name = "Product Type Field"
        verbose_name_plural = "Product Type Fields"
        app_label = 'inventory'

class ServiceTypeFields(models.Model):
    """Store dynamic fields for services based on business type"""
    service = models.OneToOneField('Service', on_delete=models.CASCADE, related_name='type_fields')
    
    # Common fields
    category = models.CharField(max_length=100, blank=True, null=True)
    subcategory = models.CharField(max_length=100, blank=True, null=True)
    
    # Professional service fields
    skill_level = models.CharField(max_length=50, blank=True, null=True)
    certification = models.CharField(max_length=100, blank=True, null=True)
    experience_years = models.PositiveIntegerField(null=True, blank=True)
    
    # Appointment-based fields
    min_booking_notice = models.DurationField(null=True, blank=True)
    buffer_time = models.DurationField(null=True, blank=True)
    
    # Event/venue fields
    max_capacity = models.PositiveIntegerField(null=True, blank=True)
    amenities = models.TextField(blank=True, null=True)
    
    # Transportation fields
    service_area = models.CharField(max_length=100, blank=True, null=True)
    vehicle_requirements = models.TextField(blank=True, null=True)
    
    # Store additional fields
    extra_fields = models.JSONField(default=dict, blank=True)
    
    class Meta:
        verbose_name = "Service Type Field"
        verbose_name_plural = "Service Type Fields"
        app_label = 'inventory'

class Department(models.Model):
    dept_code = models.CharField(max_length=20)
    dept_name = models.CharField(max_length=20)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.dept_name
    
    class Meta:
        app_label = 'inventory'